"""
SQLAlchemy ORM models.
Run  `alembic upgrade head`  after any schema change.
"""
from __future__ import annotations
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, create_engine, Index,
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
import config


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Core entity
# ---------------------------------------------------------------------------

class Company(Base):
    """One row per discovered mid-market company."""
    __tablename__ = "companies"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(255), nullable=False)
    website       = Column(String(512), unique=True, index=True)
    country_iso   = Column(String(2), nullable=False, index=True)
    industry      = Column(String(120), index=True)
    employee_min  = Column(Integer)
    employee_max  = Column(Integer)
    linkedin_url  = Column(String(512))
    source        = Column(String(80))   # apollo / google / directory
    created_at    = Column(DateTime, default=datetime.utcnow)

    detections    = relationship("CrmDetection", back_populates="company", cascade="all, delete-orphan")
    job_signals   = relationship("JobSignal",    back_populates="company", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_companies_country_industry", "country_iso", "industry"),
    )


class CrmDetection(Base):
    """
    One row per detection attempt on a company website.
    Multiple attempts are kept so confidence can be averaged over time.
    """
    __tablename__ = "crm_detections"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    company_id     = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    crm_detected   = Column(String(80))    # "HubSpot", "Salesforce", "None", etc.
    crm_category   = Column(String(40))    # "Modern", "Legacy", "Local", "None"
    confidence     = Column(Float)         # 0.0 – 1.0
    detection_method = Column(String(40))  # "fingerprint", "wappalyzer", "builtwith"
    raw_signals    = Column(Text)          # JSON list of matched patterns
    scanned_at     = Column(DateTime, default=datetime.utcnow)
    http_status    = Column(Integer)

    company = relationship("Company", back_populates="detections")

    __table_args__ = (
        Index("ix_crm_detections_crm_category", "crm_category"),
    )


class JobSignal(Base):
    """Job postings mentioning CRM keywords — secondary validation layer."""
    __tablename__ = "job_signals"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    company_id    = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    country_iso   = Column(String(2), nullable=False, index=True)
    industry      = Column(String(120))
    job_title     = Column(String(255))
    crm_keywords  = Column(Text)   # JSON list: ["Salesforce", "CRM Administrator"]
    source_url    = Column(String(512))
    board         = Column(String(40))  # "linkedin", "indeed", "local"
    posted_at     = Column(DateTime)
    scraped_at    = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="job_signals")

    __table_args__ = (
        Index("ix_job_signals_country_industry", "country_iso", "industry"),
    )


# ---------------------------------------------------------------------------
# Aggregated output table (materialised by the scoring module)
# ---------------------------------------------------------------------------

class MarketSaturationIndex(Base):
    """
    Pre-aggregated view written by analysis/scoring.py.
    One row per (country, industry) pair.
    """
    __tablename__ = "market_saturation_index"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    country_iso          = Column(String(2),  nullable=False)
    industry             = Column(String(120), nullable=False)
    total_sampled        = Column(Integer)
    pct_modern_crm       = Column(Float)   # HubSpot / Salesforce / Pipedrive etc.
    pct_legacy_crm       = Column(Float)   # SAP, Oracle, old Dynamics, Bitrix24
    pct_local_crm        = Column(Float)   # SuperOffice, Lime, region-specific
    pct_no_crm           = Column(Float)   # no footprint found
    pct_unknown          = Column(Float)   # scan failed / JS-heavy
    job_signal_count     = Column(Integer) # secondary validation
    saturation_score     = Column(Float)   # 0 (white space) → 100 (fully saturated)
    opportunity_tier     = Column(String(1))  # A / B / C
    computed_at          = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("country_iso", "industry", name="uq_msi_country_industry"),
    )


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_engine(url: str = config.DATABASE_URL):
    kwargs: dict = {"echo": False, "future": True}
    if url.startswith("sqlite"):
        # WAL mode + 30s lock timeout — safe for concurrent processes
        kwargs["connect_args"] = {"timeout": 30, "check_same_thread": False}
    return create_engine(url, **kwargs)

def get_session_factory(engine=None):
    engine = engine or get_engine()
    return sessionmaker(bind=engine, expire_on_commit=False)

class Lead(Base):
    """
    Qualified sales lead — one row per discovered company in a Tier A segment.
    Enriched with LinkedIn URL via DuckDuckGo search.
    """
    __tablename__ = "leads"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    name           = Column(String(255), nullable=False)
    country_iso    = Column(String(2),  nullable=False, index=True)
    industry       = Column(String(120), index=True)
    website        = Column(String(512))
    phone          = Column(String(60))
    address        = Column(String(512))
    city           = Column(String(120))
    linkedin_url   = Column(String(512))
    google_maps_url= Column(String(512))
    source         = Column(String(40))   # google_maps | overpass | europages
    tier           = Column(String(1), default="A")
    linkedin_found = Column(Boolean, default=False)
    created_at     = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("name", "country_iso", "industry", name="uq_lead"),
        Index("ix_leads_country_industry", "country_iso", "industry"),
    )


def create_all_tables(engine=None):
    engine = engine or get_engine()
    Base.metadata.create_all(engine)
