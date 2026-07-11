export const DOMAIN_LABELS: Record<string, string> = {
  crm:        "Retail / CRM",
  no_website: "No Website",
  health:     "Health & Wellness",
  b2b:        "B2B Services",
  tourism:    "Tourism & Travel",
};

export const DOMAIN_COLORS: Record<string, string> = {
  crm:        "bg-purple-500",
  no_website: "bg-gray-500",
  health:     "bg-green-500",
  b2b:        "bg-blue-500",
  tourism:    "bg-orange-500",
};

export const STATUS_COLORS: Record<string, string> = {
  NEW:            "bg-gray-100 text-gray-700",
  EMAILED:        "bg-blue-100 text-blue-700",
  REPLIED:        "bg-yellow-100 text-yellow-700",
  CONVERTED:      "bg-green-100 text-green-700",
  NOT_INTERESTED: "bg-red-100 text-red-700",
};

export const TABS = [
  { id: "all",    label: "All",             phase: "all", flag: "🌍", color: "blue"   },
  { id: "phase1", label: "Europe",          phase: "1",   flag: "🇪🇺", color: "indigo" },
  { id: "phase2", label: "Dubai",           phase: "2",   flag: "🇦🇪", color: "amber"  },
  { id: "phase3", label: "USA",             phase: "3",   flag: "🇺🇸", color: "red"    },
  { id: "phase4", label: "DACH / Benelux",  phase: "4",   flag: "🇩🇪", color: "green"  },
  { id: "phase5", label: "South & East EU", phase: "5",   flag: "🇮🇹", color: "purple" },
  { id: "phase6", label: "Education",       phase: "6",   flag: "🎓", color: "teal"   },
];

export const COUNTRY_REGION: Record<string, string> = {
  Denmark: "Nordic", Sweden: "Nordic", Norway: "Nordic", Finland: "Nordic", Iceland: "Nordic",
  Germany: "DACH", Austria: "DACH", Switzerland: "DACH", Liechtenstein: "DACH",
  Netherlands: "Western Europe", Belgium: "Western Europe", Luxembourg: "Western Europe",
  Ireland: "Western Europe", France: "Western Europe", "United Kingdom": "Western Europe",
  Spain: "Southern Europe", Italy: "Southern Europe", Portugal: "Southern Europe",
  Greece: "Southern Europe", Malta: "Southern Europe", Cyprus: "Southern Europe",
  Estonia: "Eastern Europe", Latvia: "Eastern Europe", Lithuania: "Eastern Europe",
  Poland: "Eastern Europe", "Czech Republic": "Eastern Europe", Slovakia: "Eastern Europe",
  Hungary: "Eastern Europe", Romania: "Eastern Europe", Bulgaria: "Eastern Europe",
  Croatia: "Eastern Europe", Slovenia: "Eastern Europe", Serbia: "Eastern Europe",
  UAE: "Middle East", "United Arab Emirates": "Middle East", Dubai: "Middle East",
  "Saudi Arabia": "Middle East", Qatar: "Middle East",
  USA: "North America", "United States": "North America", Canada: "North America",
};

export const REGION_FLAG: Record<string, string> = {
  "Nordic":         "🇸🇪",
  "DACH":           "🇩🇪",
  "Western Europe": "🇳🇱",
  "Southern Europe":"🇮🇹",
  "Eastern Europe": "🇵🇱",
  "Middle East":    "🇦🇪",
  "North America":  "🇺🇸",
  "Other":          "🌍",
};

export const COUNTRY_TZ: { country: string; tz: string; flag: string; phase: number }[] = [
  { country: "Romania",     tz: "Europe/Bucharest",   flag: "🇷🇴", phase: 1 },
  { country: "Germany",     tz: "Europe/Berlin",      flag: "🇩🇪", phase: 4 },
  { country: "Austria",     tz: "Europe/Vienna",      flag: "🇦🇹", phase: 4 },
  { country: "Switzerland", tz: "Europe/Zurich",      flag: "🇨🇭", phase: 4 },
  { country: "Belgium",     tz: "Europe/Brussels",    flag: "🇧🇪", phase: 4 },
  { country: "Netherlands", tz: "Europe/Amsterdam",   flag: "🇳🇱", phase: 4 },
  { country: "Sweden",      tz: "Europe/Stockholm",   flag: "🇸🇪", phase: 4 },
  { country: "Norway",      tz: "Europe/Oslo",        flag: "🇳🇴", phase: 4 },
  { country: "Denmark",     tz: "Europe/Copenhagen",  flag: "🇩🇰", phase: 4 },
  { country: "Italy",       tz: "Europe/Rome",        flag: "🇮🇹", phase: 5 },
  { country: "Spain",       tz: "Europe/Madrid",      flag: "🇪🇸", phase: 5 },
  { country: "Portugal",    tz: "Europe/Lisbon",      flag: "🇵🇹", phase: 5 },
  { country: "Ireland",     tz: "Europe/Dublin",      flag: "🇮🇪", phase: 1 },
  { country: "Iceland",     tz: "Atlantic/Reykjavik", flag: "🇮🇸", phase: 1 },
  { country: "Estonia",     tz: "Europe/Tallinn",     flag: "🇪🇪", phase: 1 },
  { country: "Luxembourg",  tz: "Europe/Luxembourg",  flag: "🇱🇺", phase: 1 },
  { country: "UAE",         tz: "Asia/Dubai",         flag: "🇦🇪", phase: 2 },
  { country: "USA",         tz: "America/New_York",   flag: "🇺🇸", phase: 3 },
];
