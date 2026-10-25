# PRD: Enrich

## What it does

One chord, `ctrl+x r`, sends the draft in the prompt box to a model for a rewrite. The model is Sonnet 5.5 by default. The rewrite replaces the draft in the box. The same chord on the untouched result puts the original back.

## Rules

- Each press makes one model call, with a 30-second timeout. Three settings shape the call: `model` (default `claude-sonnet-5-5`), `effort` (default `low`) and `instructions`.
- `instructions` says how to rewrite. By default the model fixes spelling and grammar, makes the ask explicit, lists separate asks, and adds nothing the draft doesn't say. If the field is empty, the plugin uses the default.
- Fixed text around the instructions tells the model to never answer the draft, to keep @mentions, paths, code, URLs and placeholders verbatim, and to reply with the rewritten prompt only. No setting changes this text, so custom instructions can't make the model answer the draft or add commentary.
- While the call runs, the hint line shows `✦ Claude is enriching…`, with a highlight in Claude's accent color sweeping across it. The highlight's timer runs only during the call.
- The draft stays in the box while the call runs. The plugin fills the box with the result only if the box still holds the exact text it sent.
- An error leaves the draft alone and shows a toast.
- The chord ignores empty drafts, slash commands and `!` lines.

## Constraint

Plugins can't register keybinding actions. A chord reaches a plugin from the prompt only through a Button whose `action` names an engine action. The Button sits in the hint line under the prompt and borrows `diff:back`, whose only handler is in the modal diff dialog. The person binds `"ctrl+x r": "diff:back"` and `"ctrl+x ctrl+r": "diff:back"` in the Chat context once, so the chord works whether or not ctrl is still held for the second key. Recheck this on each Claude Code update.

## Decision log

| Date | Decision |
|---|---|
| 2026-10-11 to 2026-10-12 | PRD v0.1 to v0.3, plugin 0.2.0. First a review card, then two chords: a quick pass, and a deep pass that interviewed the person and wrote a six-section prompt. The plugin also had house style, a verbatim check, `/enrich` commands and seven settings. |
| 2026-10-24 | The person said, "I think it's massively overcomplicated right now. Let's go back to the drawing board." Plugin 0.3.0 keeps one chord and one call to Sonnet 5.5, plus same-chord undo. The deep pass, interview, house style, verbatim check, `/enrich` commands, key installer and settings are gone. The earlier design is in git history. |
| 2026-10-24 | The person asked for a shimmering message while the call runs, worded "Claude is enriching", and for `model` and `effort` settings that default to Sonnet 5.5 at low effort. |
| 2026-10-24 | The chord moved from `ctrl+x e` to `ctrl+x r`, also bound as `ctrl+x ctrl+r`. Holding ctrl through `ctrl+x e` sent `ctrl+x ctrl+e`, the engine's default for `chat:externalEditor`, which opened vim instead. |
| 2026-10-24 | The person asked for the rewrite prompt to be a setting, so people can guide the rewrite. The rules became the `instructions` setting, which defaults to the old rules. The role, the verbatim rule and the reply format stay fixed in code. |
