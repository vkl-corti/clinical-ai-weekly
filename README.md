# ai-weekly

Weekly "This Week in Clinical AI" slide deck generator for the clinical innovation team.

## Usage
Run `ai-weekly` (or `/ai-weekly`) in Claude Code the day before your team meeting.
It searches the last 7 days of clinical/healthcare AI news, picks 2-5 stories,
and builds a presentable HTML deck at `decks/<week>.html`.

## Presenting
- Arrow keys / space to advance
- `f` for fullscreen
- Each story slide links its source

## Files
- `build_deck.js` — renders the deck from `stories.json` (enforces 1-5 story guardrail)
- `stories.json` — this week's selected stories (regenerated each run)
- `covered.json` — stories covered in past weeks, so no repeats
- `decks/` — generated decks, one per week

## Notes
- The skill lives at `~/.claude/skills/ai-weekly/SKILL.md` so it works from any directory.
- Runs through Claude Code's web search — no API keys or build tooling needed.
