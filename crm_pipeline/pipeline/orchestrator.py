"""
Main pipeline orchestrator.

Run order per country:
  1. Discover companies (Apollo → Europages fallback)
  2. Upsert companies into DB
  3. Detect CRM technographics per website (async, rate-limited)
  4. Scrape job board signals
  5. Persist all results
  6. Trigger scoring module

Usage:
    python main.py run --countries IT,PL,NL
    python main.py run --countries IT,PL,NL --industries "Logistics & Transport,Real Estate"
"""
from __future__ import annotations
import asyncio
import json
import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session
from tqdm.asyncio import tqdm

import config
from database.models import (
    Company, CrmDetection, JobSignal,
    create_all_tables, get_engine, get_session_factory,
)
from scrapers.company_finder import CompanyRecord, stream_companies
from scrapers.technographic_detector import detect_crm, DetectionResult
from scrapers.job_board_scraper import collect_job_signals, JobPosting
from analysis.scoring import compute_saturation_index
from utils.http_client import AsyncHTTPClient

logger = logging.getLogger(__name__)


class Pipeline:
    def __init__(self, countries: List[str], industries: Optional[List[str]] = None):
        self.countries = countries
        self.industries = industries or config.INDUSTRIES
        self._engine = get_engine()
        self._SessionFactory = get_session_factory(self._engine)
        create_all_tables(self._engine)

    # ------------------------------------------------------------------
    # Public entry-point
    # ------------------------------------------------------------------

    async def run(self) -> None:
        async with AsyncHTTPClient() as client:
            for country in self.countries:
                logger.info("=" * 60)
                logger.info("Starting country: %s", country)
                logger.info("=" * 60)
                await self._process_country(client, country)

        logger.info("All countries done. Computing saturation index…")
        with self._SessionFactory() as session:
            compute_saturation_index(session)
        logger.info("Pipeline complete.")

    # ------------------------------------------------------------------
    # Per-country workflow
    # ------------------------------------------------------------------

    async def _process_country(self, client: AsyncHTTPClient, country: str) -> None:
        # Step 1: Company discovery
        companies = await self._discover_companies(client, country)
        logger.info("%s: discovered %d companies", country, len(companies))

        # Step 2: Persist companies
        db_companies = self._upsert_companies(companies)
        logger.info("%s: %d companies in DB", country, len(db_companies))

        # Step 3: Technographic detection (async, concurrent)
        await self._detect_technographics(client, db_companies)

        # Step 4: Job signals
        job_postings = await collect_job_signals(client, country)
        self._persist_job_signals(job_postings)
        logger.info("%s: %d job signals persisted", country, len(job_postings))

    # ------------------------------------------------------------------
    # Step 1: Discovery
    # ------------------------------------------------------------------

    async def _discover_companies(
        self, client: AsyncHTTPClient, country: str
    ) -> List[CompanyRecord]:
        all_records: List[CompanyRecord] = []
        seen_websites: set[str] = set()
        per_industry_cap = config.TARGET_COMPANIES_PER_COUNTRY // len(self.industries)

        for industry in self.industries:
            count = 0
            try:
                async for rec in stream_companies(client, country, industry, per_industry_cap):
                    if rec.website not in seen_websites:
                        all_records.append(rec)
                        seen_websites.add(rec.website)
                        count += 1

            except Exception as exc:
                logger.error("Discovery error %s/%s: %s", country, industry, exc)

        return all_records

    # ------------------------------------------------------------------
    # Step 2: Upsert companies
    # ------------------------------------------------------------------

    def _upsert_companies(self, records: List[CompanyRecord]) -> List[Company]:
        db_companies: List[Company] = []
        with self._SessionFactory() as session:
            for rec in records:
                existing = session.query(Company).filter_by(website=rec.website).first()
                if existing:
                    db_companies.append(existing)
                    continue

                company = Company(
                    name=rec.name,
                    website=rec.website,
                    country_iso=rec.country_iso,
                    industry=rec.industry,
                    employee_min=rec.employee_min,
                    employee_max=rec.employee_max,
                    linkedin_url=rec.linkedin_url,
                    source=rec.source,
                )
                session.add(company)
                db_companies.append(company)

            session.commit()
            # Refresh to get IDs assigned by DB
            for c in db_companies:
                session.refresh(c)

        return db_companies

    # ------------------------------------------------------------------
    # Step 3: Async technographic detection
    # ------------------------------------------------------------------

    async def _detect_technographics(
        self, client: AsyncHTTPClient, companies: List[Company]
    ) -> None:
        # Only scan companies without a recent detection
        to_scan = [c for c in companies if not c.detections]
        if not to_scan:
            return

        logger.info("Scanning %d websites…", len(to_scan))

        async def _scan_one(company: Company) -> tuple[Company, DetectionResult]:
            result = await detect_crm(client, company.website)
            return company, result

        tasks = [_scan_one(c) for c in to_scan]

        results: List[tuple[Company, DetectionResult]] = []
        for coro in tqdm.as_completed(tasks, desc="CRM Detection", total=len(tasks)):
            pair = await coro
            results.append(pair)

        # Persist detections in batch
        with self._SessionFactory() as session:
            for company, result in results:
                if result.confidence < config.MIN_CONFIDENCE_TO_STORE and result.crm_name != "None":
                    continue  # skip very low-confidence ambiguous results

                detection = CrmDetection(
                    company_id=company.id,
                    crm_detected=result.crm_name,
                    crm_category=result.category,
                    confidence=result.confidence,
                    detection_method=result.method,
                    raw_signals=json.dumps(result.signals),
                    http_status=result.http_status,
                )
                session.add(detection)

            session.commit()

    # ------------------------------------------------------------------
    # Step 4: Job signals
    # ------------------------------------------------------------------

    def _persist_job_signals(self, postings: List[JobPosting]) -> None:
        with self._SessionFactory() as session:
            for posting in postings:
                signal = JobSignal(
                    country_iso=posting.country_iso,
                    industry=posting.industry,
                    job_title=posting.job_title,
                    crm_keywords=json.dumps(posting.crm_keywords),
                    source_url=posting.source_url,
                    board=posting.board,
                    posted_at=posting.posted_at,
                )
                session.add(signal)
            session.commit()
