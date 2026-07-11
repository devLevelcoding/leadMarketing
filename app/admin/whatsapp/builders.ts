import type { Lead } from "./types";

export function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

export function buildWaMessage(lead: Lead): string {
  const location = lead.city ? `in ${lead.city}` : lead.country ? `in ${lead.country}` : "";
  const category = lead.category ? lead.category.toLowerCase() : "your business";

  return `Dear ${lead.name} Team,

My name is Marian Pirvan from LevelCoding, a European web development company based in Romania. We help local businesses ${location} establish a strong online presence and attract new clients through a professional website and Google visibility.

I noticed that ${lead.name} ${location} doesn't currently have a website. In today's market, over 80% of purchasing decisions start with an online search — and a business that can't be found online is missing a very large share of potential clients who are already looking for ${category} services.

We build fast, professional websites for local businesses — clean design, fully mobile-optimised, and structured to rank on Google from day one. Most of our clients start receiving new enquiries within 30 days of going live.

As a European partner, we offer high-quality solutions at a cost structure that is far more competitive than local agencies, with full support throughout and beyond the launch.

Would you be open to a brief 10-minute call to discuss how we could help ${lead.name} grow online?

You can book a time directly here: https://consulting.levelcoding.com/book/3

Best regards,
Marian Pirvan
LevelCoding
Phone: +40 746 628 424`;
}
