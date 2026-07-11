export const COUNTRY_CODE: Record<string, string> = {
  "Albania": "AL", "Andorra": "AD", "Austria": "AT", "Belarus": "BY", "Belgium": "BE",
  "Bosnia and Herzegovina": "BA", "Bulgaria": "BG", "Croatia": "HR", "Cyprus": "CY",
  "Czech Republic": "CZ", "Denmark": "DK", "Estonia": "EE", "Finland": "FI", "France": "FR",
  "Germany": "DE", "Greece": "GR", "Hungary": "HU", "Iceland": "IS", "Ireland": "IE",
  "Italy": "IT", "Kosovo": "XK", "Latvia": "LV", "Liechtenstein": "LI", "Lithuania": "LT",
  "Luxembourg": "LU", "Malta": "MT", "Moldova": "MD", "Monaco": "MC", "Montenegro": "ME",
  "Netherlands": "NL", "North Macedonia": "MK", "Norway": "NO", "Poland": "PL",
  "Portugal": "PT", "Romania": "RO", "San Marino": "SM", "Serbia": "RS", "Slovakia": "SK",
  "Slovenia": "SI", "Spain": "ES", "Sweden": "SE", "Switzerland": "CH", "Ukraine": "UA",
  "United Kingdom": "GB", "Vatican City": "VA",
  "UAE": "AE", "United Arab Emirates": "AE", "Dubai": "AE",
  "United States": "US", "USA": "US",
};

export function countryFlag(country: string | null): string {
  if (!country) return "";
  const code = COUNTRY_CODE[country];
  if (!code) return "";
  return Array.from(code.toUpperCase()).map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const DOMAIN_LABEL: Record<string, string> = {
  crm: "Retail/CRM", no_website: "No Website", health: "Health", b2b: "B2B", tourism: "Tourism",
};

export const DOMAIN_COLOR: Record<string, string> = {
  crm: "bg-blue-100 text-blue-700", no_website: "bg-purple-100 text-purple-700",
  health: "bg-green-100 text-green-700", b2b: "bg-orange-100 text-orange-700",
  tourism: "bg-cyan-100 text-cyan-700",
};
