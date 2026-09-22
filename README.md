# LEAKEPEDIA

An independent public archive of **documented examination paper leaks in India** — 107 incidents in the current dataset, spanning 2002–2026, every entry linked to a published source.

A record, not a hot take.

## What it is

LEAKEPEDIA is a static, client-side-only website that compiles news reports and court records about compromised Indian examinations into a searchable public ledger:

- **Archive** — 107 incident cards. Filter by state, exam type, outcome, decade, or free-text search. Each card opens a full case report with key facts, narrative, and source links.
- **Timeline** — twenty-four years across four eras, from press-room photocopies in 2002 to the Jantar Mantar movement of 2026.
- **Protests** — a photographic record of student agitation, with Wikimedia Commons attribution on every image.
- **About** — the full methodology, sourcing rules, and the project's privacy position.

## Features

- No frameworks, no build step, no dependencies — vanilla HTML/CSS/JS in a single-page-per-section structure.
- No analytics, advertising trackers, or tracking cookies. Google Fonts and Wikimedia Commons are external resources.
- Fully client-side search and filtering over a single `assets/data.js` dataset.
- Accessible: keyboard-navigable, focus-trapped dialogs, `prefers-reduced-motion` support, skip links.
- Responsive and mobile-first.
- Deep links: every incident has a stable `#e-<id>` anchor (e.g. `archive.html#e-e2024-neet`).

## Dataset

All incidents live in `assets/data.js` as a plain array. Each record includes:

| Field | Description |
|-------|-------------|
| `id`, `date`, `exam`, `body` | Identifiers, date, exam name, administering body |
| `type`, `state`, `region` | Exam category, state, region grouping |
| `status` | Outcome — probe ordered, arrests & FIR, cancellations, convictions, etc. |
| `summary`, `detail` | Short and full narrative (allegations attributed to published reporting) |
| `keyFacts` | Highlighted facts for the case report |
| `scale`, `sources` | Impact figures and source links |

**Sourcing rule:** no entry ships without at least one published source link. The dataset uses secondary compilations such as the Wikipedia master list as an index and links directly to major reporting or public records where available. Claims about people, agencies, or events are presented as reported/alleged/proven according to the cited material.

## Running it locally

The site is fully static. You can open `index.html` directly, but to load the Google Fonts and get clean share deep-links, serve it over HTTP:

```bash
# Python 3
python -m http.server 8000

# or Node
npx serve .
```

Then visit `http://localhost:8000`.

## Project structure

```
├── index.html         → homepage (stats, eras, recent ticker)
├── archive.html       → searchable incident archive
├── timeline.html      → four-era timeline
├── protests.html      → photographic protest record
├── about.html         → methodology, sourcing, privacy
├── manifest.json      → PWA manifest
├── robots.txt
├── sitemap.xml        → https://leakepedia.in/
└── assets/
    ├── app.js         → rendering, filters, modals, share/copy
    ├── data.js        → incident dataset
    ├── style.css      → design system (tokens, grid, dark mode)
    └── *.png          → logo, icons, social share image
```

## Disclaimer

This project is made for **public interest, education, and research purposes only**. It is not an official record and has no affiliation with any government body, exam agency, or coaching institute. Research and compilation are the work of one person with the assistance of AI research tools.

## License

All data is compiled from publicly available sources, each linked on its entry. Content compiled as of September 2026. Photographs are used under Creative Commons as credited on each image.

## Contact

Corrections, concerns, or questions: `sahilpsycheofficial@gmail.com`