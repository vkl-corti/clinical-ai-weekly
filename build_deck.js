#!/usr/bin/env node
// build_deck.js — render "This Week in Clinical AI" HTML deck from stories.json
// Usage: node build_deck.js <stories.json> <output.html>

const fs = require("fs");
const path = require("path");

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

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const slides = stories.map((s, i) => {
  const bullets = (s.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("");
  return `
    <section class="slide story">
      <div class="story-kicker">Story ${i + 1} of ${stories.length} · ${esc(
        s.category || "Clinical AI"
      )}</div>
      <h2>${esc(s.title)}</h2>
      <ul class="bullets">${bullets}</ul>
      ${s.why ? `<p class="why"><span>Why it matters:</span> ${esc(s.why)}</p>` : ""}
      <a class="source" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(
        s.source
      )} · ${esc(s.date)} →</a>
    </section>`;
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>This Week in Clinical AI — ${esc(weekOf)}</title>
<style>
  :root {
    --bg: #0e1420; --surface: #16202f; --text: #eef3f8; --muted: #9db0c4;
    --accent: #4fd1c5; --accent-warm: #f6ad55;
  }
  @media (prefers-color-scheme: light) {
    :root { --bg: #f7f9fb; --surface: #ffffff; --text: #14202e; --muted: #5a6b7d; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg); color: var(--text);
    font-family: "SF Pro Display", -apple-system, "Segoe UI", Roboto, sans-serif;
    overflow: hidden;
  }
  .deck { height: 100vh; position: relative; }
  .slide {
    display: none; height: 100vh; padding: 8vh 10vw;
    flex-direction: column; justify-content: center;
  }
  .slide.active { display: flex; }
  .title-slide .kicker {
    color: var(--accent); font-size: clamp(14px, 1.4vw, 20px);
    font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase;
    margin-bottom: 2.5vh;
  }
  .title-slide h1 { font-size: clamp(40px, 6.5vw, 96px); line-height: 1.05; font-weight: 800; }
  .title-slide .date { color: var(--muted); font-size: clamp(18px, 2vw, 28px); margin-top: 3vh; }
  .title-slide .teasers { margin-top: 5vh; color: var(--muted); line-height: 1.9; font-size: clamp(14px, 1.3vw, 19px); }
  .title-slide .teasers li { list-style: none; padding-left: 1.4em; position: relative; }
  .title-slide .teasers li::before { content: "→"; position: absolute; left: 0; color: var(--accent); }
  .story-kicker {
    color: var(--accent); font-weight: 700; font-size: clamp(12px, 1.1vw, 16px);
    letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 2.5vh;
  }
  .story h2 { font-size: clamp(28px, 4vw, 60px); line-height: 1.1; font-weight: 800; margin-bottom: 4vh; max-width: 24ch; }
  .bullets { list-style: none; max-width: 62ch; }
  .bullets li {
    font-size: clamp(16px, 1.7vw, 26px); line-height: 1.5; margin-bottom: 1.8vh;
    padding-left: 1.5em; position: relative; color: var(--text);
  }
  .bullets li::before { content: "▪"; position: absolute; left: 0; color: var(--accent-warm); }
  .why { margin-top: 2.5vh; max-width: 62ch; font-size: clamp(15px, 1.5vw, 22px); line-height: 1.55; }
  .why span { color: var(--accent-warm); font-weight: 700; }
  .source {
    position: absolute; bottom: 5vh; left: 10vw;
    color: var(--muted); text-decoration: none; font-size: clamp(13px, 1.1vw, 17px);
    border-bottom: 1px solid transparent; transition: color .15s;
  }
  .source:hover { color: var(--accent); }
  .hud {
    position: fixed; bottom: 2.5vh; right: 3vw; color: var(--muted);
    font-size: 14px; font-variant-numeric: tabular-nums; user-select: none;
  }
  .progress { position: fixed; top: 0; left: 0; height: 4px; background: var(--accent); transition: width .25s; }
</style>
</head>
<body>
<div class="deck">
  <div class="progress" id="progress"></div>
  <section class="slide title-slide active">
    <div class="kicker">Weekly team update</div>
    <h1>This Week in<br>Clinical&nbsp;AI</h1>
    <div class="date">Week of ${esc(weekOf)}</div>
    <ul class="teasers">
      ${stories.map((s) => `<li>${esc(s.title)}</li>`).join("")}
    </ul>
  </section>
  ${slides.join("")}
  <section class="slide title-slide">
    <div class="kicker">That's the week</div>
    <h1>Questions?<br>Discussion 🩺</h1>
    <div class="date">Sources linked on each slide · deck generated ${esc(weekOf)}</div>
  </section>
</div>
<div class="hud" id="hud"></div>
<script>
  const slides = [...document.querySelectorAll(".slide")];
  let i = 0;
  const show = () => {
    slides.forEach((s, j) => s.classList.toggle("active", i === j));
    document.getElementById("hud").textContent = (i + 1) + " / " + slides.length;
    document.getElementById("progress").style.width =
      ((i + 1) / slides.length * 100) + "%";
  };
  const next = () => { i = Math.min(i + 1, slides.length - 1); show(); };
  const prev = () => { i = Math.max(i - 1, 0); show(); };
  document.addEventListener("keydown", (e) => {
    if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(e.key)) { e.preventDefault(); next(); }
    if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
    if (e.key === "Home") { i = 0; show(); }
    if (e.key === "End") { i = slides.length - 1; show(); }
    if (e.key === "f") { document.documentElement.requestFullscreen?.(); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("a")) next(); });
  show();
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);
console.log(`Wrote ${outPath} (${stories.length} stories, week of ${weekOf})`);
