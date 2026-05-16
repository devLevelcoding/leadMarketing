"""
60-day Instagram plan data — sourced from planInstagram.md
Each day knows its topic, content type, hook, and slide structure.
The CLI fills in the user's voice/text as the raw idea.
"""

# Content types: carousel | static | reel | story
# Phases: foundation | sell

PLAN = [
    # ── WEEK 1: Introduction ─────────────────────────────────────────────────
    {"day": 1,  "week": 1, "phase": "foundation", "type": "static",
     "topic": "Company Introduction",
     "direction": "Who we are, what we build, who we serve. First impression.",
     "hook": "Finally here 👋 Meet the IT company that actually explains what it does.",
     "cta": "Follow us for real talk about tech 👇"},

    {"day": 2,  "week": 1, "phase": "foundation", "type": "static",
     "topic": "Founder Story",
     "direction": "Why you started, years of experience, personal story. Make it human.",
     "hook": "I started this company because I was tired of seeing businesses struggle with bad tech.",
     "cta": "Drop a ❤️ if you've been there too"},

    {"day": 3,  "week": 1, "phase": "foundation", "type": "carousel",
     "topic": "3 Problems We Solve",
     "direction": "The 3 most common problems clients come to you with. Speak to pain.",
     "hook": "These 3 problems are killing your business online (and you don't know it)",
     "cta": "Which one is hurting you most? Comment below 👇"},

    {"day": 4,  "week": 1, "phase": "foundation", "type": "carousel",
     "topic": "Our Tech Stack",
     "direction": "What tools and languages you use and why. Shows expertise.",
     "hook": "Here's every tool we use to build fast, reliable digital systems",
     "cta": "What's your go-to stack? Tell us 👇"},

    {"day": 5,  "week": 1, "phase": "foundation", "type": "reel",
     "topic": "Day in Our Work Life",
     "direction": "BTS of your desk, screen, process. 30-60 seconds. Makes you real.",
     "hook": "A day in the life of an IT company — no filter",
     "cta": "Follow for more BTS content"},

    {"day": 6,  "week": 1, "phase": "foundation", "type": "carousel",
     "topic": "What People Get Wrong About IT Companies",
     "direction": "Controversial takes about hiring IT companies. Builds authority.",
     "hook": "What most people get wrong about hiring an IT company (from someone who builds them)",
     "cta": "Save this before you hire anyone 💾"},

    {"day": 7,  "week": 1, "phase": "foundation", "type": "story",
     "topic": "Poll / Question Box",
     "direction": "Stories only. Ask your audience something — poll, question box, emoji reaction.",
     "hook": "Quick question for you 👇",
     "cta": "Reply to this story"},

    # ── WEEK 2: Expertise Signals ────────────────────────────────────────────
    {"day": 8,  "week": 2, "phase": "foundation", "type": "carousel",
     "topic": "5 Signs Your Website Is Killing Your Business",
     "direction": "Practical list. Each sign = one slide. Clients recognize themselves.",
     "hook": "5 signs your website is quietly killing your business 💀",
     "cta": "Save this and check your site today"},

    {"day": 9,  "week": 2, "phase": "foundation", "type": "reel",
     "topic": "Behind the Scenes — Building Something",
     "direction": "Screen record + voiceover of you building or fixing something. No client name needed.",
     "hook": "Watch us fix a broken website in real time",
     "cta": "Follow for more tech breakdowns"},

    {"day": 10, "week": 2, "phase": "foundation", "type": "static",
     "topic": "Industry Stat + Your Take",
     "direction": "One strong stat about digital business. Add your opinion. Shows authority.",
     "hook": "73% of SMBs have no web analytics. Here's why that's a disaster.",
     "cta": "Do you track your website data? Comment Yes/No"},

    {"day": 11, "week": 2, "phase": "foundation", "type": "static",
     "topic": "Tool of the Week",
     "direction": "One tool your team uses daily. What it does, why you chose it.",
     "hook": "The tool we use every day that saves us 3 hours a week",
     "cta": "Drop 🔥 if you already use this"},

    {"day": 12, "week": 2, "phase": "foundation", "type": "carousel",
     "topic": "Most Common Website Mistake",
     "direction": "The #1 mistake businesses make online. Give real examples.",
     "hook": "The most expensive website mistake we see every single week",
     "cta": "Tag a business owner who needs to see this"},

    {"day": 13, "week": 2, "phase": "foundation", "type": "static",
     "topic": "Team / Work Setup Introduction",
     "direction": "Photo of your setup, team, or workspace. Personal and grounding.",
     "hook": "This is where the magic happens 💻",
     "cta": "Show us your setup in the comments"},

    {"day": 14, "week": 2, "phase": "foundation", "type": "story",
     "topic": "Meme + Dev Poll",
     "direction": "Share a relatable dev meme. Add a poll: tabs vs spaces, dark vs light mode.",
     "hook": "The eternal debate 👇",
     "cta": "Vote now"},

    # ── WEEK 3: Education ────────────────────────────────────────────────────
    {"day": 15, "week": 3, "phase": "foundation", "type": "carousel",
     "topic": "How-To Tutorial",
     "direction": "Step-by-step tutorial a business owner can actually follow. Keep it simple.",
     "hook": "How to check if your website loads in under 3 seconds (takes 2 minutes)",
     "cta": "Save this 💾 — takes 2 min to check"},

    {"day": 16, "week": 3, "phase": "foundation", "type": "carousel",
     "topic": "Concept Explained Simply",
     "direction": "Pick one tech concept (SEO, API, CRM, automation). Explain it for non-technical people.",
     "hook": "What is [concept] — explained so a 10-year-old gets it",
     "cta": "What concept should we explain next? Comment 👇"},

    {"day": 17, "week": 3, "phase": "foundation", "type": "carousel",
     "topic": "Before / After",
     "direction": "Show a transformation — website, system, process. Mockup is fine if no real case.",
     "hook": "Before vs After: what we actually do when a client hires us",
     "cta": "Which result matters most to you?"},

    {"day": 18, "week": 3, "phase": "foundation", "type": "static",
     "topic": "3 Things Before You Hire a Developer",
     "direction": "Protect your audience from bad hires. Position you as trustworthy.",
     "hook": "3 things to know before you hire any developer (so you don't get burned)",
     "cta": "Save this before your next hire 💾"},

    {"day": 19, "week": 3, "phase": "foundation", "type": "reel",
     "topic": "Morning Routine or Coding Process",
     "direction": "Quick personal reel. Morning coffee + laptop, or fast-forward coding session.",
     "hook": "Morning routine of a programmer who runs a company ☕",
     "cta": "Follow for more real content"},

    {"day": 20, "week": 3, "phase": "foundation", "type": "carousel",
     "topic": "Why Automation in 2025",
     "direction": "Make the case for automation for non-technical business owners.",
     "hook": "Why every business needs at least one automated system in 2025",
     "cta": "What would you automate first? Tell us 👇"},

    {"day": 21, "week": 3, "phase": "foundation", "type": "story",
     "topic": "Q&A — Tech Questions",
     "direction": "Open a question box. Let them ask you anything about tech for their business.",
     "hook": "Ask me anything about tech for your business 👇",
     "cta": "I answer every question"},

    # ── WEEK 4: Social Proof ─────────────────────────────────────────────────
    {"day": 22, "week": 4, "phase": "foundation", "type": "carousel",
     "topic": "Case Study #1",
     "direction": "Problem → What you built → Result. Anonymize client if needed.",
     "hook": "How we helped a business go from 0 leads online to 40+ a month",
     "cta": "DM us if you have the same problem"},

    {"day": 23, "week": 4, "phase": "foundation", "type": "static",
     "topic": "Numbers / Credibility Post",
     "direction": "Years, projects, clients, countries, lines of code. Make it visual.",
     "hook": "The numbers behind our work",
     "cta": "Which number surprised you?"},

    {"day": 24, "week": 4, "phase": "foundation", "type": "static",
     "topic": "Testimonial",
     "direction": "Screenshot or designed quote from a real client (LinkedIn, email, WhatsApp). Even informal.",
     "hook": "This message made our week 🙌",
     "cta": "Could this be your result? DM us"},

    {"day": 25, "week": 4, "phase": "foundation", "type": "carousel",
     "topic": "How We Work — Our Process",
     "direction": "5-step process from first contact to delivery. Removes fear of reaching out.",
     "hook": "Here's exactly what happens when you hire us (step by step)",
     "cta": "Which step are you at? Comment 👇"},

    {"day": 26, "week": 4, "phase": "foundation", "type": "carousel",
     "topic": "FAQ",
     "direction": "5 questions clients always ask before hiring you. Answer them honestly.",
     "hook": "The 5 questions every client asks us before signing (answered honestly)",
     "cta": "Have a question? Ask it 👇"},

    {"day": 27, "week": 4, "phase": "foundation", "type": "static",
     "topic": "Hot Take",
     "direction": "Controversial but true opinion in your space. Gets comments.",
     "hook": "Unpopular opinion: you don't need a mobile app. You need this instead.",
     "cta": "Agree or disagree? Tell us 👇"},

    {"day": 28, "week": 4, "phase": "foundation", "type": "story",
     "topic": "Reshare Case Study",
     "direction": "Share day 22 case study to stories. Add a poll or slider.",
     "hook": "Did you see this? 👇",
     "cta": "Swipe up / DM for same result"},

    {"day": 29, "week": 4, "phase": "foundation", "type": "carousel",
     "topic": "Portfolio Piece",
     "direction": "One project. Screenshots + the story behind it. What was the problem, what did you build.",
     "hook": "Here's one of our favourite projects — the story behind it",
     "cta": "Full case study in our bio link"},

    {"day": 30, "week": 4, "phase": "foundation", "type": "static",
     "topic": "30-Day Milestone",
     "direction": "Reflection. What you posted, what you learned, thanks to followers.",
     "hook": "30 days on Instagram — here's what we learned",
     "cta": "Follow us for the next 30 days 🚀"},

    # ── WEEK 5: Services Introduction ────────────────────────────────────────
    {"day": 31, "week": 5, "phase": "sell", "type": "carousel",
     "topic": "Services Overview",
     "direction": "Everything you offer, clearly. No jargon. Who each service is for.",
     "hook": "Here's everything we can do for your business (no tech jargon)",
     "cta": "Which service do you need most? Comment 👇"},

    {"day": 32, "week": 5, "phase": "sell", "type": "carousel",
     "topic": "Service Deep-Dive #1 — Web Development",
     "direction": "What's actually included, what it costs roughly, who it's for, what happens after.",
     "hook": "What you actually get when you hire us for web development",
     "cta": "Book a free call — link in bio"},

    {"day": 33, "week": 5, "phase": "sell", "type": "carousel",
     "topic": "Pricing Demystified",
     "direction": "Don't hide pricing. Explain ranges, what affects cost, what you get at each level.",
     "hook": "How much does a professional website cost? The honest answer.",
     "cta": "Get a custom quote — DM us"},

    {"day": 34, "week": 5, "phase": "sell", "type": "carousel",
     "topic": "Service Deep-Dive #2 — Automation / CRM",
     "direction": "Second service. Same format: what's included, who it's for, result.",
     "hook": "What business automation actually means — and what it does for your revenue",
     "cta": "Want this for your business? DM us"},

    {"day": 35, "week": 5, "phase": "sell", "type": "static",
     "topic": "ROI Post",
     "direction": "Frame cost as investment. Show what bad tech costs vs. what good tech earns.",
     "hook": "A slow website isn't free. Here's what it's actually costing you.",
     "cta": "How much is yours costing you? DM us to find out"},

    {"day": 36, "week": 5, "phase": "sell", "type": "static",
     "topic": "Ideal Client Post",
     "direction": "Describe your perfect client so clearly they recognize themselves.",
     "hook": "This is exactly who we work best with (is this you?)",
     "cta": "If this sounds like you — DM us today"},

    {"day": 37, "week": 5, "phase": "sell", "type": "story",
     "topic": "Free Audit CTA",
     "direction": "Offer a free website or digital audit. DM or link in bio.",
     "hook": "We're offering 5 free audits this week 👇",
     "cta": "DM the word AUDIT to get yours"},

    # ── WEEK 6: Objections & Authority ──────────────────────────────────────
    {"day": 38, "week": 6, "phase": "sell", "type": "carousel",
     "topic": "Objection: We Already Have a Website",
     "direction": "Address this honestly. Having a website ≠ having a good one.",
     "hook": "'We already have a website' — 5 questions to ask yourself",
     "cta": "How does yours score? DM us for a free check"},

    {"day": 39, "week": 6, "phase": "sell", "type": "carousel",
     "topic": "Objection: We Can't Afford It",
     "direction": "Reframe. Bad tech has a cost. Good tech has an ROI.",
     "hook": "'We can't afford it' — let's talk about what bad tech actually costs",
     "cta": "There's always a solution — DM us"},

    {"day": 40, "week": 6, "phase": "sell", "type": "static",
     "topic": "Objection: We'll Do It In-House",
     "direction": "When it works, when it doesn't. Be honest — not defensive.",
     "hook": "In-house dev vs. agency: when each one wins",
     "cta": "Which is right for you? Let's talk"},

    {"day": 41, "week": 6, "phase": "sell", "type": "carousel",
     "topic": "Trend Post — AI & Automation",
     "direction": "What's actually changing in your space. Your opinion on it.",
     "hook": "How AI is changing IT for small businesses (and what to do about it)",
     "cta": "Thoughts? Drop them below 👇"},

    {"day": 42, "week": 6, "phase": "sell", "type": "carousel",
     "topic": "Myths About IT Companies Debunked",
     "direction": "3-5 myths. Bust each one with the truth.",
     "hook": "5 myths about IT companies that are costing businesses money",
     "cta": "Which myth did you believe? Be honest 👇"},

    {"day": 43, "week": 6, "phase": "sell", "type": "carousel",
     "topic": "Case Study #2",
     "direction": "Different industry than case study #1. Same format.",
     "hook": "How we built a system that saved a client 12 hours a week",
     "cta": "Want the same? DM us"},

    {"day": 44, "week": 6, "phase": "sell", "type": "story",
     "topic": "Poll — Biggest Tech Headache",
     "direction": "Ask: 'What's your biggest tech problem right now?' — poll or question box.",
     "hook": "Real question for you 👇",
     "cta": "We read every answer"},

    # ── WEEK 7: Direct Selling ────────────────────────────────────────────────
    {"day": 45, "week": 7, "phase": "sell", "type": "static",
     "topic": "Clear Offer Post",
     "direction": "Simple, direct. We do X for Y type of business. Book a free call.",
     "hook": "We build digital systems for businesses ready to grow. Here's how to start.",
     "cta": "Book a free 30-min call — link in bio"},

    {"day": 46, "week": 7, "phase": "sell", "type": "carousel",
     "topic": "What Happens in Our First Meeting",
     "direction": "Remove the fear of reaching out. Step by step what the call looks like.",
     "hook": "Scared to reach out? Here's exactly what happens when you do",
     "cta": "It's free and there's zero pressure — DM us"},

    {"day": 47, "week": 7, "phase": "sell", "type": "carousel",
     "topic": "Problem → Agitate → Solve",
     "direction": "Name a real pain, twist the knife gently, offer the solution = you.",
     "hook": "Your competitor just launched a better website. Here's what to do.",
     "cta": "Ready to compete? DM us today"},

    {"day": 48, "week": 7, "phase": "sell", "type": "static",
     "topic": "Limited Offer",
     "direction": "Free audit, free strategy session, free review — limited spots.",
     "hook": "We're opening 3 spots for a free digital audit this month",
     "cta": "DM the word FREE to claim yours"},

    {"day": 49, "week": 7, "phase": "sell", "type": "static",
     "topic": "Testimonial #2 + CTA",
     "direction": "Second client result + direct call to action below it.",
     "hook": "Another result we're proud of 🙌",
     "cta": "Want this for your business? Start here →"},

    {"day": 50, "week": 7, "phase": "sell", "type": "carousel",
     "topic": "What You Get When You Work With Us",
     "direction": "Tangible deliverables. Not vague promises — real list of what they receive.",
     "hook": "Exactly what you get when you become our client (no surprises)",
     "cta": "Questions? DM us — we answer everything"},

    {"day": 51, "week": 7, "phase": "sell", "type": "story",
     "topic": "Countdown to Offer Deadline",
     "direction": "Countdown sticker to the limited offer from day 48 ending.",
     "hook": "Only 48 hours left to claim a free audit 👇",
     "cta": "DM us NOW"},

    # ── WEEK 8: Trust + Urgency ───────────────────────────────────────────────
    {"day": 52, "week": 8, "phase": "sell", "type": "static",
     "topic": "Personal Story — Project That Almost Failed",
     "direction": "Vulnerability builds trust. Share a real hard moment and what you learned.",
     "hook": "The project that almost broke us — and what it taught us",
     "cta": "Every hard project made us better. DM us to work with us."},

    {"day": 53, "week": 8, "phase": "sell", "type": "carousel",
     "topic": "Questions to Ask Before Hiring Any IT Company",
     "direction": "You answer all of them perfectly. Genius positioning.",
     "hook": "5 questions to ask before hiring any IT company (we answer all of them)",
     "cta": "Ask us anything — DM or comment"},

    {"day": 54, "week": 8, "phase": "sell", "type": "reel",
     "topic": "Result Reel — Screen Recording",
     "direction": "Screen record of something working — dashboard, system, website. Fast edit.",
     "hook": "Here's what we shipped last week 👇",
     "cta": "Want something like this? DM us"},

    {"day": 55, "week": 8, "phase": "sell", "type": "carousel",
     "topic": "Educational + Soft CTA",
     "direction": "Useful content with a natural CTA at the end. Not pushy.",
     "hook": "3 things your website should do automatically (but probably doesn't)",
     "cta": "Want all 3? We set them up for you — DM us"},

    {"day": 56, "week": 8, "phase": "sell", "type": "static",
     "topic": "Scarcity / Capacity",
     "direction": "Only take X clients. Use only if true — never fake scarcity.",
     "hook": "We work with a small number of clients at a time. Here's why.",
     "cta": "3 spots open next month — DM us to apply"},

    {"day": 57, "week": 8, "phase": "sell", "type": "static",
     "topic": "Collaboration / Partnership",
     "direction": "Tag or mention a complementary business. Cross-promotion.",
     "hook": "Better together — why we partnered with [business type]",
     "cta": "Follow them too 👉"},

    {"day": 58, "week": 8, "phase": "sell", "type": "story",
     "topic": "Community Question",
     "direction": "Ask what they want to see next. Makes them feel ownership.",
     "hook": "What should we build/explain/show next? 👇",
     "cta": "Vote or tell us"},

    {"day": 59, "week": 8, "phase": "sell", "type": "static",
     "topic": "Tease — Something Big Coming",
     "direction": "Hint at something next week. Drives follow + anticipation.",
     "hook": "Something big is coming next week 👀",
     "cta": "Make sure you're following so you don't miss it"},

    {"day": 60, "week": 8, "phase": "sell", "type": "carousel",
     "topic": "60-Day Milestone + Final CTA",
     "direction": "Celebrate 60 days. Recap what you posted. Strong closing offer.",
     "hook": "60 days. Here's everything we learned — and our best offer yet.",
     "cta": "Ready to work with us? DM us today. This is where it starts."},
]

HASHTAG_SETS = {
    "brand":     "#itcompany #webdevelopment #digitalmarketing #techstartup #softwarecompany",
    "education": "#webdev #coding #techeducation #learntech #devtips",
    "social":    "#smb #businessgrowth #entrepreneur #smallbusiness #onlinebusiness",
    "sell":      "#leadgeneration #crmtools #automation #businessautomation #growthhacking",
    "trending":  "#tech2025 #aitools #digitaltransformation #nocode #saas",
}

def get_day(n: int) -> dict:
    for d in PLAN:
        if d["day"] == n:
            return d
    return {}

def get_week(w: int) -> list:
    return [d for d in PLAN if d["week"] == w]
