import json, sys
sys.stdout.reconfigure(encoding="utf-8")
with open("pilot_results.json", encoding="utf-8") as f:
    data = json.load(f)
tiers = {}
for r in data["msi"]:
    tiers.setdefault(r["tier"], []).append(f"{r['country']}/{r['industry']}")
for t, segs in sorted(tiers.items()):
    print(f"Tier {t}  ({len(segs)} segments):")
    for s in segs:
        print(f"  → {s}")
print(f"\nTotal segments: {sum(len(v) for v in tiers.values())}")
