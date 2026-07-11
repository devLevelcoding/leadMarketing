import sys
sys.stdout.reconfigure(encoding="utf-8")
from collections import defaultdict
from database.models import get_engine, get_session_factory, Lead

engine = get_engine()
Session = get_session_factory(engine)

with Session() as s:
    leads = s.query(Lead).all()
    total    = len(leads)
    with_li  = sum(1 for l in leads if l.linkedin_url)
    with_web = sum(1 for l in leads if l.website)
    by_seg   = defaultdict(int)
    for l in leads:
        by_seg[(l.country_iso, l.industry)] += 1

print(f"Total leads in DB  : {total}")
print(f"With LinkedIn URL  : {with_li}  ({with_li/max(total,1)*100:.0f}%)")
print(f"With website       : {with_web}  ({with_web/max(total,1)*100:.0f}%)")
print()
print(f"{'Country':<4}  {'Industry':<30}  {'Leads':>6}")
print("-" * 46)
for (c, i), n in sorted(by_seg.items()):
    print(f"{c:<4}  {i:<30}  {n:>6}")
