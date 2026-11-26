#!/usr/bin/env node
// build_deck.js — render "This Week in Clinical AI" HTML deck from stories.json
// Usage: node build_deck.js <stories.json> <output.html>

const fs = require("fs");
const path = require("path");

const AUTHOR = "V. Klungtvedt";
const ASSETS = path.join(__dirname, "assets");
const FONT_B64 = fs.readFileSync(path.join(ASSETS, "BootonUprightVF.woff2")).toString("base64");
const LOGO = fs
  .readFileSync(path.join(ASSETS, "corti-logo-white.svg"), "utf8")
  .replace(/<\?xml[^>]*>/, "")
  .replace(/<g clip-path="[^"]*">/, "<g>")
  .replace(/<defs>[\s\S]*?<\/defs>/, "")
  .replace(/fill="white"/g, 'fill="currentColor"')
  .replace(/<svg /, '<svg class="logo" aria-label="Corti" ');

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
        <div class="brand">${LOGO}<span class="sep"></span>Clinical AI Weekly</div>
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
          <span class="chip ${catClass(s.category)}">${esc(s.category || "Clinical AI")}</span>
          <div class="src">
            <div class="src-name">${esc(s.source)}</div>
            <div class="src-date">${fmtDate(s.date)}</div>
          </div>
          <a class="read" href="${esc(s.url)}" target="_blank" rel="noopener">Read source <span>↗</span></a>
          ${decoder(s.terms)}
        </aside>
        <div class="body">
          <h2>${esc(s.title)}</h2>
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  @font-face {
    font-family: Booton; font-weight: 100 900; font-display: swap;
    src: url(data:font/woff2;base64,${FONT_B64}) format("woff2");
  }
  :root {
    /* Corti design language (corti.ai) */
    --bg: #08090a;
    --bg-2: #141414;
    --line: #292b2e;
    --line-2: #3b3e43;
    --grid: rgba(255,255,255,.03);
    --text: #fafafa;
    --text-2: #c1c1c1;
    --muted: #868686;
    --accent: #b8f818;        /* Corti lime */
    --accent-ink: #b8f818;    /* lime used as text */
    --on-accent: #08090a;
    --pink: #fd3db5;
    --glow: rgba(184,248,24,.07);
    --glow-2: rgba(253,61,181,.05);
    --c-regulation: #b8f818; --c-product: #fafafa; --c-research: #fd3db5;
    --c-frontier: #b8f818; --c-policy: #c1c1c1;
    --sans: Booton, "Helvetica Neue", Arial, sans-serif;
    --display: Booton, "Helvetica Neue", Arial, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
    --px: clamp(28px, 6.5vw, 120px);
  }
  :root[data-theme="light"] {
    --bg: #fafafa; --bg-2: #ffffff;
    --line: #e4e4e4; --line-2: #cfcfcf; --grid: rgba(8,9,10,.035);
    --text: #08090a; --text-2: #3d3d3d; --muted: #868686;
    --accent: #b8f818; --accent-ink: #4d7c0f; --on-accent: #08090a;
    --glow: rgba(184,248,24,.18); --glow-2: rgba(253,61,181,.06);
    --c-regulation: #4d7c0f; --c-product: #08090a; --c-research: #d61f93;
    --c-frontier: #4d7c0f; --c-policy: #5a5a5a;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg); color: var(--text); font-family: var(--sans); font-weight: 350;
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
    font-family: var(--mono); font-size: clamp(10px, .78vw, 13px); color: var(--muted);
    letter-spacing: .04em; text-transform: uppercase;
  }
  .bar.bottom { top: auto; bottom: 4.5vh; }
  .brand { display: flex; align-items: center; gap: 1em; color: var(--text-2); }
  .logo { height: 1.9em; width: auto; color: var(--text); display: block; }
  .sep { width: 1px; height: 1.3em; background: var(--line-2); }
  .issue, .count { font-variant-numeric: tabular-nums; }
  .count b { color: var(--text); font-weight: 400; }
  .byline { text-transform: none; letter-spacing: .02em; opacity: .7; }

  /* ---------- chips ---------- */
  .chip {
    --c: var(--c-frontier);
    display: inline-flex; align-items: center; gap: .6em;
    font-family: var(--mono); font-size: clamp(10px, .7vw, 11.5px); font-weight: 400; letter-spacing: .1em;
    text-transform: uppercase; color: var(--text-2);
    padding: .5em .8em; border-radius: 4px;
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
    font-family: var(--mono); font-size: clamp(10px, .75vw, 12.5px); font-weight: 400; letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent-ink); margin-bottom: 3vh;
  }
  .title h1 {
    font-family: var(--display); font-weight: 250;
    font-size: clamp(44px, 6.6vw, 120px); line-height: 1.02; letter-spacing: -.045em;
  }
  .title h1 em { font-style: normal; color: var(--accent-ink); }
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
    display: grid; grid-template-columns: minmax(180px, 21%) 1fr; gap: 4vw;
    align-items: start; max-width: 1500px;
  }
  .meta { display: flex; flex-direction: column; align-items: flex-start; gap: 2vh; padding-top: .6vh; }
  .num {
    font-family: var(--display); font-weight: 150; line-height: .8;
    font-size: clamp(48px, 5.5vw, 104px); letter-spacing: -.05em;
    color: var(--accent-ink);
  }
  .src { border-left: 1px solid var(--line-2); padding-left: 1em; font-size: clamp(12px, .95vw, 15px); }
  .src-date { font-family: var(--mono); font-size: .85em; }
  .src-name { color: var(--text-2); font-weight: 400; }
  .src-date { color: var(--muted); margin-top: .3em; font-variant-numeric: tabular-nums; }
  .story h2 {
    font-family: var(--display); font-weight: 300;
    font-size: clamp(26px, 2.9vw, 52px); line-height: 1.1; letter-spacing: -.035em;
    max-width: 28ch; margin-bottom: 2.6vh; text-wrap: balance;
  }
  .bullets { list-style: none; max-width: 72ch; counter-reset: b; }
  .bullets li {
    position: relative; padding-left: 1.6em; margin-bottom: 1.3vh;
    font-size: clamp(15px, 1.18vw, 20px); line-height: 1.6; color: var(--text-2); font-weight: 300;
    text-wrap: pretty;
  }
  .bullets li::before {
    content: ""; position: absolute; left: 0; top: .7em;
    width: .6em; height: 1px; background: var(--accent); top: .8em;
  }
  .why {
    margin-top: 2.4vh; max-width: 72ch; padding: 1.8vh 1.4vw;
    border-radius: 6px; border: 1px solid var(--line); border-left: 1px solid var(--accent);
    background: linear-gradient(180deg, color-mix(in srgb, var(--bg-2) 80%, transparent), transparent);
    backdrop-filter: blur(6px);
  }
  .why-label {
    font-family: var(--mono); font-size: clamp(10px, .68vw, 11.5px); font-weight: 400; letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent-ink); margin-bottom: .8vh;
  }
  .why p { font-weight: 300; font-size: clamp(14px, 1.08vw, 18px); line-height: 1.5; color: var(--text); }
  .read {
    display: inline-flex; gap: .5em; align-items: center;
    font-size: clamp(12px, .9vw, 14px); font-weight: 350; text-decoration: none;
    color: var(--text); padding: .65em 1.1em; border-radius: 8px; border: 1px solid var(--line-2);
    transition: color .2s, border-color .2s, background .2s;
  }
  .read:hover { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }

  .extras { margin-top: 2.4vh; display: flex; gap: 2em; font-family: var(--mono);
    font-size: clamp(10px, .75vw, 12.5px); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .extras span::before { content: "+ "; color: var(--accent-ink); }

  /* ---------- clinical lens ---------- */
  .lens {
    display: flex; flex-wrap: wrap; gap: 1.2vh 3vw; margin-bottom: 3.2vh;
    padding: 1.4vh 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    max-width: 72ch;
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

  /* ---------- decoder (story sidebar) ---------- */
  .decoder { margin-top: 1.2vh; padding-top: 2.2vh; border-top: 1px solid var(--line); width: 100%; }
  .decoder .label, .gloss-label { font-family: var(--mono); font-size: clamp(9px, .64vw, 11px); letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent-ink); margin-bottom: 1.4vh; }
  .decoder dt { font-size: clamp(12px, .9vw, 15px); color: var(--text); font-weight: 400; }
  .decoder dd { font-size: clamp(11px, .8vw, 13.5px); color: var(--muted); line-height: 1.5; margin: .3em 0 1.4vh; font-weight: 300; }

  /* ---------- section slides ---------- */
  .section-h {
    font-family: var(--display); font-weight: 250; font-size: clamp(32px, 3.8vw, 68px);
    line-height: 1.05; letter-spacing: -.04em; margin-bottom: 5vh;
  }
  .section-h em { font-style: normal; color: var(--accent-ink); }
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
    border: 1px solid var(--line); border-radius: 6px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--bg-2) 80%, transparent), transparent);
  }
  .card h3 { font-weight: 350; font-size: clamp(17px, 1.45vw, 24px); line-height: 1.25; letter-spacing: -.02em; }
  .card p { color: var(--text-2); font-weight: 300; font-size: clamp(13px, .98vw, 16px); line-height: 1.55; }
  .card .later { padding-top: 1.4vh; border-top: 1px solid var(--line); }
  .card .later .why-label { display: block; color: var(--c-research); }
  .card-src { margin-top: auto; font-family: var(--mono); font-size: clamp(10px, .72vw, 12px);
    color: var(--muted); text-decoration: none; }
  .card-src:hover { color: var(--accent-ink); }
  .gloss { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.4vh 3vw; max-width: 1400px; }
  .gloss.dense { grid-template-columns: repeat(4, 1fr); gap: 2.6vh 2.4vw; }
  .gloss div { border-top: 1px solid var(--line-2); padding-top: 1.6vh; }
  .gloss dt { font-size: clamp(15px, 1.2vw, 20px); font-weight: 400; margin-bottom: .6vh; }
  .gloss dd { color: var(--text-2); font-weight: 300; font-size: clamp(12px, .95vw, 16px); line-height: 1.55; }

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
  const prog = document.getElementById("progress");
  prog.innerHTML = slides.map(() => "<i></i>").join("");
  const dots = [...prog.children];
  const root = document.documentElement;
  const saved = localStorage.getItem("caiw-theme");
  if (saved) root.dataset.theme = saved;
  else if (matchMedia("(prefers-color-scheme: light)").matches) root.dataset.theme = "light";

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
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      localStorage.setItem("caiw-theme", root.dataset.theme);
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
