#!/usr/bin/env node
// build_deck.js — render "This Week in Clinical AI" HTML deck from stories.json
// Usage: node build_deck.js <stories.json> <output.html>

const fs = require("fs");
const path = require("path");

const AUTHOR = "V. Klungtvedt";
const WORDMARK = `<span class="mark"></span><span class="wm">Clinical AI <i>Weekly</i></span>`;
// ---- palettes (Apple-inspired: quiet greys, one deep accent) ----------------
// Each palette has a light and a dark mode; `mode` is the default, T toggles the other.
// `hero` styles the cover and closing slides.
const PALETTES = {
  // Inspired by xyva.io: deep "void" navy text, cobalt lines, sky-blue accents
  xyva: {
    mode: "light",
    light: {
      bg: "#fbfbfd", "bg-2": "#ffffff", line: "#e3e8f0", "line-2": "#c9d3e3",
      text: "#081c4f", "text-2": "#2a3e6b", muted: "#7a88a8",
      accent: "#1b46a8", "accent-ink": "#2160c4", "on-accent": "#ffffff", glow: "transparent",
      shadow: "0 1px 2px rgba(10,36,99,.05), 0 14px 36px -18px rgba(10,36,99,.2)",
      "c-regulation": "#1b46a8", "c-product": "#2b8cbf", "c-research": "#5b4fa8", "c-frontier": "#1f7a8c", "c-policy": "#7d8aa3",
    },
    dark: {
      bg: "#050f33", "bg-2": "#0a1a4a", line: "#122766", "line-2": "#1c3a88",
      text: "#eaf5fb", "text-2": "#a8bcde", muted: "#8899aa",
      accent: "#96cfea", "accent-ink": "#b8dff0", "on-accent": "#04080f", glow: "rgba(23,60,120,.35)",
      shadow: "none",
      "c-regulation": "#96cfea", "c-product": "#b8d9f0", "c-research": "#c4b5fd", "c-frontier": "#7fd6d0", "c-policy": "#8899aa",
    },
    hero: {
      bg: "radial-gradient(120% 95% at 88% -5%, #12307f 0%, #0a1d55 42%, #050f33 100%)",
      text: "#f2f8fd", "text-2": "#d6e2f5", muted: "#9fb1d3", "accent-ink": "#a8d8f0",
      line: "rgba(184,217,240,.14)", "line-2": "rgba(184,217,240,.24)", "bg-2": "rgba(184,217,240,.06)",
      "c-regulation": "#96cfea", "c-product": "#b8d9f0", "c-research": "#c4b5fd", "c-frontier": "#7fd6d0", "c-policy": "#a8bcde",
    },
  },
  bordeaux: {
    mode: "light",
    light: {
      bg: "#fbfbfd", "bg-2": "#ffffff", line: "#e8e8ed", "line-2": "#d2d2d7",
      text: "#1d1d1f", "text-2": "#424245", muted: "#86868b",
      accent: "#6e1f3f", "accent-ink": "#6e1f3f", "on-accent": "#ffffff", glow: "transparent",
      shadow: "0 1px 2px rgba(0,0,0,.04), 0 14px 36px -18px rgba(0,0,0,.16)",
      "c-regulation": "#6e1f3f", "c-product": "#0a5bd3", "c-research": "#6b3fa0", "c-frontier": "#1f6f5c", "c-policy": "#6e6e73",
    },
    dark: {
      bg: "#100709", "bg-2": "#1b0f15", line: "#2c1b24", "line-2": "#433039",
      text: "#f5f5f7", "text-2": "#cbc3c7", muted: "#8e8590",
      accent: "#c2577f", "accent-ink": "#e7a3bf", "on-accent": "#100709", glow: "rgba(110,31,63,.38)",
      shadow: "none",
      "c-regulation": "#e7a3bf", "c-product": "#8ab4ff", "c-research": "#c9a7ef", "c-frontier": "#7fd1bd", "c-policy": "#a1a1a6",
    },
    hero: {
      bg: "radial-gradient(120% 95% at 88% -5%, #5a1636 0%, #2a0c1b 42%, #0f0508 100%)",
      text: "#f5f5f7", "text-2": "#d6cdd2", muted: "#9a8f96", "accent-ink": "#eaa9c4",
      line: "rgba(255,255,255,.12)", "line-2": "rgba(255,255,255,.2)", "bg-2": "rgba(255,255,255,.06)",
      "c-regulation": "#eaa9c4", "c-product": "#8ab4ff", "c-research": "#c9a7ef", "c-frontier": "#7fd1bd", "c-policy": "#b0a8ad",
    },
  },
  blue: {
    mode: "dark",
    dark: {
      bg: "#050a1c", "bg-2": "#0b1431", line: "#162042", "line-2": "#25315c",
      text: "#f5f5f7", "text-2": "#b6bed2", muted: "#7c86a3",
      accent: "#4f7dff", "accent-ink": "#93b1ff", "on-accent": "#050a1c", glow: "rgba(47,91,255,.2)",
      shadow: "none",
      "c-regulation": "#93b1ff", "c-product": "#7dd3fc", "c-research": "#c4b5fd", "c-frontier": "#5eead4", "c-policy": "#a1a1aa",
    },
    light: {
      bg: "#fbfbfd", "bg-2": "#ffffff", line: "#e8e8ed", "line-2": "#d2d2d7",
      text: "#1d1d1f", "text-2": "#424245", muted: "#86868b",
      accent: "#0b2a6f", "accent-ink": "#1d3f99", "on-accent": "#ffffff", glow: "transparent",
      shadow: "0 1px 2px rgba(0,0,0,.04), 0 14px 36px -18px rgba(0,0,0,.16)",
      "c-regulation": "#1d3f99", "c-product": "#0a7ea4", "c-research": "#6b3fa0", "c-frontier": "#1f6f5c", "c-policy": "#6e6e73",
    },
    hero: {
      bg: "radial-gradient(120% 95% at 88% -5%, #12286b 0%, #081438 42%, #030716 100%)",
      text: "#f5f5f7", "text-2": "#c9d1e6", muted: "#8590ad", "accent-ink": "#a5bfff",
      line: "rgba(255,255,255,.12)", "line-2": "rgba(255,255,255,.2)", "bg-2": "rgba(255,255,255,.06)",
    },
  },
};
const PALETTE_NAME = process.env.PALETTE || null; // set after data is read
const vars = (o) => Object.entries(o).map(([k, v]) => `--${k}: ${v};`).join(" ");

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300..600&family=Newsreader:ital,opsz,wght@0,6..72,200..600;1,6..72,200..600&display=swap" rel="stylesheet">`;

const [, , storiesPath, outPath] = process.argv;
if (!storiesPath || !outPath) {
  console.error("Usage: node build_deck.js <stories.json> <output.html>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(storiesPath, "utf8"));
const stories = data.stories || [];
const weekOf = data.weekOf || new Date().toISOString().slice(0, 10);

if (stories.length < 1 || stories.length > 5) {
  console.error(
    `ERROR: expected between 1 and 5 stories (guardrail), got ${stories.length}. ` +
      `Edit ${storiesPath} and re-run.`
  );
  process.exit(1);
}

const palette = PALETTES[PALETTE_NAME || data.palette || "xyva"] || PALETTES.xyva;
const altMode = palette.mode === "light" ? "dark" : "light";
const paletteCSS = `
  :root { ${vars(palette[palette.mode])} }
  :root[data-theme="alt"] { ${vars(palette[altMode])} }
  .slide.title { background: ${palette.hero.bg}; ${vars(Object.fromEntries(Object.entries(palette.hero).filter(([k]) => k !== "bg")))} }
  .slide.title { color: var(--text); }
  .slide.title .chip { color: var(--text-2); }
  .slide.title .mark { background: var(--accent-ink); }`;

const briefs = (data.briefs || []).slice(0, 6);
const signals = (data.signals || []).slice(0, 3);
// glossary = every story's decoder terms + optional extra data.glossary, deduped by term
const glossary = [];
const seenTerms = new Set();
for (const t of [...stories.flatMap((s) => s.terms || []), ...(data.glossary || [])]) {
  const k = String(t.term || "").toLowerCase();
  if (!k || seenTerms.has(k)) continue;
  seenTerms.add(k);
  glossary.push(t);
}

// ---- jargon check ----------------------------------------------------------
// Flags acronyms and named models/scores (e.g. "Tyrer-Cuzick", "510(k)") that appear in
// slide text without a Decoder entry. Warnings only; fix them in stories.json.
const COMMON = new Set(
  ("AI ML LLM LLMs US USA UK EU FDA NIH CDC WHO MRI CT PET ECG EKG ED ICU OR GP RCT EHR EMR CE " +
   "NHS DNA RNA BMI HIV COVID ER H1 H2 Q1 Q2 Q3 Q4 II III IV I V AI-native").split(" ")
);
const termCovers = (terms, w) =>
  terms.some((t) => {
    const k = String(t.term || "").toLowerCase(), x = w.toLowerCase();
    return k.includes(x) || k.includes(x.replace(/s$/, ""));
  });
const jargonIn = (text) => {
  const found = new Set();
  const re = /\b(?:[A-Z][A-Za-z]*[A-Z0-9][A-Za-z0-9]*(?:\([a-z]\))?|\d{3}\([a-z]\)|[A-Z][a-z]+-[A-Z][a-z]+)\b/g;
  for (const m of String(text).matchAll(re)) if (!COMMON.has(m[0])) found.add(m[0]);
  return [...found];
};
const warnings = [];
const KNOWN_NAMES = new Set((data.knownNames || []).map((x) => x.toLowerCase()));
const check = (where, text, terms) => {
  for (const w of jargonIn(text))
    if (!termCovers(terms, w) && !KNOWN_NAMES.has(w.toLowerCase())) warnings.push(`${where}: "${w}"`);
};
stories.forEach((s, i) => {
  if (!s.dek) warnings.push(`story ${i + 1}: missing "dek" (plain-language intro: who did what, what the product is)`);
  const introduced = jargonIn(s.dek || "").map((w) => ({ term: w }));
  const text = [s.title, ...(s.bullets || []), s.why, s.question].join(" ");
  check(`story ${i + 1}`, text, [...(s.terms || []), ...introduced]); // must be explained on the same slide
});
briefs.forEach((b, i) => check(`brief ${i + 1}`, [b.title, b.note].join(" "), glossary));
signals.forEach((g, i) => check(`signal ${i + 1}`, [g.title, g.note, g.later].join(" "), glossary));

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// ---- date helpers ---------------------------------------------------------
const parseDate = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtShort = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const fmtDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return esc(s);
  return fmtShort(parseDate(s));
};
const isoWeek = (d) => {
  const t = new Date(d);
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
};

const start = parseDate(weekOf);
const end = new Date(start.getTime() + 6 * 86400000);
const weekNo = String(isoWeek(start)).padStart(2, "0");
const year = start.getUTCFullYear();
const range =
  start.getUTCMonth() === end.getUTCMonth()
    ? `${fmtShort(start)} – ${end.getUTCDate()}, ${end.getUTCFullYear()}`
    : `${fmtShort(start)} – ${fmtShort(end)}, ${end.getUTCFullYear()}`;

// ---- categories -----------------------------------------------------------
const CATS = ["regulation", "product", "research", "frontier", "policy"];
const catClass = (c) => {
  const k = String(c || "").toLowerCase();
  return CATS.includes(k) ? k : "frontier";
};
const pad = (n) => String(n).padStart(2, "0");
const total =
  stories.length + 2 + (briefs.length ? 1 : 0) + (signals.length ? 1 : 0) + (glossary.length ? 1 : 0);

// Evidence ladder, in terms clinicians already use to weigh claims
const EVIDENCE = [
  "Announcement / press",
  "Analysis or benchmark",
  "Retrospective study",
  "Prospective study",
  "RCT or regulatory clearance",
];

// ---- slides ---------------------------------------------------------------
const chrome = (n) => `
      <header class="bar">
        <div class="brand">${WORDMARK}</div>
        <div class="issue">Week ${weekNo} · ${year}</div>
      </header>
      <footer class="bar bottom">
        <div class="byline">by ${esc(AUTHOR)}</div>
        <div class="count"><b>${pad(n)}</b> / ${pad(total)}</div>
      </footer>`;

const agenda = stories
  .map(
    (s, i) => `
          <li>
            <span class="idx">${pad(i + 1)}</span>
            <span class="t">${esc(s.title)}</span>
            <span class="chip ${catClass(s.category)}">${esc(s.category || "Clinical AI")}</span>
          </li>`
  )
  .join("");

const extras = [
  briefs.length && `In brief · ${briefs.length}`,
  signals.length && `Weak signals · ${signals.length}`,
  glossary.length && `Decoder · ${glossary.length} ${glossary.length === 1 ? "term" : "terms"}`,
].filter(Boolean);

const lens = (s) => {
  const ev = s.evidence || {};
  const lvl = Math.min(Math.max(parseInt(ev.level, 10) || 0, 0), 5);
  const items = [];
  if (lvl)
    items.push(`
            <div class="lens-item">
              <span class="k">Evidence</span>
              <span class="v"><span class="meter" title="${esc(EVIDENCE[lvl - 1])}">${[1, 2, 3, 4, 5]
                .map((n) => `<i class="${n <= lvl ? "on" : ""}"></i>`)
                .join("")}</span>${esc(ev.label || EVIDENCE[lvl - 1])}${
      ev.detail ? `<span class="d"> · ${esc(ev.detail)}</span>` : ""
    }</span>
            </div>`);
  if (s.setting)
    items.push(`
            <div class="lens-item"><span class="k">Where in care</span><span class="v">${esc(s.setting)}</span></div>`);
  if (s.horizon)
    items.push(`
            <div class="lens-item"><span class="k">At the bedside</span><span class="v">${esc(s.horizon)}</span></div>`);
  return items.length ? `<div class="lens">${items.join("")}</div>` : "";
};

const decoder = (terms) =>
  terms && terms.length
    ? `
          <div class="decoder">
            <div class="label">Decoder</div>
            <dl>${terms
              .slice(0, 3)
              .map((t) => `<dt>${esc(t.term)}</dt><dd>${esc(t.def)}</dd>`)
              .join("")}</dl>
          </div>`
    : "";

const storySlides = stories.map((s, i) => {
  const bullets = (s.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("");
  return `
    <section class="slide story">
      ${chrome(i + 2)}
      <div class="story-grid">
        <aside class="meta">
          <div class="num">${pad(i + 1)}</div>
          <div class="meta-row">
            <span class="chip ${catClass(s.category)}">${esc(s.category || "Clinical AI")}</span>
            <div class="src">
              <div class="src-name">${esc(s.source)}</div>
              <div class="src-date">${fmtDate(s.date)}</div>
            </div>
          </div>
          <a class="read" href="${esc(s.url)}" target="_blank" rel="noopener">Read source <span>↗</span></a>
          ${decoder(s.terms)}
        </aside>
        <div class="body">
          <h2>${esc(s.title)}</h2>
          ${s.dek ? `<p class="dek">${esc(s.dek)}</p>` : ""}
          ${lens(s)}
          <ul class="bullets">${bullets}</ul>
          ${
            s.why || s.question
              ? `<div class="why">${
                  s.why ? `<div class="why-label">Why it matters for clinicians</div><p>${esc(s.why)}</p>` : ""
                }${
                  s.question
                    ? `<div class="q"><span class="why-label">Discuss</span><p>${esc(s.question)}</p></div>`
                    : ""
                }</div>`
              : ""
          }
        </div>
      </div>
    </section>`;
});

let n = stories.length + 1;
const extraSlides = [];
if (briefs.length)
  extraSlides.push(`
    <section class="slide section briefs">
      ${chrome(++n)}
      <div class="eyebrow">In brief</div>
      <h2 class="section-h">Also this week</h2>
      <ul class="brief-list">${briefs
        .map(
          (b) => `
        <li>
          <span class="chip ${catClass(b.category)}">${esc(b.category || "Clinical AI")}</span>
          <div class="bt"><a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>${
            b.note ? `<p>${esc(b.note)}</p>` : ""
          }</div>
          <span class="bs">${esc(b.source)} · ${fmtDate(b.date)}</span>
        </li>`
        )
        .join("")}
      </ul>
    </section>`);
if (signals.length)
  extraSlides.push(`
    <section class="slide section signals">
      ${chrome(++n)}
      <div class="eyebrow">Weak signals</div>
      <h2 class="section-h">Small today, <em>maybe big later</em></h2>
      <div class="cards">${signals
        .map(
          (g, j) => `
        <article class="card">
          <div class="idx">${pad(j + 1)}</div>
          <h3>${esc(g.title)}</h3>
          <p>${esc(g.note)}</p>
          ${g.later ? `<div class="later"><span class="why-label">Why it could matter</span><p>${esc(g.later)}</p></div>` : ""}
          <a class="card-src" href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.source)} · ${fmtDate(
            g.date
          )} ↗</a>
        </article>`
        )
        .join("")}
      </div>
    </section>`);
if (glossary.length)
  extraSlides.push(`
    <section class="slide section glossary">
      ${chrome(++n)}
      <div class="eyebrow">Decoder</div>
      <h2 class="section-h">This week's terms, <em>in plain language</em></h2>
      <dl class="gloss ${glossary.length > 6 ? "dense" : ""}">${glossary
        .map((t) => `<div><dt>${esc(t.term)}</dt><dd>${esc(t.def)}</dd></div>`)
        .join("")}
      </dl>
    </section>`);

const sourcesList = stories
  .map(
    (s, i) => `
          <li><span class="idx">${pad(i + 1)}</span><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(
            s.source
          )}</a><span class="d">${fmtDate(s.date)}</span></li>`
  )
  .join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="author" content="${esc(AUTHOR)}">
<title>Clinical AI Weekly · Week ${weekNo} · ${esc(range)}</title>
${FONTS}
<style>
  :root {
    --sans: "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
    --display: "Newsreader", "Iowan Old Style", Georgia, serif;
    --mono: var(--sans);
    --px: clamp(28px, 6.5vw, 120px);
  }
  ${paletteCSS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg); color: var(--text); font-family: var(--sans); font-weight: 400;
    -webkit-font-smoothing: antialiased; overflow: hidden;
  }
  body::before {
    content: ""; position: fixed; inset: 0; pointer-events: none;
    background:
      radial-gradient(55vw 55vh at 90% -10%, var(--glow), transparent 70%),
      radial-gradient(40vw 45vh at -5% 110%, var(--glow-2), transparent 70%);
  }
  body::after {
    content: ""; position: fixed; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 64px 64px;
    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 30%, transparent 85%);
            mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 30%, transparent 85%);
  }
  .slide, .progress, .hint { z-index: 1; }
  .slide { background: transparent; }
  .fit { width: 100%; }
  a { color: inherit; }

  /* ---------- slide frame ---------- */
  .slide {
    position: fixed; inset: 0; padding: 11vh var(--px);
    display: flex; flex-direction: column; justify-content: center;
    opacity: 0; visibility: hidden; transform: translateY(12px);
    transition: opacity .45s ease, transform .55s cubic-bezier(.2,.7,.2,1), visibility 0s .45s;
  }
  .slide.active {
    opacity: 1; visibility: visible; transform: none;
    transition: opacity .45s ease, transform .55s cubic-bezier(.2,.7,.2,1), visibility 0s;
  }
  .bar {
    position: absolute; left: var(--px); right: var(--px); top: 4.5vh;
    display: flex; justify-content: space-between; align-items: center;
    font-family: var(--mono); font-size: clamp(10px, .74vw, 12px); color: var(--muted);
    letter-spacing: .1em; text-transform: uppercase; font-weight: 500;
  }
  .bar.bottom { top: auto; bottom: 4.5vh; }
  .brand { display: flex; align-items: center; gap: .7em; color: var(--text-2); }
  .mark { width: .55em; height: .55em; border-radius: 50%; background: var(--accent); }
  .wm { font-family: var(--display); font-size: 1.55em; text-transform: none; letter-spacing: -.01em;
    color: var(--text); font-weight: 500; }
  .wm i { font-weight: 400; color: var(--text-2); }
  .issue, .count { font-variant-numeric: tabular-nums; }
  .count b { color: var(--text); font-weight: 400; }
  .byline { text-transform: none; letter-spacing: .02em; opacity: .7; }

  /* ---------- chips ---------- */
  .chip {
    --c: var(--c-frontier);
    display: inline-flex; align-items: center; gap: .6em;
    font-family: var(--mono); font-size: clamp(10px, .7vw, 11.5px); font-weight: 400; letter-spacing: .1em;
    text-transform: uppercase; color: var(--text-2);
    padding: .5em .9em; border-radius: 999px;
    border: 1px solid var(--line-2);
    background: color-mix(in srgb, var(--bg-2) 70%, transparent);
    white-space: nowrap;
  }
  .chip::before { content: ""; width: .55em; height: .55em; border-radius: 1px; background: var(--c); }
  .chip.regulation { --c: var(--c-regulation); } .chip.product { --c: var(--c-product); }
  .chip.research { --c: var(--c-research); } .chip.frontier { --c: var(--c-frontier); }
  .chip.policy { --c: var(--c-policy); }

  /* ---------- title ---------- */
  .eyebrow {
    font-family: var(--mono); font-size: clamp(10px, .75vw, 12.5px); font-weight: 400; letter-spacing: .28em;
    text-transform: uppercase; color: var(--accent-ink); margin-bottom: 3vh;
  }
  .title h1 {
    font-family: var(--display); font-weight: 300;
    font-size: clamp(48px, 7vw, 128px); line-height: 1; letter-spacing: -.025em;
  }
  .title h1 em { font-style: italic; color: var(--accent-ink); }
  .range { margin-top: 3vh; color: var(--muted); font-weight: 300; font-size: clamp(15px, 1.35vw, 22px); }
  .agenda { list-style: none; margin-top: 6vh; max-width: 1100px; border-top: 1px solid var(--line); }
  .agenda li {
    display: grid; grid-template-columns: 3.2em 1fr auto; align-items: center; gap: 1.2em;
    padding: 1.6vh 0; border-bottom: 1px solid var(--line);
    font-size: clamp(14px, 1.15vw, 19px); color: var(--text-2);
  }
  .idx { font-family: var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); font-size: .8em; }
  .agenda .t { color: var(--text); }

  /* ---------- story ---------- */
  .story-grid {
    display: grid; grid-template-columns: minmax(220px, 28%) 1fr; gap: 3.6vw;
    align-items: start; max-width: 1500px;
  }
  .meta { display: flex; flex-direction: column; align-items: flex-start; gap: 1.8vh; padding-top: .6vh; }
  .meta-row { display: flex; align-items: center; gap: 1.2vw; flex-wrap: wrap; }
  .num {
    font-family: var(--display); font-style: italic; font-weight: 300; line-height: .8;
    font-size: clamp(44px, 4.6vw, 88px); letter-spacing: -.02em;
    color: var(--accent-ink);
  }
  .src { border-left: 1px solid var(--line-2); padding-left: 1em; font-size: clamp(12px, .95vw, 15px); }
  .src-date { font-family: var(--mono); font-size: .85em; }
  .src-name { color: var(--text-2); font-weight: 400; }
  .src-date { color: var(--muted); margin-top: .3em; font-variant-numeric: tabular-nums; }
  .story h2 {
    font-family: var(--display); font-weight: 400;
    font-size: clamp(28px, 3.1vw, 56px); line-height: 1.06; letter-spacing: -.015em;
    max-width: 28ch; margin-bottom: 2.6vh; text-wrap: balance;
  }
  .bullets { list-style: none; max-width: 100%; counter-reset: b; }
  .bullets li {
    position: relative; padding-left: 1.6em; margin-bottom: 1.3vh;
    font-size: clamp(14px, 1.1vw, 19px); line-height: 1.55; color: var(--text-2); font-weight: 400;
    text-wrap: pretty;
  }
  .bullets li::before {
    content: ""; position: absolute; left: 0; top: .7em;
    width: .6em; height: 1px; background: var(--accent); top: .8em;
  }
  .why {
    margin-top: 2.4vh; max-width: 100%; padding: 2.4vh 1.6vw;
    border-radius: 14px; border: 1px solid var(--line); border-left: 3px solid var(--accent);
    background: var(--bg-2); box-shadow: var(--shadow);
    backdrop-filter: blur(6px);
  }
  .why-label {
    font-family: var(--mono); font-size: clamp(10px, .78vw, 13px); font-weight: 400; letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent-ink); margin-bottom: 1vh;
  }
  .why p { font-family: var(--display); font-style: italic; font-weight: 400; font-size: clamp(19px, 1.6vw, 28px); line-height: 1.4; letter-spacing: -.01em; line-height: 1.5; color: var(--text); }
  .read {
    display: inline-flex; gap: .5em; align-items: center;
    font-size: clamp(12px, .9vw, 14px); font-weight: 350; text-decoration: none;
    color: var(--text); padding: .65em 1.2em; border-radius: 999px; border: 1px solid var(--line-2);
    transition: color .2s, border-color .2s, background .2s;
  }
  .read:hover { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }

  .extras { margin-top: 2.4vh; display: flex; gap: 2em; font-family: var(--mono);
    font-size: clamp(10px, .75vw, 12.5px); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .extras span::before { content: "+ "; color: var(--accent-ink); }

  .dek {
    max-width: 100%; margin: -.6vh 0 2.6vh; font-weight: 400; color: var(--text-2); color: var(--text);
    font-size: clamp(15px, 1.22vw, 21px); line-height: 1.5; text-wrap: pretty;
  }

  /* ---------- clinical lens ---------- */
  .lens {
    display: flex; flex-wrap: wrap; gap: 1.2vh 3vw; margin-bottom: 3.2vh;
    padding: 1.4vh 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    max-width: 100%;
  }
  .lens-item { display: flex; flex-direction: column; gap: .5vh; }
  .lens .k { font-family: var(--mono); font-size: clamp(9px, .64vw, 11px); letter-spacing: .14em;
    text-transform: uppercase; color: var(--muted); }
  .lens .v { display: flex; align-items: center; gap: .7em; font-size: clamp(13px, .98vw, 16px); color: var(--text); }
  .lens .v .d { color: var(--muted); }
  .meter { display: inline-flex; gap: 3px; }
  .meter i { width: 12px; height: 4px; background: var(--line-2); }
  .meter i.on { background: var(--accent); }
  .q { margin-top: 1.6vh; padding-top: 1.6vh; border-top: 1px solid var(--line); }
  .q .why-label { display: block; color: var(--muted); }
  .why .q p { font-family: var(--sans); font-style: normal; font-size: clamp(14px, 1.08vw, 18px); line-height: 1.5; color: var(--text-2); }

  /* ---------- decoder (story sidebar) ---------- */
  .decoder {
    margin-top: 1vh; padding: 2.2vh 1.3vw .6vh; width: 100%;
    border: 1px solid var(--line); border-top: 2px solid var(--accent); border-radius: 14px;
    background: var(--bg-2); box-shadow: var(--shadow);
  }
  .decoder .label, .gloss-label { font-family: var(--mono); font-size: clamp(9px, .64vw, 11px); letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent-ink); margin-bottom: 1.6vh; }
  .decoder dt { font-family: var(--display); font-size: clamp(16px, 1.25vw, 21px); color: var(--text); font-weight: 500; }
  .decoder dd { font-size: clamp(13px, .98vw, 16.5px); color: var(--text-2); line-height: 1.5; margin: .35em 0 1.8vh; font-weight: 300; }

  /* ---------- section slides ---------- */
  .section-h {
    font-family: var(--display); font-weight: 300; font-size: clamp(36px, 4.2vw, 76px);
    line-height: 1.02; letter-spacing: -.02em; margin-bottom: 5vh;
  }
  .section-h em { font-style: italic; color: var(--accent-ink); }
  .brief-list { list-style: none; border-top: 1px solid var(--line); max-width: 1300px; }
  .brief-list li {
    display: grid; grid-template-columns: 9.5em 1fr auto; gap: 2vw; align-items: baseline;
    padding: 1.8vh 0; border-bottom: 1px solid var(--line);
  }
  .brief-list .chip { justify-self: start; }
  .brief-list .bt a { text-decoration: none; color: var(--text); font-size: clamp(14px, 1.15vw, 19px); }
  .brief-list .bt a:hover { color: var(--accent-ink); }
  .brief-list .bt p { color: var(--muted); font-size: clamp(12px, .9vw, 15px); margin-top: .35em; font-weight: 300; }
  .bs { font-family: var(--mono); font-size: clamp(10px, .72vw, 12px); color: var(--muted); white-space: nowrap; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.6vw; max-width: 1400px; }
  .card {
    display: flex; flex-direction: column; gap: 1.6vh; padding: 3vh 1.8vw;
    border: 1px solid var(--line); border-radius: 18px;
    background: var(--bg-2); box-shadow: var(--shadow);
  }
  .card h3 { font-family: var(--display); font-weight: 400; font-size: clamp(17px, 1.45vw, 24px); line-height: 1.25; letter-spacing: -.02em; }
  .card p { color: var(--text-2); font-weight: 400; font-size: clamp(13px, .98vw, 16px); line-height: 1.55; }
  .card .later { padding-top: 1.4vh; border-top: 1px solid var(--line); }
  .card .later .why-label { display: block; color: var(--c-research); }
  .card-src { margin-top: auto; font-family: var(--mono); font-size: clamp(10px, .72vw, 12px);
    color: var(--muted); text-decoration: none; }
  .card-src:hover { color: var(--accent-ink); }
  .gloss { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.4vh 3vw; max-width: 1400px; }
  .gloss.dense { grid-template-columns: repeat(4, 1fr); gap: 2.6vh 2.4vw; }
  .gloss div { border-top: 1px solid var(--line-2); padding-top: 1.6vh; }
  .gloss dt { font-family: var(--display); font-size: clamp(18px, 1.4vw, 24px); font-weight: 500; margin-bottom: .6vh; }
  .gloss dd { color: var(--text-2); font-weight: 400; font-size: clamp(12px, .95vw, 16px); line-height: 1.55; }

  /* ---------- outro ---------- */
  .sources { list-style: none; margin-top: 6vh; max-width: 900px; border-top: 1px solid var(--line); }
  .sources li {
    display: grid; grid-template-columns: 3.2em 1fr auto; gap: 1.2em; align-items: center;
    padding: 1.4vh 0; border-bottom: 1px solid var(--line); font-size: clamp(13px, 1.05vw, 17px);
  }
  .sources a { color: var(--text-2); text-decoration: none; }
  .sources a:hover { color: var(--accent-ink); }
  .sources .d { font-family: var(--mono); font-size: .85em; color: var(--muted); font-variant-numeric: tabular-nums; }

  /* ---------- progress ---------- */
  .progress {
    position: fixed; left: 50%; bottom: 4.5vh; transform: translateX(-50%) translateY(50%);
    display: flex; gap: 6px; z-index: 5;
  }
  .progress i {
    width: 18px; height: 2px; border-radius: 0; background: var(--line-2);
    transition: background .3s, width .3s;
  }
  .progress i.on { background: var(--accent); width: 32px; }
  .hint {
    position: fixed; right: var(--px); bottom: 8.5vh; font-family: var(--mono); font-size: 11px; color: var(--muted);
    opacity: 0; transition: opacity .6s; pointer-events: none;
  }
  .hint.show { opacity: .8; }
  kbd {
    font-family: var(--mono); font-size: 11px; padding: 1px 6px; border-radius: 4px;
    border: 1px solid var(--line-2); color: var(--text-2);
  }

  @media (max-width: 820px) {
    .gloss, .gloss.dense { grid-template-columns: 1fr 1fr; }
    .brief-list li { grid-template-columns: 1fr; }
    .story-grid { grid-template-columns: 1fr; gap: 3vh; }
    .meta { flex-direction: row; align-items: center; flex-wrap: wrap; }
    .num { font-size: 56px; }
    .agenda li { grid-template-columns: 2.4em 1fr; }
    .agenda .chip { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .slide { transition: none; transform: none; }
  }
  @media print {
    @page { size: 1600px 900px; margin: 0; }
    body { overflow: visible; }
    .slide { position: relative; opacity: 1; visibility: visible; transform: none;
             width: 1600px; height: 900px; page-break-after: always; }
    .progress, .hint { display: none; }
  }
</style>
</head>
<body>
<main class="deck">
  <section class="slide title active">
    ${chrome(1)}
    <div class="eyebrow">Weekly team update</div>
    <h1>This week in<br><em>clinical</em> AI</h1>
    <div class="range">${esc(range)} · ${stories.length} ${stories.length === 1 ? "story" : "stories"}</div>
    <ol class="agenda">${agenda}
    </ol>
    ${
      extras.length
        ? `<div class="extras">${extras.map((x) => `<span>${x}</span>`).join("")}</div>`
        : ""
    }
  </section>
  ${storySlides.join("")}
  ${extraSlides.join("")}
  <section class="slide title outro">
    ${chrome(total)}
    <div class="eyebrow">That's the week</div>
    <h1>Questions &amp;<br><em>discussion</em></h1>
    <ul class="sources">${sourcesList}
    </ul>
  </section>
</main>
<nav class="progress" id="progress" aria-hidden="true"></nav>
<div class="hint" id="hint"><kbd>←</kbd> <kbd>→</kbd> navigate · <kbd>F</kbd> fullscreen · <kbd>T</kbd> theme</div>
<script>
  const slides = [...document.querySelectorAll(".slide")];
  // wrap each slide's content so it can be scaled down if it would overflow
  slides.forEach((sl) => {
    const fit = document.createElement("div");
    fit.className = "fit";
    [...sl.children].filter((c) => !c.classList.contains("bar")).forEach((c) => fit.appendChild(c));
    sl.appendChild(fit);
  });
  const fitAll = () =>
    slides.forEach((sl) => {
      const fit = sl.querySelector(".fit");
      fit.style.zoom = 1;
      const cs = getComputedStyle(sl);
      const avail = sl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const h = fit.scrollHeight;
      if (h > avail) fit.style.zoom = Math.max(avail / h, 0.6).toFixed(3);
    });
  fitAll();
  document.fonts?.ready.then(fitAll);
  addEventListener("resize", fitAll);
  const prog = document.getElementById("progress");
  prog.innerHTML = slides.map(() => "<i></i>").join("");
  const dots = [...prog.children];
  const root = document.documentElement;
  const saved = localStorage.getItem("caiw-theme");
  if (saved === "alt") root.dataset.theme = "alt";

  let i = Math.min(Math.max(parseInt(location.hash.slice(1), 10) - 1 || 0, 0), slides.length - 1);
  const show = () => {
    slides.forEach((s, j) => s.classList.toggle("active", i === j));
    dots.forEach((d, j) => d.classList.toggle("on", j === i));
    history.replaceState(null, "", "#" + (i + 1));
  };
  const go = (n) => { i = Math.min(Math.max(n, 0), slides.length - 1); show(); };
  document.addEventListener("keydown", (e) => {
    if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(e.key)) { e.preventDefault(); go(i + 1); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); go(i - 1); }
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(slides.length - 1);
    else if (e.key === "f") document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.();
    else if (e.key === "t") {
      if (root.dataset.theme === "alt") delete root.dataset.theme; else root.dataset.theme = "alt";
      localStorage.setItem("caiw-theme", root.dataset.theme || "default");
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    go(e.clientX < innerWidth * 0.25 ? i - 1 : i + 1);
  });
  let tx = null;
  addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), { passive: true });
  addEventListener("touchend", (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    tx = null;
  });
  const hint = document.getElementById("hint");
  hint.classList.add("show");
  setTimeout(() => hint.classList.remove("show"), 3500);
  show();
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);
console.log(`Wrote ${outPath} (${stories.length} stories, week ${weekNo} of ${year})`);
// ---- archive index (repo root index.html, used by GitHub Pages) -----------
{
  const deckDir = path.dirname(path.resolve(outPath));
  const rel = path.relative(__dirname, deckDir) || ".";
  const files = fs
    .readdirSync(deckDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.html$/.test(f))
    .sort()
    .reverse();
  const rows = files
    .map((f, i) => {
      const iso = f.slice(0, 10);
      const d0 = parseDate(iso), d1 = new Date(d0.getTime() + 6 * 86400000);
      const html0 = fs.readFileSync(path.join(deckDir, f), "utf8");
      const heads = [...html0.matchAll(/<li>\s*<span class="idx">\d+<\/span>\s*<span class="t">([^<]*)<\/span>/g)]
        .map((m) => m[1]).slice(0, 3);
      return `
      <a class="row${i === 0 ? " latest" : ""}" href="${rel}/${f}">
        <span class="wk">Week ${String(isoWeek(d0)).padStart(2, "0")}</span>
        <span class="dt">${fmtShort(d0)} – ${fmtShort(d1)}, ${d1.getUTCFullYear()}</span>
        <span class="hd">${heads.map((h) => `<span>${h}</span>`).join("")}</span>
        <span class="go">${i === 0 ? "Latest ↗" : "↗"}</span>
      </a>`;
    })
    .join("");
  const index = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clinical AI Weekly · Archive</title>
${FONTS}
<style>
  :root { ${vars(palette[palette.mode])}
    --display:"Newsreader", "Iowan Old Style", Georgia, serif; --sans:"Inter", -apple-system, "Helvetica Neue", Arial, sans-serif; }
  .hero { margin: -6vh calc(-1 * clamp(24px, 8vw, 140px)) 0; padding: 6vh clamp(24px, 8vw, 140px) 9vh;
    background: ${palette.hero.bg}; ${vars(Object.fromEntries(Object.entries(palette.hero).filter(([k]) => k !== "bg")))} color: var(--text); }
  .hero .mark { background: var(--accent-ink); }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:var(--sans); -webkit-font-smoothing:antialiased;
    padding:6vh clamp(24px, 8vw, 140px); min-height:100vh; }
  header { display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:500;
    letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
  .brand { display:flex; align-items:center; gap:.7em; }
  .mark { width:9px; height:9px; border-radius:50%; background:var(--accent); }
  .wm { font-family:var(--display); font-size:20px; font-weight:500; letter-spacing:-.01em; text-transform:none; color:var(--text); }
  .wm i { font-weight:400; color:var(--text-2); }
  .eyebrow { margin-top:12vh; font-size:12px; font-weight:500; letter-spacing:.16em; text-transform:uppercase; color:var(--accent-ink); }
  h1 { font-family:var(--display); font-weight:300; font-size:clamp(48px, 6.6vw, 112px); letter-spacing:-.025em; line-height:1; margin:2.4vh 0 2.4vh; }
  h1 em { font-style:italic; color:var(--accent-ink); }
  .lede { color:var(--text-2); font-weight:300; font-size:clamp(17px, 1.35vw, 22px); max-width:52ch; line-height:1.45; }
  .list { margin-top:6vh; border-top:1px solid var(--line-2); }
  .row { display:grid; grid-template-columns:7em 12em 1fr auto; gap:2vw; align-items:baseline; padding:2.4vh 0;
    border-bottom:1px solid var(--line); text-decoration:none; color:var(--text-2); transition:background .2s; }
  .row { border-radius:12px; padding-left:1vw; padding-right:1vw; }
  .row:hover { background:var(--bg-2); box-shadow:var(--shadow); }
  .wk, .dt, .go { font-size:12px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
  .wk { color:var(--text); }
  .latest .wk, .latest .go { color:var(--accent); }
  .hd { display:flex; flex-direction:column; gap:.35em; font-family:var(--display); font-size:clamp(17px, 1.3vw, 21px); color:var(--text); }
  footer { margin-top:10vh; font-size:12px; color:var(--muted); }
  @media (max-width:760px) { .row { grid-template-columns:1fr; gap:.6em; } }
</style></head><body>
<section class="hero">
<header><div class="brand">${WORDMARK}</div><div>Archive</div></header>
<div class="eyebrow">Weekly team update</div>
<h1>This week in<br><em>clinical</em> AI</h1>
<p class="lede">A short weekly briefing on clinical and healthcare AI news, written for clinicians: what happened, how strong the evidence is, and what it means at the bedside.</p>
</section>
<nav class="list">${rows}
</nav>
<footer>by ${esc(AUTHOR)}</footer>
</body></html>
`;
  fs.writeFileSync(path.join(__dirname, "index.html"), index);
}

if (warnings.length) {
  console.warn(
    `\nJARGON CHECK: ${warnings.length} term(s) without a Decoder entry. For each, either add it to ` +
      `that story's "terms" (or "glossary" for briefs/signals), rewrite it in plain language, or, if it ` +
      `is just a company/product name explained in context, add it to "knownNames":`
  );
  for (const w of warnings) console.warn("  - " + w);
}
