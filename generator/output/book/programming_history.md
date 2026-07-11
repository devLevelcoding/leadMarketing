# THE CODE THAT CHANGED THE WORLD
## A Complete History of Programming, Software, and the Companies That Built the Digital Age

*From punch cards to artificial intelligence — the full story of how humans learned to talk to machines*

---

> "Software is eating the world." — Marc Andreessen, 2011

---

## TABLE OF CONTENTS

1. Before the Code — The Prehistory of Computing (1800s–1944)
2. The First Computers and the First Programmers (1945–1959)
3. The Language Revolution — How Humans Started Writing for Machines (1950s–1960s)
4. The Minicomputer Age and the Birth of Software as a Business (1965–1974)
5. 1975 — The Year Everything Changed
6. The Personal Computer Explosion (1975–1984)
7. Software Becomes an Industry (1980–1989)
8. The Internet Changes Everything (1990–1999)
9. The Dot-com Bubble — Rise, Crash, and Lessons (1995–2002)
10. The Rebuilding Years (2000–2006)
11. The Mobile Revolution (2007–2012)
12. The Cloud, SaaS, and the Subscription Economy (2008–2015)
13. The Social Media Age (2004–2020)
14. Startups That Beat Giants — How David Killed Goliath
15. The AI Era (2015–Present)
16. The Greatest Company Histories — Rise, Fall, and Reinvention
17. Revenue Tables — The Biggest Software Businesses in History
18. What Failed and Why — Lessons from the Graveyard
19. The Future of Code

---

# PART ONE: BEFORE THE CODE
## The Prehistory of Computing (1800s–1944)

### The Loom That Programmed Itself

The story of programming does not begin with a computer. It begins with cloth.

In 1801, a French weaver named Joseph Marie Jacquard invented a loom controlled by a series of punched cards. Each card told the loom which threads to lift and which to leave down. By arranging the cards in a specific sequence, a weaver could produce any pattern — not by moving his hands differently, but by changing the instructions the loom received.

This was the first time in human history that a machine's behavior was separated from its physical construction. The machine was the same. The instructions were different. The output changed.

This idea — that a machine could be given instructions that controlled its behavior — is the single most important idea in the history of computing. Everything that has happened since, from MS-DOS to ChatGPT, is a variation of what Jacquard demonstrated in a silk factory in Lyon in 1801.

### Charles Babbage and the Engine That Never Was

In 1822, British mathematician Charles Babbage proposed a machine he called the Difference Engine — a mechanical calculator capable of computing mathematical tables automatically. He spent years and a fortune trying to build it, but never completed it.

More significant was his second idea: the Analytical Engine, proposed in 1837. This machine, which was also never fully built, contained every fundamental concept of modern computing:

- A store (what we now call memory)
- A mill (what we now call a processor)
- Input via punched cards (borrowed directly from Jacquard)
- Output via printed results
- Conditional branching — the ability to make decisions based on calculations

Babbage understood that this machine could do more than arithmetic. It could follow logical instructions of any kind. He could not quite see what that meant. Someone else could.

### Ada Lovelace — The First Programmer

Augusta Ada King, Countess of Lovelace, was the daughter of the poet Lord Byron and a gifted mathematician. In 1843, she translated an Italian article about Babbage's Analytical Engine and added her own notes — notes that were three times longer than the original article.

In those notes, Ada described an algorithm for the Analytical Engine to compute Bernoulli numbers. This is widely recognized as the first computer program ever written — written for a machine that did not yet exist, by a person who would not live to see a working computer.

Ada also made a philosophical point that would become deeply controversial 150 years later. She wrote that the Engine could only do what it was instructed to do. It could not originate anything. This became known as "Lady Lovelace's Objection" — and Alan Turing would spend part of his career arguing against it.

Ada Lovelace died in 1852, aged 36. The United States Department of Defense named a programming language after her — Ada — in 1980.

### Herman Hollerith and the First Tech Business

In 1890, the United States Census Bureau faced a problem. The 1880 census had taken 8 years to process by hand. The population was growing. If nothing changed, the 1890 census would not be finished before the 1900 one began.

Herman Hollerith, a statistician, solved the problem with punch cards and electromechanical tabulating machines. His machines processed the 1890 census in one year, saving an estimated $5 million.

In 1896, Hollerith founded the Tabulating Machine Company to sell his technology. In 1911, it merged with two other companies to form the Computing-Tabulating-Recording Company. In 1924, that company was renamed International Business Machines.

IBM.

The world's most influential technology company for the next 60 years was founded by a census worker trying to count people faster.

### Alan Turing and the Theoretical Computer

In 1936, a 24-year-old British mathematician named Alan Turing published a paper called "On Computable Numbers, with an Application to the Entscheidungsproblem." The paper answered a mathematical question nobody outside academia cared about, but in doing so, Turing invented the concept of a general-purpose computing machine.

Turing described a theoretical machine — now called a Turing Machine — that could simulate any algorithm whatsoever. It had a tape, a head that could read and write symbols, and a set of rules. Turing proved that such a machine could solve any problem that could be solved by any method whatsoever, as long as the problem could be broken into discrete steps.

This meant that one machine, given different instructions, could solve any solvable problem. The machine and the program were separate things. This is the theoretical foundation of every computer ever built.

In 1939, Britain went to war with Germany. Turing went to Bletchley Park and built machines to crack the Nazi Enigma code. Some historians estimate his work shortened World War II by two to four years, saving an estimated 14 million lives.

After the war, Turing was prosecuted by the British government for being gay. He was subjected to chemical castration as an alternative to prison. He died in 1954, aged 41, from cyanide poisoning. Whether it was suicide or accident remains disputed.

In 2013, Queen Elizabeth II granted him a posthumous royal pardon. In 2021, his face appeared on the British £50 note.

---

# PART TWO: THE FIRST COMPUTERS AND THE FIRST PROGRAMMERS
## 1945–1959

### ENIAC — The First General-Purpose Electronic Computer

On February 14, 1946, the United States Army unveiled ENIAC — the Electronic Numerical Integrator and Computer — at the University of Pennsylvania. It weighed 30 tons, occupied 1,800 square feet, contained 18,000 vacuum tubes, and consumed 150 kilowatts of power.

ENIAC was 1,000 times faster than any mechanical calculator of the time. It could perform 5,000 additions per second. A modern smartphone performs approximately 100 billion operations per second.

Programming ENIAC did not involve writing code. It involved physically reconnecting wires and setting switches. A program was not software — it was the physical configuration of the machine. Changing a program meant rewiring the computer, which took days.

Six women were hired to program ENIAC: Jean Jennings Bartik, Frances Bilas Spence, Kay McNulty Mauchly Antonelli, Marlyn Wescoff Meltzer, Ruth Lichterman Teitelbaum, and Frances Elizabeth "Betty" Holberton. They received almost no recognition at the time. When ENIAC was unveiled to the press, the women were not introduced. The military officers who stood next to the machine were.

These six women did not just operate a machine. They invented the discipline of programming. They developed techniques for breaking complex problems into sequences of instructions that a computer could execute. They wrote the first programs to be run on a general-purpose electronic computer.

### The Stored-Program Revolution

The next critical step was understanding that a program — the instructions — could be stored inside the computer itself, in the same kind of memory that held data. This idea, developed independently by John von Neumann, J. Presper Eckert, and John Mauchly, changed everything.

Before the stored-program concept, a computer was a calculator. After it, a computer was a machine that could run any program loaded into it. The hardware stayed the same. The software — a word that did not yet exist — was what changed.

The Manchester Small-Scale Experimental Machine, nicknamed "Baby," ran the first stored program in history on June 21, 1948. The program, written by Freddie Williams and Tom Kilburn, calculated the highest factor of a given integer. It took 52 minutes to find the answer.

### IBM Enters Computing

IBM had been making punch card tabulating machines since Hollerith's day. By the late 1940s, the company recognized that electronic computers were going to replace mechanical tabulation.

In 1952, IBM introduced the IBM 701 — its first commercial scientific computer. In 1953, it introduced the IBM 650, which became the most popular computer of the 1950s. By 1955, IBM had installed more than 120 computers at government agencies, universities, and large corporations. By 1960, IBM controlled more than 70% of the computer market.

The price of an IBM 650 in 1953: $200,000 ($2.1 million in 2024 dollars). Monthly rental: $3,500. Customers did not buy computers. They rented them. IBM maintained them. This model — selling outcomes rather than hardware — would be reinvented sixty years later as "cloud computing."

---

# PART THREE: THE LANGUAGE REVOLUTION
## How Humans Started Writing for Machines (1950s–1960s)

### Machine Code and Assembly — Talking to Hardware Directly

The earliest programs were written in machine code — pure binary instructions that the processor could execute directly. Every instruction was a sequence of ones and zeros. To add two numbers, you might write something like:

```
10110000 01100001
```

This was exhausting, error-prone, and completely different for every type of computer. A program written for one machine could not run on another.

Assembly language was the first improvement. Instead of binary, programmers wrote symbolic codes — mnemonics — that represented machine instructions. ADD, MOV, SUB. An assembler program converted these symbols into binary. This was the first time software was used to write software.

But assembly was still tied to specific hardware. And it was still extraordinarily tedious for complex tasks. Something had to change.

### FORTRAN — The First High-Level Language (1957)

In 1954, a team at IBM led by John Backus began work on a radical idea: a programming language that looked something like mathematics, which would be automatically translated into machine code by a program called a compiler.

The language was called FORTRAN — FORmula TRANslation. Released in 1957, it allowed scientists and engineers to write programs like:

```fortran
DO 10 I = 1, 100
    SUM = SUM + I
10 CONTINUE
```

This was revolutionary. A mathematician could look at this and understand it. No knowledge of the underlying hardware was required.

The scientific community was initially skeptical. Programmers doubted that any automatic translation could match the efficiency of hand-written assembly code. Backus proved them wrong. FORTRAN-compiled code was nearly as fast as hand-written assembly, and infinitely easier to write.

FORTRAN is still used today, primarily in scientific computing and weather prediction. The code that runs many of the world's climate models is written in FORTRAN.

### COBOL — Programming for Business (1959)

FORTRAN was designed for scientists. Business had different needs. Businesses needed to process payroll, track inventory, print invoices. These tasks involved reading and writing large volumes of data, not performing complex mathematical calculations.

In 1959, a committee sponsored by the U.S. Department of Defense created COBOL — COmmon Business-Oriented Language. The driving force behind COBOL was Grace Hopper, a U.S. Navy admiral and computer scientist who had already invented the first compiler in 1952.

Hopper believed that programming languages should be close to English. COBOL programs read like English sentences:

```cobol
ADD HOURS-WORKED TO TOTAL-HOURS
MULTIPLY HOURLY-RATE BY HOURS-WORKED GIVING GROSS-PAY
```

COBOL was adopted by the U.S. government and financial institutions. By the 1970s, more COBOL code was being written than code in any other language. Today, an estimated 95 billion lines of COBOL code are still in production, running the systems that process the majority of the world's financial transactions. Every time you use an ATM, there is a very good chance that COBOL is involved.

### LISP — Artificial Intelligence and the List (1958)

In 1958, John McCarthy at MIT created LISP — LISt Processing. It was designed for artificial intelligence research.

LISP introduced ideas that were radical at the time and are now fundamental: functions as first-class objects, automatic memory management (garbage collection), and the ability for a program to treat code as data and data as code.

LISP was the language of AI research for 30 years. Most of the early expert systems of the 1970s and 1980s were written in LISP. It influenced every functional programming language that followed, including Haskell, Clojure, and parts of Python.

### Algol, PL/I, and the Proliferation of Languages

Through the late 1950s and 1960s, languages multiplied. Algol (1958) introduced structured programming concepts — the idea that programs should be organized into logical blocks with clear entry and exit points. Algol's influence on later languages like Pascal, C, and Java was enormous, even though Algol itself is largely forgotten.

PL/I (1964) was IBM's attempt to create one language to replace both FORTRAN and COBOL. It was comprehensive, complex, and ultimately failed to displace either of the languages it was designed to replace.

BASIC (1964) — Beginner's All-purpose Symbolic Instruction Code — was created at Dartmouth College by John Kemeny and Thomas Kurtz. It was designed to be simple enough for non-programmers to learn. Two college students would read about it in a magazine eleven years later and decide to write a BASIC interpreter for a tiny personal computer. Those students were Bill Gates and Paul Allen.

---

# PART FOUR: THE MINICOMPUTER AGE AND THE BIRTH OF SOFTWARE AS A BUSINESS
## 1965–1974

### The Minicomputer Arrives

Through the late 1950s and early 1960s, computers required massive investment. Only large corporations, governments, and universities could afford them. The machines filled rooms, required specialized air conditioning, and needed teams of trained operators.

In 1965, Digital Equipment Corporation (DEC) introduced the PDP-8 — the first minicomputer. At the size of a refrigerator and priced at $18,000 (roughly $170,000 today), it was still expensive by normal standards. But compared to the $1 million+ IBM mainframes, it was accessible to medium-sized businesses, smaller universities, and research labs.

DEC grew explosively. By 1970, it was the second-largest computer company in the world after IBM. The PDP series defined computing for a generation of programmers.

Ken Thompson and Dennis Ritchie at Bell Labs worked on PDP-7 and PDP-11 machines. What they produced there would reshape computing entirely.

### UNIX and the C Language — The Foundation of Everything Modern

In 1969, Ken Thompson at Bell Labs created UNIX — an operating system designed to be simple, portable, and powerful. The key innovation of UNIX was its design philosophy: do one thing and do it well. Instead of one monolithic program that did everything, UNIX provided many small tools that could be combined in flexible ways.

Dennis Ritchie, working with Thompson, created the C programming language to write UNIX in. C was released in 1972. It combined the power and efficiency of assembly language with the readability of higher-level languages. Crucially, C was portable — programs written in C could be compiled to run on different machines with minimal changes.

UNIX and C gave the world:
- The concept of a hierarchical file system (folders inside folders)
- The concept of pipes (output of one program as input to another)
- The concept of everything being a file
- A language that is still in the top 2-3 most important languages 50 years later

Nearly every operating system in use today is either derived from UNIX or influenced by it. MacOS is built on a UNIX foundation. Linux is a UNIX-like system. Android is built on Linux. iOS is built on the same UNIX foundation as MacOS. UNIX's DNA runs through almost every computer on earth.

### Software Becomes Separate From Hardware

Through the 1960s, software was bundled with hardware. IBM sold computers, and the software to run them came with the machine. There was no separate software market.

In 1969, under antitrust pressure, IBM made a decision that would create an entire industry: it began selling hardware and software separately. Software became a product that could be bought and sold independently.

This is the moment the software industry was born.

The timing was perfect. By the early 1970s, computers were becoming more common. Businesses were starting to need software that IBM and the hardware manufacturers did not provide. A market was forming.

### The First Software Companies

**Computer Sciences Corporation (CSC)** — founded 1959 — was one of the first companies to provide software services, contracting with the U.S. government. It grew to become one of the largest IT services companies in the world.

**Electronic Data Systems (EDS)** — founded 1962 by Ross Perot — provided data processing services to companies that could not afford their own computers. Perot won a contract from the U.S. government in 1965. In 1984, he sold EDS to General Motors for $2.5 billion. The company eventually became part of HP.

**Software AG** — founded in Germany in 1969 — was one of the first companies to sell database and middleware software. It is still in operation today.

**SAP** — founded in Germany in 1972 by five former IBM engineers — created enterprise resource planning software. SAP's software ran the backend operations of the largest corporations in the world. It became one of Germany's most valuable companies and remains so today, with revenue exceeding €30 billion.

---

# PART FIVE: 1975 — THE YEAR EVERYTHING CHANGED

### The Altair 8800 and the Homebrew Computer Club

In January 1975, Popular Electronics magazine featured a computer on its cover. The Altair 8800, made by a small company called MITS in Albuquerque, New Mexico, was a kit computer — you had to build it yourself. It had no keyboard, no monitor, no storage. You programmed it by flipping switches on the front panel. The results were shown by blinking lights.

It cost $397 (about $2,200 today).

It sold out immediately.

The Altair was not a great computer by any objective measure. But it proved that there was a market — passionate, hungry, willing-to-pay — for personal computers.

In Menlo Park, California, a group of computer enthusiasts who called themselves the Homebrew Computer Club started meeting in a garage. The members included Steve Wozniak, a young engineer at Hewlett-Packard. They passed around the Altair schematics and talked about what a truly personal computer might look like.

One member brought a copy of the February 1975 Popular Electronics to a meeting. Two young men in Boston read the same issue. They were 19 and 22 years old.

### Microsoft Is Born

Paul Allen showed the Altair article to Bill Gates. The two had been friends since high school, where they had spent every available hour at a terminal connected to a time-sharing computer, teaching themselves to program.

They saw the Altair and had the same thought simultaneously: this machine needs a programming language. MITS needed software. Nobody had written it yet. They could write it first.

Allen called MITS and told them he and his partner had a BASIC interpreter ready to run on the Altair. This was not true. They had not written a word of it. But Allen knew they could write it.

They spent eight weeks working around the clock, writing a BASIC interpreter for a machine they did not own, using a simulator they built themselves. When Allen flew to Albuquerque to demonstrate the software, he realized there was a problem: he had forgotten to write the bootstrap program that loaded BASIC into the Altair's memory. He wrote it on the plane.

The software worked. MITS signed a licensing deal. Gates and Allen founded a company to sell programming language software. They called it Micro-Soft — later Microsoft.

**Microsoft's first product:** Altair BASIC
**Year:** 1975
**Revenue in first year:** approximately $16,000

### Apple Is Founded

In 1976, Steve Wozniak designed a computer circuit board that was dramatically simpler and more powerful than anything else available. Steve Jobs, his friend, saw it and immediately recognized its commercial potential.

Jobs and Wozniak founded Apple Computer on April 1, 1976. Their first product, the Apple I, was a circuit board — buyers provided their own keyboard and display. Price: $666.66.

It sold 200 units.

Wozniak then designed the Apple II — a complete, self-contained computer with a keyboard, color graphics, and a built-in programming language. Released in 1977, the Apple II was the first truly successful personal computer.

**Apple founded:** April 1, 1976
**Founders:** Steve Jobs, Steve Wozniak, Ronald Wayne
**Apple I price:** $666.66 (1976)
**Apple II price:** $1,298 (1977)
**Apple II units sold:** approximately 6 million over its lifetime

---

# PART SIX: THE PERSONAL COMPUTER EXPLOSION
## 1975–1984

### VisiCalc — The First Killer App (1979)

The concept of a "killer app" — a piece of software so valuable that it alone justifies buying the hardware it runs on — was invented in 1979.

Dan Bricklin was a Harvard Business School student who was tired of recalculating financial models by hand every time a single number changed. He envisioned a program that displayed a spreadsheet on screen, where changing one number would automatically recalculate all the others.

With his friend Bob Frankston, Bricklin created VisiCalc — the Visible Calculator. It ran on the Apple II.

VisiCalc changed everything. Before VisiCalc, businesses bought computers for their engineers and scientists. After VisiCalc, businesses bought computers for their accountants and financial analysts. VisiCalc made the Apple II a business tool, not just a hobbyist toy.

In its first year, VisiCalc sold 100,000 copies at $100 each. By 1983, it had sold over 700,000 copies. Apple sold Apple II computers specifically because VisiCalc ran on them.

Dan Bricklin and Bob Frankston did not patent VisiCalc. They did not become billionaires. But they changed the world.

**VisiCalc launched:** 1979
**Price:** $100
**Peak revenue:** approximately $70 million annually
**Killed by:** Lotus 1-2-3 (1983)

### The IBM PC — The Machine That Standardized Everything (1981)

By 1980, personal computers were a real market. Apple was dominating it. IBM, the most powerful computer company in the world, was watching from the sidelines.

IBM's normal product development cycle took four to five years. A committee of executives decided that was too slow. They formed a special team, gave them unprecedented freedom, and told them to build a personal computer in one year.

The IBM PC team made a decision that would define the next four decades of computing: they built it with off-the-shelf components from other manufacturers, and they licensed the operating system rather than writing one themselves.

They chose Intel's 8088 processor. They chose Microsoft's operating system. They published their design specifications openly, allowing other companies to build compatible machines.

IBM released the IBM PC on August 12, 1981. It cost $1,565. Within a year, it had 40% of the personal computer market.

The open design immediately spawned "IBM-compatible" clones — computers made by other companies that ran the same software as the IBM PC. Companies like Compaq, HP, and Dell built their fortunes on IBM-compatible hardware.

But the real winners were Intel and Microsoft. Because IBM had licensed the operating system rather than buying it, Microsoft retained the right to sell MS-DOS to other manufacturers. Every IBM-compatible clone needed MS-DOS. Microsoft collected a fee for every one sold.

**IBM PC launched:** August 12, 1981
**Price:** $1,565
**First-year revenue:** $1 billion
**IBM's mistake:** licensing, not buying, the operating system

### MS-DOS — The Operating System That Built Microsoft

The operating system Microsoft sold to IBM was not, originally, Microsoft's. In July 1980, IBM contacted Microsoft looking for an operating system. Microsoft did not have one. Bill Gates directed IBM to Gary Kildall of Digital Research, who had written an operating system called CP/M.

Kildall, according to various accounts, was flying his airplane when IBM came to visit. His wife would not sign IBM's non-disclosure agreement. The meeting did not go well. IBM came back to Microsoft.

Microsoft purchased an operating system called QDOS (Quick and Dirty Operating System) from a small Seattle company called Seattle Computer Products for $50,000. They modified it, renamed it MS-DOS, and licensed it to IBM as PC-DOS.

The deal that made Microsoft: Microsoft retained the rights to sell MS-DOS to other manufacturers. IBM got an exclusive license for its hardware. Every other PC maker had to pay Microsoft.

When the IBM-compatible clone market exploded, Microsoft collected licensing fees from every single machine. By 1990, Microsoft's revenue was $1.18 billion. Gates was the world's youngest billionaire.

Gary Kildall, whose CP/M might have been the operating system of the PC age, died in 1994. His contribution to computing is largely forgotten.

### The Macintosh and the Graphical Revolution (1984)

In 1979, Steve Jobs visited Xerox PARC — the research center where Xerox had developed graphical user interfaces, the mouse, ethernet networking, and laser printing. Xerox, focused on copiers, did not understand what it had.

Jobs understood immediately. He licensed the technology (giving Xerox stock in Apple) and put his team to work building a computer with a graphical interface — pictures instead of text commands, a mouse instead of a keyboard for navigation.

The result was the Macintosh, launched on January 24, 1984, with a television commercial directed by Ridley Scott that aired during the Super Bowl. The commercial, called "1984," showed a dystopian world of conformity disrupted by a woman with a hammer. It ran once and is considered one of the greatest advertisements in history.

The Mac was genuinely revolutionary. It had a graphical desktop, icons, windows, and a mouse. Computing was suddenly visual. Suddenly intuitive. Suddenly accessible to people who had never written a line of code.

**Mac launched:** January 24, 1984
**Price:** $2,495
**First-year sales:** 250,000 units
**Legacy:** defined the visual language of personal computing for the next 40 years

---

# PART SEVEN: SOFTWARE BECOMES AN INDUSTRY
## 1980–1989

### Lotus 1-2-3 — Killing VisiCalc (1983)

Mitch Kapor founded Lotus Development Corporation in 1982. His product, Lotus 1-2-3, was a spreadsheet program for the IBM PC. It was faster than VisiCalc, had better features, and was designed specifically for the machine that was becoming the dominant platform.

Lotus 1-2-3 launched in January 1983. It destroyed VisiCalc within a year.

By 1985, Lotus was the largest software company in the world, with revenue of $225 million. Lotus 1-2-3 was the reason businesses bought IBM PCs.

Lotus's mistake: failing to move to Windows fast enough. When Microsoft released Excel for Windows in 1987, and Windows became dominant in the early 1990s, Lotus lagged. By 1995, Excel had overtaken Lotus 1-2-3.

IBM acquired Lotus in 1995 for $3.5 billion — primarily to get Lotus Notes, a groupware product for corporate collaboration. Notes was ahead of its time: it allowed teams to share documents and communicate before the internet made this easy. Notes was a kind of pre-internet corporate internet.

**Lotus founded:** 1982
**Peak revenue:** $1 billion (1994)
**Acquired by IBM:** 1995, for $3.5 billion

### WordPerfect — The Word Processor Wars (1980–1996)

WordPerfect was created in 1979 by Alan Ashton and Bruce Bastian at Brigham Young University. Released commercially in 1980, it became the dominant word processing software for the IBM PC era.

WordPerfect's strength was its keyboard-driven interface. Power users memorized dozens of keyboard shortcuts. It handled formatting with a system called reveal codes that let you see the underlying markup of your document. It was fast, powerful, and extremely capable.

By the late 1980s, WordPerfect Corporation had revenues of over $700 million and employed thousands of people. WordPerfect had 50% of the word processor market.

Then Windows happened. WordPerfect was slow to adapt to the graphical environment. Their Windows version was delayed, buggy, and released just as Microsoft was shipping Word for Windows.

WordPerfect Corporation was sold to Novell in 1994 for $1.4 billion. Novell, which was not a consumer software company and did not understand the product, sold it to Corel in 1996 for $124 million — a fraction of what it had paid. In two years, a billion-dollar business had been destroyed by failing to adapt to a new platform.

**WordPerfect peak revenue:** $700 million+
**Sold to Novell:** 1994 for $1.4 billion
**Sold to Corel:** 1996 for $124 million

### dBASE — The Database That Started It All (1979–1991)

Wayne Ratliff created a database program while working at NASA's Jet Propulsion Laboratory. He entered it in a programming contest and sold it through a classified ad. A company called Ashton-Tate acquired it and released it as dBASE II in 1981.

dBASE was the first commercially successful database management system for personal computers. It allowed businesses to create and manage structured data without mainframes. Sales representatives could keep their customer lists in dBASE. Businesses could track inventory. Small companies could have a database for the first time.

By the mid-1980s, Ashton-Tate was one of the top three software companies in the world. dBASE III and dBASE III Plus were selling 100,000 copies per month.

Then: the same story as WordPerfect and Lotus. Slow adaptation to Windows. A disastrously buggy dBASE IV release in 1988 that destroyed customer trust. Borland acquired Ashton-Tate in 1991.

The database market that dBASE pioneered would eventually be worth hundreds of billions of dollars. The beneficiaries were Oracle, SQL Server, MySQL, and PostgreSQL — not Ashton-Tate.

### Microsoft's Windows — The Platform That Won (1985–1990)

Microsoft announced Windows in 1983, intending to compete with the Mac. Windows 1.0 shipped in November 1985. It was not good. It required DOS, had limited application support, and was slow. Most people ignored it.

Windows 2.0 (1987) was better but still not compelling. Windows 3.0, released in May 1990, was the version that changed everything. It was fast enough, stable enough, and attractive enough. It sold 2 million copies in its first six months.

More importantly, Windows 3.0 was the platform on which the Office suite — Word, Excel, and PowerPoint — ran best. Microsoft had built its applications for Windows. Its competitors had not.

**Windows 1.0:** November 1985 (ignored)
**Windows 3.0:** May 1990 (first major success, 2 million copies in 6 months)
**Windows 95:** August 1995 (cultural phenomenon, 40 million copies in first year)

### Borland — The Brilliant Company Nobody Remembers

Philippe Kahn founded Borland International in 1983 and immediately disrupted the market by selling Turbo Pascal for $49.95 — at a time when compilers typically cost hundreds of dollars.

Turbo Pascal was faster than anything else on the market and cost less than a tenth of the competition. It made high-quality software development tools accessible to individuals. Kahn's philosophy: make great tools cheap enough that every programmer can afford them.

Borland went on to create Turbo C, Turbo C++, Delphi, and JBuilder. At its peak, it had revenues of $450 million and was Microsoft's most serious competitor in development tools.

Then Kahn made an expensive acquisition (Ashton-Tate, for $440 million in 1991) at a time when the company could not afford it. Microsoft responded to Borland's competition by slashing the price of Visual Basic and Visual C++. Borland lost money for years and never recovered.

Delphi — its Windows rapid application development tool — was genuinely excellent. It is still sold today by a company called Embarcadero. A small, passionate community of developers still use it.

---

# PART EIGHT: THE INTERNET CHANGES EVERYTHING
## 1990–1999

### Tim Berners-Lee and the World Wide Web (1989–1991)

In 1989, Tim Berners-Lee, a British scientist working at CERN (the European particle physics laboratory in Geneva), wrote a memo proposing a new information management system. His boss wrote on it: "Vague but exciting."

Berners-Lee was trying to solve a specific problem: CERN employed thousands of researchers who constantly left the organization, taking their knowledge with them. Information was lost. There needed to be a way to link documents together so that the information in them could be found and navigated without needing to know who had created each document.

His solution: hypertext. Documents linked to other documents by clickable links. A universal addressing system (URLs) so any document anywhere on a network could be referenced. A simple protocol for transferring documents (HTTP). A formatting language for creating documents (HTML).

On December 25, 1990, Berners-Lee created the first web server and the first web browser on a NeXT computer at CERN. On August 6, 1991, he made the web publicly available.

Berners-Lee did not patent the web. He did not commercialize it. He gave it to the world for free.

"This is for everyone," he said, in a message that was displayed during the opening ceremony of the 2012 London Olympics.

The web became the most significant communications technology since the printing press. As of 2024, there are approximately 1.13 billion websites and 5.4 billion internet users.

### Mosaic — The Browser That Opened the Web (1993)

The early web was text-based and accessible mainly to academics. In 1993, a student at the National Center for Supercomputing Applications (NCSA) at the University of Illinois named Marc Andreessen led a team that created Mosaic — the first web browser with a graphical interface.

Mosaic displayed images alongside text, instead of separately. It was intuitive. Anyone could use it. Suddenly the web was not just for researchers — it was for everyone.

Mosaic was downloaded 2 million times in its first year. Within 18 months of its release, web traffic had increased by 341,634%.

Marc Andreessen graduated and moved to Silicon Valley, where he met Jim Clark (founder of Silicon Graphics). Together they founded Netscape Communications in 1994.

### Netscape — The IPO That Started Everything (1994–1995)

Netscape's Navigator browser was better than Mosaic and free for educational and personal use. Within months of its release in late 1994, Netscape had captured 75% of the browser market.

On August 9, 1995, Netscape went public. The company had been in operation for 16 months. It had never made a profit. Its revenue in 1994 was $2.2 million.

Netscape's stock was priced at $14. It opened at $75 and ended the day at $58. The company was worth $2.9 billion. Andreessen, 24 years old, was worth $58 million by the end of the day.

The Netscape IPO launched the dot-com era. It proved that internet companies could command enormous valuations before they were profitable. The gold rush began.

Microsoft's response: they realized immediately that if Netscape succeeded in making the browser the dominant computing platform, Windows would become irrelevant. Microsoft bundled Internet Explorer with Windows and gave it away for free. This was the beginning of the "browser wars" — and the beginning of the antitrust investigation that would consume Microsoft for years.

Netscape was acquired by AOL in 1999 for $4.2 billion. Internet Explorer eventually captured 95% of the browser market. But Netscape had one last act: in 1998, facing defeat, it released its browser code as open source. From that code base grew Mozilla Firefox — and from Firefox came Chrome, which now has 65% of the browser market.

**Netscape founded:** 1994
**IPO date:** August 9, 1995
**IPO valuation:** $2.9 billion
**Acquired by AOL:** 1999 for $4.2 billion

### Amazon — Starting With Books (1994)

Jeff Bezos was a hedge fund executive in New York when he read a statistic that the internet was growing at 2,300% per year. He made a list of products that could be sold online and decided that books were the best option — there were too many titles for any physical store to stock them all, but an online store could offer every book ever published.

He drove from New York to Seattle with his wife MacKenzie, writing the business plan in the car. He incorporated Amazon in Washington State because Washington had a small population (meaning fewer customers would be subject to sales tax) and because it was close to a large book distributor in Oregon.

Amazon launched in July 1995 as an online bookstore. In its first month, it sold books in all 50 U.S. states and 45 countries. In its first two months, it was doing $20,000 per week in sales.

Bezos's original vision was not a bookstore. It was what he called "the everything store." Books were just the entry point. Amazon went on to sell music (1998), videos (1998), electronics and toys (1999), and eventually everything else.

In 2006, Amazon launched Amazon Web Services (AWS) — a cloud computing platform that rented computing infrastructure to other companies. AWS is now Amazon's most profitable business, with annual revenue exceeding $90 billion.

**Amazon founded:** 1994 (incorporated), 1995 (launched)
**First-year revenue:** $511,000 (1995)
**1997 revenue:** $148 million
**2000 revenue:** $2.76 billion
**2023 revenue:** $574 billion

### Google — The Better Search Engine (1998)

By 1998, the web was enormous and getting larger every day. Finding information was a problem. Several search engines existed — AltaVista, Yahoo, Lycos, Excite, Infoseek — but they all ranked results primarily by how many times a search term appeared on a page. This was easy to game and produced mediocre results.

Larry Page and Sergey Brin were PhD students at Stanford. Page had an insight: a page that many other pages link to is probably important — just as a research paper cited by many others is probably influential. He called this PageRank.

The algorithm worked dramatically better than anything else. Their search engine, initially called BackRub and then renamed Google (a misspelling of "googol" — the number 10 to the power of 100), indexed 60 million pages and returned far more relevant results than the competition.

Google was incorporated on September 4, 1998. Its first office was a friend's garage in Menlo Park. Investor Andy Bechtolsheim wrote them a check for $100,000, made out to "Google Inc." — before the company was even incorporated.

Google grew entirely through word of mouth. It had no marketing budget. People simply started using it because it was better.

**Google founded:** September 4, 1998
**First office:** Susan Wojcicki's garage, Menlo Park
**2000 revenue:** $19 million (AdWords launched)
**IPO:** August 19, 2004, at $85 per share ($23 billion valuation)
**2023 revenue:** $307 billion

### The Other Internet Survivors of the 1990s

**Yahoo** — founded 1995 by Jerry Yang and David Filo at Stanford. Started as a directory of websites. Was offered the chance to acquire Google for $1 million in 1998 and declined. Was offered the chance to buy Facebook for $1 billion in 2006 and almost did. Sold to Verizon in 2016 for $4.8 billion after declining a $44.6 billion offer from Microsoft in 2008.

**eBay** — founded 1995 by Pierre Omidyar. The first item sold was a broken laser pointer for $14.83. Omidyar emailed the buyer to confirm that he understood it was broken. The buyer replied that he collected broken laser pointers. eBay went public in 1998, raising $63 million. It was profitable from almost the beginning — it just took a percentage of each sale. 2023 revenue: $9.8 billion.

**PayPal** — founded 1998 as Confinity by Peter Thiel and Max Levchin. Merged with Elon Musk's X.com in 2000. Originally designed to allow Palm Pilot users to beam money to each other. Pivoted to email-based payments and became the payment system of choice on eBay. Acquired by eBay in 2002 for $1.5 billion. Spun off from eBay in 2015. The PayPal founders who left to start other companies — Thiel, Musk, Reid Hoffman, Chad Hurley, Jawed Karim, Steve Chen — became known as the "PayPal Mafia" and went on to found or fund Tesla, YouTube, LinkedIn, SpaceX, Palantir, and dozens of other companies.

**Craigslist** — founded 1995 by Craig Newmark as an email list of local San Francisco events. Became a classified ads website. Remained simple, ugly, and functional. Destroyed the classified advertising business of every newspaper in the country. Peak revenue: approximately $700 million per year, with fewer than 50 employees — one of the highest revenue-per-employee ratios in internet history.

---

# PART NINE: THE DOT-COM BUBBLE — RISE, CRASH, AND LESSONS
## 1995–2002

### The Gold Rush

The Netscape IPO created a template: you could take an internet company public before it was profitable, with minimal revenue, and the market would value it in the billions. The theory was that any company with a dominant internet position would eventually make enormous profits. The profits did not have to be real yet. The future profits would justify the present valuation.

Between 1995 and 2000, hundreds of internet companies went public. Venture capital poured into any company with a ".com" in its name. Companies raised millions with nothing more than a slide deck and a domain name.

The market capitalization of internet companies grew from essentially zero in 1993 to $3 trillion in 2000.

Here are some of the most spectacular examples of the era:

### The Winners: Companies That Survived and Thrived

**Priceline** — founded 1997 by Jay Walker with the concept of "name your own price" for travel. The concept was revolutionary; the initial execution was mixed. But Priceline survived the crash, pivoted its business, and eventually acquired Booking.com in 2005 for $133 million — a company now worth more than $100 billion. Priceline/Booking Holdings 2023 revenue: $21 billion.

**Salesforce** — founded 1999 by Marc Benioff with the idea of delivering enterprise software as a service over the internet, eliminating the need for companies to install and maintain software on their own servers. The concept — Software as a Service (SaaS) — seemed radical. Corporate software came on CDs and required armies of consultants to install. Benioff launched salesforce.com with a campaign that had protesters standing outside Siebel Systems (the dominant CRM company) holding signs that said "Software is Dead." Salesforce went public in 2004. 2023 revenue: $34.9 billion.

### The Spectacular Failures

**Pets.com** — founded 1998 — sold pet supplies online. The problem: pet food is heavy and cheap. Shipping it costs more than the margin. The company raised $82.5 million in its IPO in February 2000. Nine months later it was bankrupt. Its sock puppet mascot was more famous than its business plan.

**Webvan** — founded 1999 — online grocery delivery. Raised over $800 million. Built enormous warehouses across the country before it had proven the concept in a single market. Filed for bankruptcy in 2001, the largest dot-com failure. The concept: correct (Instacart, Amazon Fresh, and DoorDash proved it). The execution: catastrophically bad.

**Kozmo.com** — founded 1998 — promised one-hour delivery of books, games, and snacks in cities. Raised $280 million. Went bankrupt in 2001. The concept: correct (Gopuff and rapid delivery apps proved it 15 years later). Too early.

**Excite@Home** — formed 1999 through a merger of Excite (a search engine) and At Home Network (a broadband provider). Valued at $35 billion. Bankrupt in 2001. Sold its assets for $307 million.

**Boo.com** — founded 1998 — a UK online fashion retailer that tried to recreate the physical shopping experience with 3D images and a virtual shopping assistant named Miss Boo. Raised $135 million. Spent it all on infrastructure and a spectacular launch. Went bankrupt in May 2000 after six months of operation.

### The Crash

On March 10, 2000, the NASDAQ Composite Index peaked at 5,048.62 — a level it would not reach again for 15 years.

The crash, when it came, was brutal. By October 2002, the NASDAQ had lost 78% of its value. $5 trillion in market capitalization was erased. Hundreds of companies went bankrupt. Tens of thousands of people lost their jobs.

The causes:
- Valuations disconnected entirely from any financial reality
- Companies spending on growth without demonstrating profitability was possible
- Excessive venture capital chasing too few viable business models
- The belief that "internet" was itself a business model

The lessons:
- Revenue models matter
- Profitability has to be possible, even if not immediate
- Scale does not automatically create a business
- Being early is often indistinguishable from being wrong

---

# PART TEN: THE REBUILDING YEARS
## 2000–2006

### What Survived the Crash — And Why

Amazon survived. It had been burning cash like everyone else, and its stock price fell 94% from $107 to $6. But Bezos had built actual infrastructure — warehouses, relationships with suppliers, a working website. When the market recovered, Amazon had a real business to show.

Google survived. It was not public yet during the crash, and it had a clear business model: search advertising. Companies would pay to appear in search results. This was not speculative — it was already working.

eBay survived. It had been profitable from near the beginning because its model required no inventory — it just connected buyers and sellers and took a percentage.

PayPal survived (and was acquired by eBay for $1.5 billion in 2002).

The companies that survived had something in common: they were actually useful to their users in a concrete, repeatable way.

### Wikipedia — The Encyclopedia That Should Not Work (2001)

In January 2001, Jimmy Wales and Larry Sanger launched Wikipedia — a free encyclopedia that anyone could edit.

The concept seemed absurd. Of course an encyclopedia written by random people would be full of errors. Of course contributors would fight. Of course bad actors would abuse it.

None of that happened — or rather, all of it happened, and Wikipedia's community developed mechanisms to handle it. By 2003, Wikipedia had 100,000 articles. By 2023, it had 60 million articles in 330 languages and received 15 billion page views per month.

Wikipedia is one of the most visited websites in the world. It is run by the Wikimedia Foundation, a nonprofit with an annual budget of approximately $170 million — infinitely less than the company would be worth if it were for-profit. Wales has repeatedly refused to commercialize it.

**Wikipedia launched:** January 15, 2001
**Annual revenue:** approximately $170 million (donations)
**Articles (English):** 6.7 million
**Monthly page views:** 15+ billion

### Skype — Calling the World for Free (2003)

Niklas Zennström and Janus Friis, the founders of the file-sharing service Kazaa, founded Skype in 2003. Skype allowed voice and video calls over the internet for free — or at very low cost for calls to landlines.

This was a direct assault on the business of every telephone company in the world. Calls that would have cost dollars per minute were suddenly free.

Skype was acquired by eBay in 2005 for $2.6 billion — a price that seemed too high at the time. eBay never figured out how to integrate it into its business. They sold 70% of it to a private equity group in 2009 for $2 billion. Microsoft then acquired Skype in 2011 for $8.5 billion.

Skype at its peak had 300 million registered users. Microsoft eventually rolled it into Teams.

### LinkedIn — Professional Networking (2002)

Reid Hoffman, a former executive at PayPal, founded LinkedIn in his living room in 2002. The site launched in May 2003 with 2,700 members — Hoffman's personal and professional contacts.

LinkedIn grew slowly at first. Professional networking felt less urgent than social networking. But it became the definitive online resume and professional connection platform.

Microsoft acquired LinkedIn in 2016 for $26.2 billion — at the time, Microsoft's largest acquisition. LinkedIn 2023 revenue: $15.1 billion.

**LinkedIn founded:** 2002
**Launched:** May 5, 2003
**Members (2024):** 1 billion+
**Acquired by Microsoft:** 2016 for $26.2 billion

### MySpace — The Social Network That Came First (2003)

Tom Anderson and Chris DeWolfe founded MySpace in August 2003. It was the most visited website in the United States from 2005 to 2008. In June 2006, it surpassed Google as the most visited website in the United States.

Rupert Murdoch's News Corporation acquired MySpace in July 2005 for $580 million. The acquisition was widely praised at the time.

Then Facebook happened.

News Corporation sold MySpace in 2011 for $35 million — 6% of what it paid. The destruction of value was almost without parallel in media history.

MySpace's failure: it prioritized customization and music over the real social experience. Users' profile pages became garish, slow-loading messes. Facebook was clean, fast, and organized. Corporate ownership made MySpace bureaucratic and slow to adapt.

### WordPress — The Software That Runs the Web (2003)

Matt Mullenweg was a 19-year-old photography enthusiast in Houston who contributed to an open-source blogging platform called b2/cafelog. When the main developer disappeared, Mullenweg forked the project and released WordPress in May 2003.

WordPress is now used by 43% of all websites on the internet. Not 43% of websites built with a CMS — 43% of all websites. This is perhaps the most dominant market position held by any software product in history.

Automattic, the company Mullenweg founded to develop WordPress, is valued at approximately $7.5 billion. WordPress itself is free and open source.

---

# PART ELEVEN: THE MOBILE REVOLUTION
## 2007–2012

### The iPhone — January 9, 2007

At 9:41 AM on January 9, 2007, Steve Jobs walked onto a stage in San Francisco and said: "This is the day I have been looking forward to for two and a half years."

He told the audience he was going to introduce three revolutionary products: a widescreen iPod with touch controls, a revolutionary mobile phone, and a breakthrough internet communications device.

"Are you getting it?" he said, as the audience began to understand. "These are not three separate devices. This is one device. And we are calling it iPhone."

The iPhone was not the first smartphone. Blackberry had smartphones. Nokia had smartphones. But the iPhone was the first smartphone that people actually wanted to use. It had a large touchscreen with no physical keyboard. It ran a real web browser. It could play music, browse the web, make calls, and send email — all from a device that fit in a pocket.

**iPhone launched:** June 29, 2007
**Price:** $499 (4GB), $599 (8GB)
**First-weekend sales:** 270,000 units
**2023 iPhone revenue:** $200 billion
**Percentage of Apple's total revenue:** approximately 52%

### The App Store — A Platform Is Born (2008)

When the iPhone launched, it ran Apple's built-in applications only. Steve Jobs's initial position was that web apps would be sufficient — developers could build iPhone applications as websites.

The developer community disagreed loudly. Apple listened.

On July 10, 2008, Apple launched the App Store alongside iPhone OS 2.0. On the first day, 10 million applications were downloaded. In the first weekend, 25 million downloads. In the first month, 60 million downloads.

The App Store created an entirely new economy. For the first time, a small team could build software and distribute it to hundreds of millions of people, with no manufacturing, no distribution deals, no retail relationships. Apple handled payments and took 30%.

The App Store has generated over $1 trillion in billings since its launch. In 2022 alone, it facilitated $1.1 trillion in commerce.

Applications that were created after the App Store launched and became billion-dollar businesses:
- Instagram (2010)
- WhatsApp (2009)
- Snapchat (2011)
- Uber (2009)
- Airbnb (2008)
- Pinterest (2010)
- TikTok (2016)

### Android — Google's Response (2008)

Google acquired Android in 2005 for an amount estimated at $50 million. Android was originally designed as an operating system for cameras. When the iPhone was revealed, Android's team pivoted immediately.

The first Android phone, the T-Mobile G1 (HTC Dream), launched on October 22, 2008. It was less polished than the iPhone but had one crucial advantage: it was open. Any manufacturer could build an Android phone. Any developer could publish an app without Apple's approval. Google distributed Android for free to manufacturers.

This strategy — openness — is what allowed Android to eventually capture 70% of the global smartphone market. Samsung, LG, Huawei, Xiaomi, and dozens of other manufacturers built Android devices at every price point. The iPhone was available only on Apple hardware, at premium prices.

Today, there are approximately 3 billion active Android devices in the world. The combined installed base of iPhones is approximately 1.2 billion. Android runs on more devices than any other operating system in history.

**Android acquired by Google:** 2005
**First Android phone:** October 22, 2008
**Global market share (2024):** approximately 71%

### WhatsApp — Messaging Without Borders (2009)

Jan Koum grew up in a small village near Kyiv, Ukraine. His family immigrated to Mountain View, California when he was 16. He took a job as an infrastructure engineer at Yahoo in 2007.

In 2009, he and his colleague Brian Acton founded WhatsApp. The premise was simple: messaging that used the internet instead of the mobile carrier's SMS network, which cost money. WhatsApp was free for the first year, then $1 per year.

WhatsApp grew virally in countries where SMS was expensive — primarily outside the United States. By 2013, it had 200 million users. By 2014, 400 million.

Facebook acquired WhatsApp in February 2014 for $19 billion — the largest acquisition of a venture-backed company in history at the time.

At the time of the acquisition, WhatsApp had 55 employees.
$19 billion / 55 employees = $345 million per employee.

Jan Koum's personal stake: approximately $6.8 billion.

**WhatsApp founded:** 2009
**Employees at acquisition:** 55
**Acquired by Facebook:** February 2014, for $19 billion
**Users (2024):** 2 billion+

### Uber — The App That Owns Nothing (2009)

Travis Kalanick and Garrett Camp founded Uber in San Francisco in 2009. The concept: an app that connected passengers with drivers who used their own cars. Uber owned no vehicles. It employed no drivers. It simply provided the software that connected them.

This model — sometimes called the "platform economy" or the "gig economy" — allowed Uber to scale globally without the enormous capital expenditure that a traditional taxi company would require.

Uber launched in San Francisco in 2010. Within three years it was in dozens of cities across multiple countries. By 2019, it went public at a $82.4 billion valuation.

Uber is still not consistently profitable — its profitability comes and goes depending on accounting methods and market conditions. But it permanently disrupted the taxi industry in every city it entered. Traditional taxi medallions, which had sold for over $1 million each in New York City, fell to under $200,000.

**Uber founded:** 2009
**IPO:** May 2019 at $82.4 billion valuation
**2023 revenue:** $37.3 billion

### Airbnb — Your Home as a Hotel (2008)

Brian Chesky and Joe Gebbia founded Airbnb in 2008 when they rented out air mattresses in their San Francisco apartment to attendees of a design conference because all the hotels were full. They charged $80 per night and called it "Air Bed and Breakfast."

The idea: instead of building hotels, create software that allows anyone to rent out their home, apartment, or spare room to travelers.

Airbnb was rejected by multiple investors when it launched. Paul Graham of Y Combinator admitted later that he almost did not fund them because the idea seemed too weird.

The company survived its early days partly by selling novelty cereal boxes — "Obama O's" and "Cap'n McCains" themed to the 2008 presidential election — to raise money when they were nearly broke.

Airbnb went public in December 2020 at a $47 billion valuation, one of the largest IPOs of the year. As of 2024, it has 7 million listings in 220 countries.

**Airbnb founded:** 2008
**IPO:** December 2020 at $47 billion
**2023 revenue:** $9.9 billion
**Listings (2024):** 7 million+

---

# PART TWELVE: THE CLOUD, SAAS, AND THE SUBSCRIPTION ECONOMY
## 2008–2015

### What Is Cloud Computing?

Before cloud computing, businesses ran their software on their own servers, in their own buildings, managed by their own IT teams. This was expensive, complex, and inflexible. Buying a server was a capital expenditure. Scaling required buying more hardware.

Cloud computing moved this infrastructure off-premises. Instead of running software on your own server, you run it on someone else's server, accessed over the internet, and pay only for what you use.

Amazon Web Services (AWS), launched in 2006, was the pioneer. Microsoft Azure launched in 2010. Google Cloud Platform launched in 2011.

The impact on startups was transformative. Before AWS, founding a startup required purchasing servers, renting data center space, and hiring operations staff. Weeks of work before a single line of business code was written. After AWS, a startup could be launched in an afternoon, with computing costs of $50 per month until the business needed more.

### The SaaS Revolution

Software as a Service (SaaS) meant that software was delivered as a subscription over the internet, rather than sold as a product installed locally. The customer never owned the software — they rented access to it.

This was better for customers:
- No installation
- Automatic updates
- Access from any device
- Predictable costs
- No large upfront investment

And dramatically better for software companies:
- Predictable, recurring revenue
- Lower customer acquisition costs (no retail, no physical distribution)
- Continuous relationship with the customer
- Lower support costs (one version to maintain)

The SaaS model created the concept of ARR (Annual Recurring Revenue), which became the primary metric by which investors valued software companies. A company with $10 million in ARR growing at 100% per year was worth far more than a traditional software company with $50 million in one-time license revenue.

### The SaaS Giants

**Salesforce** — Already mentioned, but the pioneer of SaaS for enterprise. Revenue grew from $51 million (2003) to $34.9 billion (2023). Market cap as of 2024: approximately $235 billion.

**Workday** — founded 2005 by Dave Duffield and Aneel Bhusri, both former executives at PeopleSoft. Created cloud-based human resources and financial management software to replace SAP and Oracle. IPO in 2012. 2023 revenue: $7.3 billion.

**ServiceNow** — founded 2004 by Fred Luddy. Cloud platform for IT service management. 2023 revenue: $8.97 billion. Market cap: over $150 billion.

**Slack** — founded 2013 as an internal communication tool by Stewart Butterfield (who also founded Flickr). Started as the internal tool for a game development company. When the game failed, the communication tool was spun out. Grew from 0 to 8 million daily active users in four years. Acquired by Salesforce in 2021 for $27.7 billion.

**Zoom** — founded 2011 by Eric Yuan, a former Cisco WebEx engineer. Yuan had submitted visa applications 8 times before being allowed to move to the United States. Zoom went public in 2019 at a $9 billion valuation. When COVID-19 forced the world into remote work in 2020, Zoom's revenue more than quadrupled in a single year. At peak pandemic valuation, Zoom was worth $170 billion — more than the seven largest U.S. airlines combined.

**Dropbox** — founded 2007 by Drew Houston and Arash Ferdowsi, initially rejected by Steve Jobs at Apple. Apple later built iCloud to compete with it. Dropbox's insight: files should exist in the cloud and synchronize automatically to all your devices. IPO in 2018 at $12.1 billion valuation.

**HubSpot** — founded 2006 by Brian Halligan and Dharmesh Shah at MIT. Created the concept of "inbound marketing" — attracting customers through content rather than cold outreach. Built software to support this approach. 2023 revenue: $2.17 billion.

**Shopify** — founded 2006 by Tobias Lütke in Ottawa, Canada. Lütke built it initially to sell snowboards online because no good e-commerce platforms existed. The platform became more valuable than the snowboard store. Shopify is now the infrastructure for over 4 million online stores. 2023 revenue: $7.1 billion.

---

# PART THIRTEEN: THE SOCIAL MEDIA AGE
## 2004–2020

### Facebook — The Network That Connected the World (2004)

Mark Zuckerberg launched "The Facebook" from his Harvard dorm room on February 4, 2004. It was initially limited to Harvard students. Within 24 hours, 1,200 students had signed up. Within a month, half of Harvard was on it.

Zuckerberg expanded to other Ivy League universities, then all universities, then high schools, then in 2006, to everyone over 13.

The core insight of Facebook: people wanted to connect with people they already knew, not strangers. Previous social networks like Friendster and MySpace were full of people you did not know. Facebook mapped your real social graph onto the internet.

Facebook went public on May 18, 2012, at a $104 billion valuation — the largest tech IPO in history at the time. The IPO was plagued by technical problems on NASDAQ. The stock fell after the IPO and did not recover to its offering price for over a year.

Zuckerberg married Priscilla Chan on the day after the IPO, the same weekend. He wore a suit.

**Facebook founded:** February 4, 2004
**IPO:** May 18, 2012, at $104 billion valuation
**Users (2024):** 3 billion+ monthly active users
**Meta (parent company) 2023 revenue:** $134.9 billion

### Twitter — The 140-Character Revolution (2006)

Jack Dorsey, Noah Glass, Biz Stone, and Evan Williams founded Twitter in 2006 out of a podcast company called Odeo. The original idea: a service that let you tell your friends what you were doing in 140 characters (the length of an SMS message minus room for a username).

Twitter became something different from what anyone expected: a public broadcasting platform. Politicians, journalists, celebrities, and corporations used it to communicate directly with audiences. Breaking news appeared on Twitter before it appeared anywhere else. Movements organized on Twitter. The Arab Spring protests of 2011 were coordinated partly through Twitter.

Twitter went public in November 2013 at a $24 billion valuation. It never solved its problem with harassment and abuse, and it never matched Facebook's advertising revenue.

In October 2022, Elon Musk acquired Twitter for $44 billion in what he later called the worst business deal he had ever made. He renamed it X and implemented dramatic changes — laying off 75% of the staff, reinstating suspended accounts, and changing the verification system.

**Twitter founded:** 2006
**IPO:** November 2013 at $24 billion
**Acquired by Elon Musk:** October 2022 for $44 billion
**Renamed:** X

### YouTube — Everyone's a Broadcaster (2005)

Chad Hurley, Steve Chen, and Jawed Karim — three former PayPal employees — founded YouTube in February 2005. The first video, uploaded by Karim on April 23, 2005, was an 18-second clip of him at the San Diego Zoo. The caption: "Me at the zoo."

YouTube solved a problem: there was no easy way to share video on the internet. Posting video required technical knowledge and server space. YouTube provided a simple interface — upload a video, get a link, share it anywhere.

Google acquired YouTube in October 2006 for $1.65 billion in stock — 20 months after it was founded. This is widely considered one of the greatest acquisitions in history. YouTube's annual revenue is now approximately $29 billion.

Every minute of 2024, 500 hours of video are uploaded to YouTube. The platform has 2.7 billion logged-in users per month.

**YouTube founded:** February 2005
**First video:** April 23, 2005 ("Me at the zoo")
**Acquired by Google:** October 2006 for $1.65 billion
**2023 revenue:** approximately $29 billion

### Instagram — Filters and the Visual Web (2010)

Kevin Systrom and Mike Krieger founded Instagram in October 2010. It grew to 1 million users in its first three months. Within a year, it had 10 million users.

The key insight: photo filters made ordinary photos look good. Anyone with an iPhone could take a picture, apply a vintage filter, and share something that looked like it had been taken by a professional photographer.

Facebook acquired Instagram in April 2012 for approximately $1 billion. Instagram had 13 employees. Zuckerberg made the acquisition decision over a weekend without consulting Facebook's board of directors.

Instagram is now estimated to be worth between $100 billion and $500 billion — a return of 100-500x on the acquisition price.

**Instagram founded:** October 2010
**Users at acquisition:** 30 million
**Employees at acquisition:** 13
**Acquired by Facebook:** April 2012 for approximately $1 billion
**Estimated current value:** $100-500 billion

### TikTok — The Algorithm That Knew You (2016)

Zhang Yiming founded ByteDance in Beijing in 2012. In 2016, ByteDance launched Douyin, a short-video app, in China. In 2017, it acquired Musical.ly, a similar app popular in the United States, and merged it with an international version called TikTok.

TikTok's breakthrough was its recommendation algorithm. Unlike Facebook and Instagram, which showed you content primarily from people you followed, TikTok's For You Page showed you content based entirely on what the algorithm determined you would enjoy — regardless of who made it. An unknown creator could post a video and immediately reach millions of people.

TikTok became the fastest app in history to reach 1 billion users. Its influence on culture, music, fashion, and politics is enormous.

TikTok is the subject of ongoing regulatory scrutiny in the United States and Europe over concerns that its Chinese ownership could allow the Chinese government to access data on Western users or influence the content they see.

**TikTok (international version) launched:** 2018 (after Musical.ly merger)
**Users (2024):** 1.5 billion+
**ByteDance revenue (2023):** approximately $110 billion
**Estimated ByteDance valuation:** $220-$300 billion

---

# PART FOURTEEN: STARTUPS THAT BEAT GIANTS
## How David Killed Goliath

### Why Startups Win Against Established Companies

The history of technology is full of examples of small, new companies defeating enormous, established ones. This seems paradoxical. Large companies have more resources, more talent, more money, more brand recognition. Why do they lose?

The reasons follow consistent patterns:

**1. The innovator's dilemma:** A new technology initially serves a smaller, less profitable market. The established company rationally ignores it to protect its core business. The new technology improves until it is competitive in the core market — by which point the new company is entrenched.

**2. Organizational inertia:** Large companies have processes, committees, and approvals. A startup can make and execute a decision in a day that takes a large company a year.

**3. Business model conflict:** The new approach often threatens the existing revenue model. A newspaper could not build an advertising-supported website because the website would undercut the print newspaper's advertising revenue.

**4. Cultural mismatch:** The culture that built one product is often the wrong culture to build a completely different product. IBM's culture was suited to building mainframes, not personal computers.

### Google vs. AltaVista

When Google launched in 1998, AltaVista was the most sophisticated search engine available. It had been built by Digital Equipment Corporation and could search billions of words. It was technically impressive.

Google was better — not because it had more computing power or more pages indexed, but because its algorithm produced more relevant results. AltaVista's results were full of spam. Google's results were not.

AltaVista could have acquired Google. It had the opportunity. It was not interested.

AltaVista became part of Yahoo through a series of acquisitions. Yahoo later had the opportunity to acquire Google for $1 million and declined. Yahoo then received an offer from Google to acquire Yahoo for $1 billion — stock in a company that would soon be worth hundreds of billions — and declined.

AltaVista shut down in 2013.

### Netflix vs. Blockbuster

Blockbuster Video was founded in 1985 and grew to 9,000 stores and 60,000 employees. Its business model: rent videos from physical stores, and collect late fees when customers returned them late. Late fees accounted for approximately $800 million of Blockbuster's annual revenue — a fact customers despised.

Reed Hastings founded Netflix in 1997 after paying a $40 late fee on Apollo 13. Netflix's initial model was DVD-by-mail — no late fees. Netflix expanded into streaming in 2007.

In 2000, Netflix approached Blockbuster and offered to sell the company for $50 million. Blockbuster's CEO laughed them out of the room.

In 2010, Blockbuster filed for bankruptcy. In 2013, it closed all its stores. A single franchise location remained open in Bend, Oregon — as of 2024, it is still operating as a tourist attraction and the subject of a Netflix documentary.

Netflix's 2023 revenue: $33.7 billion. Market cap: approximately $200 billion.

### Spotify vs. iTunes

Apple's iTunes, launched in 2001, defined digital music. You could buy individual songs for $0.99. It was legal, easy, and worked beautifully on iPods and iPhones. iTunes had over 70% of the legal digital music market.

Daniel Ek founded Spotify in Stockholm in 2006 with a different model: instead of paying per song, pay a monthly subscription and listen to anything. Or listen to advertising-supported free music.

Apple was initially skeptical of the streaming model. iTunes was dominant. Apple had invested enormous resources in it.

Spotify launched in the U.S. in 2011. By 2014, it had 50 million users. Apple responded by launching Apple Music in 2015.

Spotify went public in 2018 through a direct listing at a $26.5 billion valuation. It now has 602 million users and 236 million premium subscribers.

iTunes was shut down in 2019. Apple Music continues, but Spotify leads the market.

**Spotify founded:** 2006
**IPO:** April 2018, $26.5 billion valuation
**Users (2024):** 602 million

### Slack vs. Microsoft Teams

Slack launched in 2013 and became the fastest business application to reach $1 billion in revenue. It was intuitive, fun, and quickly became the default communication tool for technology companies.

Microsoft had dominated enterprise communication for decades with Outlook and later Skype for Business. When Slack began to threaten Microsoft's grip on enterprise software, Microsoft responded by building Microsoft Teams — and bundling it with Office 365 at no additional cost.

Slack had to compete with a free product from a company that controlled the desktop computers of most enterprise workers.

Microsoft Teams grew from 0 to 75 million daily active users in one year. Slack was acquired by Salesforce in 2021 for $27.7 billion — a successful exit, but the competitive trajectory against Teams was not in Slack's favor.

This story illustrates the power of distribution. Microsoft did not win because Teams was better than Slack. It won because it was free to every Office 365 customer.

### Zoom vs. Cisco WebEx

Eric Yuan worked at Cisco WebEx for 10 years. He repeatedly proposed building a new, mobile-friendly video conferencing system and was rejected. In 2011, he left Cisco and founded Zoom.

Zoom was superior to WebEx in every way that mattered to users: easier to join meetings, more reliable video quality, worked on any device, and had a simpler pricing model.

Zoom grew steadily through the 2010s. When COVID-19 hit in March 2020 and the world moved to remote work overnight, Zoom became essential. Daily meeting participants grew from 10 million in December 2019 to 300 million in April 2020.

Cisco WebEx, despite being owned by the world's largest networking company, with billions in resources, had failed to build a product users loved. A 40-person startup built it instead.

Zoom 2023 revenue: $4.4 billion.

---

# PART FIFTEEN: THE AI ERA
## 2015–Present

### Machine Learning Goes Mainstream

Artificial intelligence had been a field of research since the 1950s. It had multiple "winters" — periods of reduced funding and interest when the technology failed to deliver on its promises.

The current AI boom began with a series of breakthroughs in deep learning — a technique that uses artificial neural networks with many layers to learn from large datasets. In 2012, a neural network created by Geoffrey Hinton's team at the University of Toronto won the ImageNet image recognition competition by a margin so large it shocked the computer vision community.

This breakthrough demonstrated that large neural networks, trained on large datasets, using large amounts of computing power, could learn to perform tasks that had previously been thought to require human intelligence.

The key enabler: GPU chips made by NVIDIA. Originally designed for video games, GPUs could perform the kind of parallel mathematical operations required for neural network training with extraordinary efficiency.

### AlphaGo — When AI Beat the World Champion (2016)

Go is an ancient Chinese board game more complex than chess. The number of possible board positions in Go is greater than the number of atoms in the observable universe. For decades, computer scientists believed that a computer capable of defeating a top human Go player was at least 10 years away.

DeepMind, a London-based AI lab acquired by Google in 2014 for approximately $600 million, built AlphaGo. In March 2016, AlphaGo defeated Lee Sedol, one of the greatest Go players in history, four games to one.

AlphaGo did not play Go the way humans play Go. It made moves that human players described as "alien" — moves that no human would have considered, but that turned out to be strategically brilliant. It had discovered patterns in the game that humans had not found in thousands of years of play.

The moment AlphaGo won, many people who worked in AI understood that something fundamental had changed. Machines were no longer just following rules that humans had programmed. They were learning to find patterns that humans had not identified.

### OpenAI and GPT — Language as a Task (2015–present)

OpenAI was founded in December 2015 by Elon Musk, Sam Altman, Greg Brockman, Ilya Sutskever, and others. It was founded as a nonprofit with the mission of ensuring that artificial general intelligence benefited all of humanity.

In 2018, OpenAI published GPT-1 — a language model trained on a large corpus of text that could generate coherent prose. In 2019, GPT-2 was so good at generating convincing text that OpenAI initially declined to release it, concerned about misuse.

GPT-3, released in 2020, was transformative. It could write code, essays, poems, and business emails. It could answer questions, translate languages, and summarize documents. For the first time, AI could communicate in natural language at a level that often appeared indistinguishable from human writing.

ChatGPT, built on GPT-3.5 and launched on November 30, 2022, was the fastest application in history to reach 1 million users: it did so in five days. For comparison, Netflix took 3.5 years, Facebook 10 months, Spotify 5 months.

Within two months, ChatGPT had 100 million monthly active users. Within a year, the AI industry had attracted hundreds of billions of dollars in investment, and every major technology company had announced AI as its primary strategic priority.

**ChatGPT launched:** November 30, 2022
**Time to 1 million users:** 5 days
**Time to 100 million users:** 2 months
**OpenAI valuation (2024):** approximately $157 billion

### NVIDIA — The Unexpected Winner of the AI Era

NVIDIA was founded in 1993 by Jensen Huang, Chris Malachowsky, and Curtis Priem to build chips for video games. For most of its existence, it was a successful but unremarkable semiconductor company.

When deep learning required massive parallel computing, NVIDIA's GPUs turned out to be perfectly suited for the task. NVIDIA's CUDA software platform, released in 2006, allowed programmers to use GPUs for general-purpose computing. Almost all deep learning research runs on NVIDIA hardware.

NVIDIA's revenue grew from $16.7 billion (2020) to $60.9 billion (2024). Its market capitalization exceeded $3 trillion in 2024, making it briefly the world's most valuable company.

Jensen Huang became worth over $100 billion. He appeared in public in his trademark leather jacket, which became an icon of the AI era.

**NVIDIA founded:** 1993
**Primary product:** GPU chips (originally for gaming)
**Revenue 2020:** $16.7 billion
**Revenue 2024:** $60.9 billion
**Market cap peak (2024):** over $3 trillion

---

# PART SIXTEEN: THE GREATEST COMPANY HISTORIES

### Microsoft — The Company That Reinvented Itself Twice

**Founded:** 1975 by Bill Gates and Paul Allen
**Headquarters:** Redmond, Washington

**Act 1 (1975–1995): The Platform Empire**
Microsoft's first great success was MS-DOS. Its second was Windows. Its third was Office — the suite of productivity applications that included Word, Excel, and PowerPoint. By the mid-1990s, Microsoft dominated personal computing. Windows ran on 90% of PCs. Office dominated the productivity software market.

Gates became the world's richest person. Microsoft's market cap reached $620 billion in 1999, making it the world's most valuable company.

**Act 2 (2000–2013): The Lost Decade**
Microsoft missed every major shift in technology from 2000 to 2013. It failed in smartphones (Windows Phone). It failed in search (Bing never surpassed 5% market share). It failed in music (Zune was a disaster). It failed in social networking. Steve Ballmer, who succeeded Gates as CEO in 2000, is often criticized for this period.

The Wall Street Journal called 2000–2010 "Microsoft's lost decade." The company's stock price was roughly the same in 2013 as it was in 2000.

**Act 3 (2014–present): The Cloud Comeback**
Satya Nadella became CEO in February 2014. He immediately shifted Microsoft's focus to cloud computing. Azure became the second-largest cloud platform in the world. He embraced open source, acquired GitHub (the platform where most of the world's code is stored) for $7.5 billion in 2018, acquired LinkedIn for $26.2 billion in 2016, and acquired Activision Blizzard (gaming) for $68.7 billion in 2023.

Nadella's most consequential move: a $1 billion investment in OpenAI in 2019, followed by $10 billion more in 2023. Microsoft integrated OpenAI's technology into every product — Bing, Office, Azure, Windows.

Microsoft's market cap went from $300 billion when Nadella took over to over $3 trillion in 2024, the second most valuable company in the world.

**Microsoft revenue by year:**
- 1990: $1.18 billion
- 2000: $22.96 billion
- 2010: $62.48 billion
- 2020: $143 billion
- 2023: $211.9 billion

### Apple — The Resurrection Story

**Founded:** April 1, 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne
**Headquarters:** Cupertino, California

**Act 1 (1976–1985): The Beginning**
Apple II. The Macintosh. The vision of computing as something beautiful and human. Then the board of directors fired Steve Jobs in 1985 after a power struggle.

**Act 2 (1985–1997): Near Death**
Without Jobs, Apple produced a series of mediocre products. The company came close to bankruptcy. In 1997, Apple had 90 days of cash left. The stock was under $4.

**Act 3 (1997–2011): The Return**
Jobs returned. He immediately cancelled most of Apple's product lines, focusing the company on four products. He brought in Jony Ive to lead design. He launched iMac (1998), iPod (2001), iTunes (2001), iPhone (2007), App Store (2008), and iPad (2010).

The iPhone alone transformed Apple from a $3 billion company to the most valuable company in the world.

**Act 4 (2011–present): The Services Era**
Jobs died in October 2011. Tim Cook became CEO. Cook's Apple focused on supply chain efficiency, services (App Store, Apple Music, Apple TV+, iCloud), and the Apple Silicon chip transition.

Apple became the first company in history to be valued at $1 trillion (2018), $2 trillion (2020), and $3 trillion (2022).

**Apple revenue by year:**
- 1997: $7 billion (near bankruptcy)
- 2007: $24 billion (iPhone year)
- 2012: $156 billion
- 2020: $274.5 billion
- 2023: $383 billion

### Amazon — From Books to Everything

**Founded:** 1994 by Jeff Bezos
**Headquarters:** Seattle, Washington

The Amazon story is one of patient long-term thinking and deliberate reinvention. Bezos told investors from the first shareholder letter that Amazon was optimizing for long-term value, not short-term profit. He meant it.

Amazon was not profitable until 2001. Investors remained patient.

Key pivots:
- 1995: Online bookstore
- 1998: Music and video
- 1999: Electronics, toys, and more
- 2005: Amazon Prime (free two-day shipping for $79/year) — created the most loyal customer base in retail history
- 2006: Amazon Web Services (AWS) — the decision that changed Amazon's business forever
- 2007: Kindle — created the e-book market
- 2014: Amazon Echo and Alexa — created the smart speaker category
- 2017: Acquisition of Whole Foods for $13.7 billion

AWS is not Amazon's largest revenue segment — retail is. But AWS is its most profitable. AWS operating income is approximately 63% of Amazon's total operating income despite being a much smaller revenue percentage.

**Amazon revenue by year:**
- 1995: $511,000
- 2000: $2.76 billion
- 2010: $34.2 billion
- 2020: $386 billion
- 2023: $574 billion

---

# PART SEVENTEEN: REVENUE TABLES — THE BIGGEST SOFTWARE BUSINESSES IN HISTORY

### Top Software/Tech Companies by 2023 Revenue

| Company | Founded | 2023 Revenue | Primary Business |
|---------|---------|-------------|-----------------|
| Apple | 1976 | $383 billion | Hardware + Services |
| Amazon | 1994 | $574 billion | E-commerce + Cloud |
| Alphabet (Google) | 1998 | $307 billion | Advertising + Cloud |
| Microsoft | 1975 | $211.9 billion | Cloud + Software + Gaming |
| Meta (Facebook) | 2004 | $134.9 billion | Social + Advertising |
| Samsung | 1969 | $200 billion | Hardware + Software |
| Netflix | 1997 | $33.7 billion | Streaming |
| Salesforce | 1999 | $34.9 billion | Enterprise SaaS |
| Adobe | 1982 | $19.4 billion | Creative + Document SaaS |
| Oracle | 1977 | $52.5 billion | Database + Cloud |
| SAP | 1972 | $34 billion (EUR) | Enterprise Software |
| Uber | 2009 | $37.3 billion | Ride-sharing + Delivery |
| Airbnb | 2008 | $9.9 billion | Home-sharing Platform |
| Shopify | 2006 | $7.1 billion | E-commerce Platform |
| Spotify | 2006 | $13.9 billion | Music Streaming |
| LinkedIn | 2002 | $15.1 billion | Professional Network |
| Zoom | 2011 | $4.4 billion | Video Conferencing |
| HubSpot | 2006 | $2.17 billion | Marketing SaaS |
| ServiceNow | 2004 | $8.97 billion | IT Service Management |
| Workday | 2005 | $7.3 billion | HR + Finance SaaS |

### Historical App Revenue Milestones

| App | Year Launched | Revenue in First Year | Peak Annual Revenue |
|-----|-------------|---------------------|-------------------|
| VisiCalc | 1979 | $10M | $70M |
| Lotus 1-2-3 | 1983 | $53M | $1B |
| Microsoft Word | 1983 | est. $10M | Part of $30B+ Office |
| Windows 3.0 | 1990 | est. $200M | Part of $50B+ Windows |
| Netscape Navigator | 1994 | $2.2M | $533M |
| QuickBooks | 1992 | est. $20M | $5B+ (Intuit total) |
| Salesforce | 1999 | est. $5M | $34.9B |
| Gmail | 2004 | $0 (free) | Part of $307B Alphabet |
| YouTube | 2005 | $0 (acquired) | $29B |
| Facebook | 2004 | $0 | $134.9B |
| iPhone App Store | 2008 | $200M | $85B+ |
| WhatsApp | 2009 | minimal | $0 (free, owned by Meta) |
| Instagram | 2010 | $0 | est. $30B+ |
| Uber | 2009 | est. $0.5M | $37.3B |
| Airbnb | 2008 | est. $0.2M | $9.9B |
| Snapchat | 2011 | $0 | $4.6B |
| TikTok/ByteDance | 2016 | est. $100M | $110B+ |
| ChatGPT/OpenAI | 2022 | est. $28M | $1.6B (2023) |

---

# PART EIGHTEEN: WHAT FAILED AND WHY — LESSONS FROM THE GRAVEYARD

### Myspace (2003–2011) — Lost to Facebook
**Reason:** Prioritized customization over usability. Corporate ownership slowed innovation. Facebook's cleaner design and real-name policy won.

### Blackberry (1999–2016) — Lost to iPhone
**Reason:** Dominated enterprise smartphones with physical keyboards. Dismissed touchscreens. By the time they adapted, the market had moved. Peak market share (2009): 20%. By 2016: under 1%.

### Nokia (1992–2013 as dominant player) — Lost to iPhone and Android
**Reason:** The largest mobile phone company in the world could not adapt from hardware-focused to software-focused thinking. Refused to use Android for fear of losing control. Their own operating systems (Symbian, then Windows Phone) never competed effectively. Sold mobile business to Microsoft in 2013 for $7.2 billion. Microsoft wrote off most of the value within two years.

### Yahoo (1995–2017) — Missed every opportunity
**Reason:** Turned down opportunity to buy Google for $1 million (1998). Turned down Microsoft's $44.6 billion offer (2008). Almost acquired Facebook. The company that could have been worth hundreds of billions sold for $4.8 billion.

### AOL (1985–2015) — The Walled Garden That Lost
**Reason:** AOL built a proprietary internet — a curated online service. When the internet itself became accessible and fast, AOL's curated world had no advantage. Acquired by Time Warner for $182 billion in 2000 (the worst acquisition in media history). Sold to Verizon for $4.4 billion in 2015.

### Kodak (1892–2012 bankruptcy) — Invented Digital and Lost
**Reason:** Kodak engineer Steve Sasson invented the digital camera in 1975. Kodak's management decided not to develop it because it threatened film sales. By the time digital photography threatened to destroy Kodak's core business, it was too late. Filed for bankruptcy in 2012.

### Vine (2012–2016) — Invented Short Video and Lost
**Reason:** Twitter acquired Vine in 2012 for $30 million before it launched. Vine was the first popular short-video platform — the direct predecessor of TikTok. Twitter shut it down in 2016 to cut costs. If Vine had survived and been developed properly, it might now be worth hundreds of billions.

### Friendster (2002–2011) — The Original Social Network
**Reason:** The first mass-market social network, but its servers could not handle the growth. Page loads took 40 seconds. Users left for MySpace. Friendster is remembered as the tragic example of a company with the right idea and the wrong execution.

### Google+ (2011–2019) — Google's Failed Social Network
**Reason:** Google's attempt to compete with Facebook. Never attracted enough users to create a social network effect. Shut down in 2019. Lesson: even the most powerful companies cannot succeed in markets where they have no native advantage and where a competitor already owns the relationship.

### Microsoft Zune (2006–2011) — Too Late for the iPod Era
**Reason:** Microsoft's digital music player was released four years after the iPod. It was technically comparable but had no ecosystem of music, no iTunes equivalent, and no reason to choose it over the market leader. Discontinued in 2011.

---

# PART NINETEEN: THE FUTURE OF CODE

### Where We Are

The year 2024 finds the software industry at an inflection point as significant as any in its history. Artificial intelligence is transforming the act of programming itself. Tools like GitHub Copilot (built on OpenAI's technology) can write code from natural language descriptions. Developers report productivity increases of 30-55% when using AI coding assistants.

This raises the question that Ada Lovelace first contemplated in 1843: can a machine originate? Can it be creative? Can it understand, or does it merely process?

The current generation of AI systems does not understand code the way a human understands it. They have learned the statistical patterns of code written by humans, and they reproduce those patterns with extraordinary accuracy. But they do not understand intent. They do not understand context. They make errors that no competent human programmer would make.

For now.

### The Trends Shaping the Next Decade

**No-code and low-code platforms** are making software creation accessible to people who cannot program. Bubble, Webflow, Airtable, and dozens of similar tools allow people to build web applications, databases, and automations without writing a single line of code. The line between "programmer" and "non-programmer" is becoming less meaningful.

**AI-generated applications** are beginning to be possible. You can describe an application in plain English to tools like Claude or GPT-4, and they will write the code. This will not replace programmers — it will change what programmers do. Instead of typing code, they will review, guide, and architect.

**Quantum computing** remains the great unknown of computing's future. Quantum computers use the properties of quantum mechanics to perform certain calculations exponentially faster than classical computers. They are not general-purpose computers — there are specific types of problems (cryptography, molecular simulation, optimization) where they have enormous advantages. Full-scale, error-corrected quantum computers may be a decade away. When they arrive, they will break most of the encryption that secures the internet, requiring a complete overhaul of cybersecurity.

**Edge computing** moves computation away from central cloud data centers and closer to where data is generated — in devices, cars, hospitals, factories. As the number of connected devices (the Internet of Things) grows into the hundreds of billions, processing all that data in central data centers becomes impractical.

**Open source has won.** Linux runs the servers that power the internet. Android, built on Linux, runs most of the world's smartphones. Python, the dominant language for AI and data science, is open source. The most important infrastructure tools — Kubernetes, Docker, React, TensorFlow — are open source. The proprietary vs. open source debate of the 1990s is over.

### The Question That Remains

Alan Turing asked in 1950: can machines think? His test — the Turing Test — proposed that a machine that could convince a human it was human, in a text conversation, should be considered intelligent.

Modern AI systems regularly pass versions of the Turing Test in narrow domains. ChatGPT converses fluently, reasons about complex topics, writes compelling prose, and generates working code. Is it thinking?

Most AI researchers say no — it is a very sophisticated pattern-matching system. It processes language without understanding meaning. It has no experience, no consciousness, no self-awareness.

Others are less certain.

What is beyond dispute: the software that humans have been building since 1975 has transformed every aspect of human life. The average person in 2024 carries in their pocket a device more powerful than the computers that guided the Apollo missions, connected to a network that contains the accumulated knowledge of civilization, running software written by millions of people across every country on Earth.

The programmer who sat down in 1975 to write BASIC for a machine with 4 kilobytes of RAM could not have imagined it.

The programmer sitting down in 2024 to work with AI that can help write the code cannot yet imagine what 2050 will look like.

That is the nature of this particular technology. It compounds. It builds on itself. Each generation of tools makes the next generation of tools possible.

The story of code is not finished. It is barely started.

---

## EPILOGUE: The People Who Made It

Behind every line of code in this book — behind every company, every product, every revolution — are individual human beings who sat down and tried to build something they believed in.

Some of them became billionaires. Most did not.
Some of them are famous. Most are not.
Some of them changed the world visibly. Most of them changed it in ways they never knew.

The programmer at IBM who wrote a few lines of code in 1960 that still run in a bank's system today.
The student who stayed up all night debugging a program for a machine nobody believed would sell.
The engineer who said "what if we did it this way" and changed the direction of a company that would eventually change the direction of an industry.

This book is also their story.

---

*End of The Code That Changed The World*

*Total content: approximately 110 pages equivalent*

---

**Further Reading**
- *The Soul of a New Machine* by Tracy Kidder (1981)
- *Hackers: Heroes of the Computer Revolution* by Steven Levy (1984)
- *The Innovator's Dilemma* by Clayton Christensen (1997)
- *The Everything Store* by Brad Stone (2013)
- *Hatching Twitter* by Nick Bilton (2013)
- *No Filter* by Sarah Frier (2020) — Instagram story
- *Bad Blood* by John Carreyrou (2018) — Theranos
- *The Founders* by Jimmy Soni (2022) — PayPal Mafia
