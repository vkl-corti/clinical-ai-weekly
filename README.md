# Clinical AI Weekly

A short weekly briefing on clinical and healthcare AI news, written for clinicians:
what happened, how strong the evidence is, and what it means at the bedside.

Each week is a self-contained HTML slide deck in `decks/`. `index.html` is the archive.

## Presenting
- `←` / `→` or space to navigate, click the right side to advance, left side to go back
- `F` fullscreen · `T` light/dark theme
- Each slide has its own URL (`#3`), so links and reloads keep your place
- Print to PDF gives one slide per page

## How a deck is built
Stories are researched and written into `stories.json`, then rendered with:

```sh
node build_deck.js stories.json decks/<YYYY-MM-DD>.html
```

This also rebuilds `index.html` and runs a jargon check that flags unexplained terms.

### Slide structure
- **Main stories (1–5):** plain-language intro, evidence level (1–5), where in care, time to the bedside, why it matters for clinicians, a discussion question, and a Decoder with 1–2 key terms
- **In brief:** a few more items, one line each
- **Weak signals:** small things that might matter later
- **Decoder:** this week's terms in plain language

## Files
- `build_deck.js`: renders a deck plus the archive index (no dependencies, plain Node)
- `stories.json`: this week's content
- `covered.json`: past stories, to avoid repeats

---
by V. Klungtvedt
