"""
Market Saturation Index (MSI) computation.

Formula
-------
MSI = 100 × (modern_weight × pct_modern + legacy_weight × pct_legacy +
              local_weight × pct_local)

Weights reflect "how saturated is this market to a new CRM vendor":
  - Modern CRM present → very saturated (weight 1.0)
  - Legacy/Local CRM   → partially saturated, high switching opportunity (weight 0.5)
  - No CRM detected    → whitespace — strongest opportunity (contributes 0 to saturation)
  - Unknown            → neutral, not counted

Opportunity tiers:
  A  MSI < 25   — strong whitespace, high entry opportunity
  B  25–55      — mixed, significant opportunity in "Legacy" segments
  C  > 55       — mature/saturated, uphill battle unless niche differentiation

Job signal bonus: each CRM-whitespace job posting found reduces MSI by 1 point
(up to -10), because it signals companies actively looking for a solution.

Output: writes rows to market_saturation_index table + exports a Pandas DataFrame.
"""
from __future__ import annotations
import json
import logging
from datetime import datetime
from typing import Dict, List, Tuple

import pandas as pd
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database.models import (
    Company, CrmDetection, JobSignal, MarketSaturationIndex,
)

logger = logging.getLogger(__name__)

# Saturation weight per CRM category
CATEGORY_WEIGHTS: Dict[str, float] = {
    "Modern":  1.0,
    "Legacy":  0.5,
    "Local":   0.5,
    "None":    0.0,
    "Unknown": 0.0,
}

TIER_A_THRESHOLD = 25.0
TIER_B_THRESHOLD = 55.0
JOB_SIGNAL_DISCOUNT = 1.0   # MSI reduction per whitespace job posting
MAX_JOB_DISCOUNT = 10.0     # cap


def compute_saturation_index(session: Session) -> pd.DataFrame:
    """
    Reads raw detections from DB, computes MSI per (country, industry),
    writes results back to market_saturation_index table, and returns
    a pandas DataFrame sorted by opportunity (lowest MSI first).
    """
    rows: List[Dict] = _aggregate_detections(session)
    job_counts = _count_whitespace_jobs(session)

    records = []
    for row in rows:
        country = row["country_iso"]
        industry = row["industry"]

        total = row["total"]
        if total == 0:
            continue

        pct_modern  = row["modern"]  / total
        pct_legacy  = row["legacy"]  / total
        pct_local   = row["local"]   / total
        pct_no_crm  = row["none"]    / total
        pct_unknown = row["unknown"] / total

        # Raw saturation score (0–100)
        msi = 100 * (
            CATEGORY_WEIGHTS["Modern"] * pct_modern
            + CATEGORY_WEIGHTS["Legacy"] * pct_legacy
            + CATEGORY_WEIGHTS["Local"]  * pct_local
        )

        # Job signal discount
        n_jobs = job_counts.get((country, industry), 0)
        discount = min(n_jobs * JOB_SIGNAL_DISCOUNT, MAX_JOB_DISCOUNT)
        msi = max(0.0, msi - discount)

        tier = _tier(msi)

        records.append({
            "country_iso":      country,
            "industry":         industry,
            "total_sampled":    total,
            "pct_modern_crm":   round(pct_modern * 100, 1),
            "pct_legacy_crm":   round(pct_legacy * 100, 1),
            "pct_local_crm":    round(pct_local  * 100, 1),
            "pct_no_crm":       round(pct_no_crm  * 100, 1),
            "pct_unknown":      round(pct_unknown * 100, 1),
            "job_signal_count": n_jobs,
            "saturation_score": round(msi, 1),
            "opportunity_tier": tier,
            "computed_at":      datetime.utcnow(),
        })

    # Write to DB (upsert pattern)
    for rec in records:
        existing = (
            session.query(MarketSaturationIndex)
            .filter_by(country_iso=rec["country_iso"], industry=rec["industry"])
            .first()
        )
        if existing:
            for k, v in rec.items():
                setattr(existing, k, v)
        else:
            session.add(MarketSaturationIndex(**rec))

    session.commit()
    logger.info("Wrote %d MSI rows to DB", len(records))

    df = pd.DataFrame(records).sort_values(
        ["saturation_score", "pct_no_crm"], ascending=[True, False]
    )
    return df


def top_opportunities(session: Session, top_n: int = 20) -> pd.DataFrame:
    """Quick read of pre-computed MSI, ranked by opportunity."""
    rows = session.query(MarketSaturationIndex).all()
    if not rows:
        logger.warning("No MSI data found. Run compute_saturation_index first.")
        return pd.DataFrame()

    data = [
        {
            "country": r.country_iso,
            "industry": r.industry,
            "total_sampled": r.total_sampled,
            "pct_no_crm": r.pct_no_crm,
            "pct_legacy": r.pct_legacy_crm,
            "pct_local": r.pct_local_crm,
            "pct_modern": r.pct_modern_crm,
            "job_signals": r.job_signal_count,
            "msi_score": r.saturation_score,
            "tier": r.opportunity_tier,
        }
        for r in rows
    ]
    df = (
        pd.DataFrame(data)
        .sort_values("msi_score", ascending=True)
        .head(top_n)
    )
    return df


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _aggregate_detections(session: Session) -> List[Dict]:
    """
    Return per-(country, industry) counts broken out by CRM category.
    Uses a single SQL query via SQLAlchemy core for efficiency.
    """
    sql = text("""
        SELECT
            c.country_iso,
            c.industry,
            COUNT(d.id)                                          AS total,
            SUM(CASE WHEN d.crm_category = 'Modern'  THEN 1 ELSE 0 END) AS modern,
            SUM(CASE WHEN d.crm_category = 'Legacy'  THEN 1 ELSE 0 END) AS legacy,
            SUM(CASE WHEN d.crm_category = 'Local'   THEN 1 ELSE 0 END) AS local,
            SUM(CASE WHEN d.crm_category = 'None'    THEN 1 ELSE 0 END) AS none,
            SUM(CASE WHEN d.crm_category = 'Unknown' THEN 1 ELSE 0 END) AS unknown
        FROM companies c
        JOIN crm_detections d ON d.company_id = c.id
        GROUP BY c.country_iso, c.industry
        ORDER BY c.country_iso, c.industry
    """)
    result = session.execute(sql)
    return [dict(row._mapping) for row in result]


def _count_whitespace_jobs(session: Session) -> Dict[Tuple[str, str], int]:
    """Count job postings that signal companies looking for a CRM (whitespace)."""
    WHITESPACE_TERMS = [
        "crm implementation", "crm migration", "new crm", "crm project",
        "crm rollout", "crm selection", "no crm",
    ]
    signals = session.query(JobSignal).all()
    counts: Dict[Tuple[str, str], int] = {}

    for sig in signals:
        keywords = json.loads(sig.crm_keywords or "[]")
        is_whitespace = any(
            any(wt in kw for wt in WHITESPACE_TERMS) for kw in keywords
        )
        if is_whitespace:
            key = (sig.country_iso, sig.industry or "Unknown")
            counts[key] = counts.get(key, 0) + 1

    return counts


def _tier(msi: float) -> str:
    if msi < TIER_A_THRESHOLD:
        return "A"
    if msi < TIER_B_THRESHOLD:
        return "B"
    return "C"


# ---------------------------------------------------------------------------
# Pandas-only standalone analysis (no DB needed — feed a CSV)
# ---------------------------------------------------------------------------

def analyse_from_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    If you exported raw detections to a CSV, call this directly.

    Expected columns: country_iso, industry, crm_category
    """
    grouped = (
        df.groupby(["country_iso", "industry", "crm_category"])
        .size()
        .unstack(fill_value=0)
        .reset_index()
    )
    for cat in ("Modern", "Legacy", "Local", "None", "Unknown"):
        if cat not in grouped.columns:
            grouped[cat] = 0

    grouped["total"] = grouped[["Modern", "Legacy", "Local", "None", "Unknown"]].sum(axis=1)
    grouped["pct_no_crm"] = (grouped["None"] / grouped["total"] * 100).round(1)
    grouped["msi_score"] = (
        100 * (
            CATEGORY_WEIGHTS["Modern"] * grouped["Modern"] / grouped["total"]
            + CATEGORY_WEIGHTS["Legacy"] * grouped["Legacy"] / grouped["total"]
            + CATEGORY_WEIGHTS["Local"]  * grouped["Local"]  / grouped["total"]
        )
    ).round(1)
    grouped["tier"] = grouped["msi_score"].apply(_tier)

    return grouped.sort_values("msi_score", ascending=True)
