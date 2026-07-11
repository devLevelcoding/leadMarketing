export const PHASE_TABS = [
  { phase: 0, label: "All",             flag: "🌍", color: "blue"   },
  { phase: 1, label: "Europe",          flag: "🇪🇺", color: "indigo" },
  { phase: 2, label: "Dubai",           flag: "🇦🇪", color: "amber"  },
  { phase: 3, label: "USA",             flag: "🇺🇸", color: "red"    },
  { phase: 4, label: "DACH / Benelux",  flag: "🇩🇪", color: "green"  },
  { phase: 5, label: "South & East EU", flag: "🇮🇹", color: "purple" },
  { phase: 6, label: "Education",       flag: "🎓", color: "teal"   },
  { phase: 7, label: "CRM Pipeline",   flag: "🔬", color: "violet" },
];

export const WARMUP_SCHEDULE = [
  { range: "Days 1–3",   quota: 15,  perDomain: 3  },
  { range: "Days 4–7",   quota: 20,  perDomain: 4  },
  { range: "Days 8–14",  quota: 25,  perDomain: 5  },
  { range: "Days 15–21", quota: 35,  perDomain: 7  },
  { range: "Days 22–30", quota: 50,  perDomain: 10 },
  { range: "Days 31–65", quota: 75,  perDomain: 15 },
  { range: "Days 66+",   quota: 100, perDomain: 20 },
];
