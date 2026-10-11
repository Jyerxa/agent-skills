# PRD: Enrich, a prompt-enrichment pass for Claude Code

**Version** 0.1, approved 2026-10-11
**Author** jeremiah, drafted with Claude
**Target stack** Claude Code 2.1.296 function-hooks plugin ("mod"): a TypeScript/JSX hooks module drawn on the Ink terminal surface; model calls through the engine's own client (`$.model.complete`, `$.model.fork`)

## 1. Overview

Claude does better with a prompt that says what the goal is, what it should know, what "done" looks like and what is still undecided. In practice the person types fast: a one-line ask with a typo, or a brain dump of half-formed thoughts with "maybe" and "idk" in it. Writing the structured version by hand every time is exactly the work they are trying to skip.

Enrich keeps Enter as it is (send the draft as typed) and adds one chord, `ctrl+x e`, that sends the draft through an enrichment pass first. A model rewrites the draft into a well-structured prompt, sized to what was typed. It never invents requirements: what is missing becomes a short list of open questions. The result appears in a card directly above the prompt box, where Claude Code shows plan approvals. From the card the person sends it, edits it in the prompt box, refines it with feedback, answers its open questions, or restores what they wrote.

Identity: plugin id `enrich`, slash command `/enrich`, folder `claude/plugins/in-progress/enrich` in the `agent-skills` repo.

## 2. Goals and non-goals

### Goals

- **Enter is untouched.** Sending as-is costs nothing and changes nothing. Enrichment is opt-in per prompt, one chord away.
- **Right-sized.** A clear one-liner comes back nearly unchanged; a brain dump comes back with sections. Structure is earned by content, never padded.
- **Never invents.** Every requirement in the result traces to the draft, the repository, the person's house style or (in context mode) the conversation. Gaps are asked, not guessed.
- **Never loses text.** Whatever happens (cancel, error, reload, `/clear`), the original draft is one key or one command away.
- **Reviewable like a plan.** The enriched prompt is rendered as Markdown in a card the person reads before anything is sent.
- **Fast by default.** A one-shot call on a fast model with a small repository snapshot. Full conversation context is a setting, or one key on a single card.
- **Quiet.** No timers and no per-keystroke work while idle. The only idle footprint is a few dim words on the hint line under the prompt while a draft is typed.

### Non-goals

- Not a prompt library or template manager.
- No editing inside the card. Plugin text fields are single-line; editing happens in the real prompt box (§4.3).
- No composer lint (underlining vague words while typing). Pitched and skipped on 2026-10-11; listed under Later.
- No automatic enrichment. The plugin never rewrites a prompt the person sent with Enter.
- No remote surfaces in v1 beyond what the desktop surface gives for free (§6.5).

## 3. Personas

- **The brain-dumper.** Types a paragraph of loosely connected thoughts while thinking out loud, and wants it turned into something Claude can act on without losing anything they said.
- **The one-liner.** Fires short asks between tasks ("fix the flaky test"). Wants the occasional nudge of a goal and a definition of done, without being slowed down on prompts that were already fine.

## 4. Functional requirements

### 4.1 Trigger and take-out

- F1. Enter submits the draft exactly as today. The plugin observes submissions but never changes or drops one.
- F2. `ctrl+x e` with a non-empty draft starts enrichment. The chord reaches the plugin through a Button whose `action` names a borrowed engine keybinding action (default `diff:back`, config `triggerAction`), which the person binds to `ctrl+x e` in the Chat context (§4.9, §7, A.11). The Button lives in the hint line under the prompt (`PromptHint`), drawn only while a draft is typed or a card is up. M0 confirms this host; the fallback host is a one-line band hint.
- F3. Drafts that are commands or modes are refused with a toast and left untouched: a leading `/` (slash command), `!` (bash mode) or `#` (memory). An empty draft with no card up toasts `nothing to enrich`.
- F4. Take-out: the draft's text and cursor are saved to session state and to `$.store` (key `last`), then the prompt box is emptied with `$.prompt.fill({ text: '' })`. If the box refuses (a dialog holds the keys), nothing is taken and a toast says why.
- F5. The card appears in the enriching state at once (§5.2), with the original dimmed and `1: Cancel`. Cancel puts the draft back in the box.
- F6. Fallbacks that work without any keybinding: `/enrich <text>` enriches the given text as if it had been the draft; and `/enrich restore` (F44).

### 4.2 The card

- F7. The card draws in the band directly above the prompt (`AbovePrompt`), as wide as the transcript column, with a rounded border in the `claude` accent. While a survey holds the band (`hasSurvey`) the card steps aside and keeps its state; it returns when the survey ends.
- F8. Header, in the top border: `✦ <state>` and the revision on the left; on the right the brain and model (`fast · sonnet`, `context · opus`) and the size change (`228 → 557 chars`). In context mode the right side shows cache-read tokens instead of the size (`cache 41.2k`).
- F9. The button row is the first row inside the card, before the body, so the digits always work: the engine only arms digit hotkeys on Buttons wholly inside the band's visible window. Body below: the enriched prompt drawn with the `Markdown` element. Last row: the model's one-line notes, dim.
- F10. Digit hotkeys work from the empty prompt box (the engine routes a bare digit typed into an empty composer to the band's Buttons), and every Button is also clickable. While the person has typed something in the box, digits type as usual.
- F11. A card taller than the band's room scrolls inside the band (wheel, or arrows after `ctrl+x tab`); a dim `↓ more` cue marks hidden rows.

### 4.3 Send, Edit, Original

- F12. **1: Send** submits the enriched text as the person's own words (`$.prompt.submit({ text, asUser: true })`), after writing it to `last`. The card closes.
- F13. **2: Edit** puts the enriched text in the prompt box (`$.prompt.fill`, replace) and closes the card. The person edits there, with `ctrl+g` for their external editor, and sends with Enter. `ctrl+x e` on that text starts a fresh enrichment.
- F14. **3: Original** puts the original draft back in the box and closes the card. It is the card's way out; there is no separate close button. The cursor lands at the end of the text; the engine's fill does not take a cursor position.
- F15. Mentions and pastes: the engine does not expand `@file` mentions or attach pasted images for a prompt a plugin submits. When the draft holds an `@mention` or a paste placeholder (`[Image #1]`, `[Pasted text #1 …]`), the card shows a warning row and draws **2: Edit** as the primary button (§5.7). Send still works and sends the text as written. M0 checks whether placeholders still bind to their attachments after Edit or Original.
- F16. Where the surface has no prompt box (`no_composer`), Edit and Original copy the text to the clipboard and toast `copied`.

### 4.4 Refine

- F17. With a card up and text in the prompt box, `ctrl+x e` treats that text as feedback: it is taken out of the box, shown in the card as `↻ <feedback>`, and the model revises the current revision. The result is the next revision (`rev 2`, `rev 3`, …).
- F18. With a card up and the box empty, `ctrl+x e` regenerates: the model polishes the current revision and weaves any `## Decisions` (F22) into the sections they belong to.
- F19. A failed or cancelled refine returns to the previous revision and puts the feedback back in the box. Up to 8 revisions are kept; the card shows the newest.

### 4.5 Answer open questions

- F20. When the current revision has an `## Open questions` section, the card offers **4: Answer (n)**. It switches the card to one question per row, each with a one-line answer field under it, the first unanswered field focused (§5.5).
- F21. Fields need the keyboard, and a plugin cannot move the keyboard into the band by itself (the engine denies `$.ui.focus` unless the band already holds the keys). Two ways in; M0 picks the default (config `answerIn`):
  - `band`: the card shows `ctrl+x tab to type` until the person focuses the band;
  - `pane`: the questions open in a pane with `focus`, which the engine grants while the prompt box is empty (docked on the right in the fullscreen layout, inline above the prompt otherwise).
- F22. Enter moves to the next field; Enter on the last folds the answers into the prompt locally, with no model call: each answered question moves to a `## Decisions` section as `- <question> → <answer>`, unanswered ones stay under Open questions, and the section disappears when none are left. The result is the next revision. `2: Back` returns to the card without folding.

### 4.6 Brains

- F23. Config `mode`: `fast` (default) or `context`.
- F24. **fast**: one `$.model.complete` call on config `model` (default `sonnet`, any alias or model id), `effort` (default `low`), `maxTokens` (default 2048), `timeoutMs` (default 45000). The system prompt holds the enrichment rules and house style, marked for the prompt cache; the user message holds the repository snapshot (F26) and the draft.
- F25. **context**: one `$.model.fork` call. It runs on the session's own model and system prompt and sees the whole conversation through the main thread's prompt cache, so it can resolve "the bug above" or "that file" into real names (§5.6). The enrichment rules go inside the fork's prompt. On a session's first prompt (or right after `/clear`) the engine reports `nothing-to-fork`; the call falls back to fast mode and the header says `context → fast`.
- F26. Repository snapshot (fast mode, config `snapshot`, default on), capped at config `contextChars` (default 12000): working directory relative to the repository root; `git` branch and short status (at most 40 lines); the top-level listing (at most 60 entries); and the CLAUDE.md files that apply (project, local, parent directories, and the person's own). Git runs read-only.
- F27. **5: Full context**, shown only in fast mode, re-runs the original draft through the context brain as the next revision.
- F28. While a call runs, the header counts elapsed seconds. A call past `timeoutMs` ends in the error state (§5.8) with `1: Retry`, `3: Original` and `5: Full context` or `5: Fast`.
- F29. Cost is visible: the notes row ends with the call's tokens, dim (`in 3.1k · out 410`), plus cache reads in context mode.

### 4.7 What enrichment does

The full instructions are in A.7. The contract:

- F30. Rewrite, never answer. The output is a prompt for Claude Code to act on, not a reply to it.
- F31. Right-size by tier:
  - a clear one-liner gets fixes only, no headings, and coming back nearly unchanged is a good result;
  - a paragraph becomes one tight paragraph, plus a short requirements list if there are several asks;
  - a brain dump (several threads, or about 120 words or more) gets sections, only those with real content, in this order: Goal, Context, Requirements, Done when, Out of scope, Open questions;
  - a question stays a question.
- F32. Never invent. No requirement, file, name, number, constraint or technology without a source in the draft, the snapshot, the house style or the conversation. A hedge that changes what gets built ("maybe q should close it") becomes an open question; a mild one stays as written. At most 5 open questions, each answerable in a few words, always the last section.
- F33. Verbatim: `@mentions`, paths, identifiers, inline code, code blocks, URLs, error text, quotes and paste placeholders. After each call the plugin checks that every such token in the draft survived and lists any that did not as a warning row.
- F34. The author's voice: first person, their terms, spelling fixed, no pleasantries or meta talk.
- F35. Length: at most the larger of 600 characters and 3× the draft; above 1,000 characters of draft, at most 1.5× the draft plus 1,500.

### 4.8 House style

- F36. Optional standing preferences in Markdown, appended to the enrichment instructions: `~/.claude/enrich.md` (the person's) and `<repository root>/.claude/enrich.md` (the project's). Where they conflict, the project's wins. Examples: "acceptance criteria as checkboxes", "always name the test to add".
- F37. Read at the start of each call, so edits apply at once. Config `houseStyle` turns both off.

### 4.9 Commands and configuration

- F38. `/enrich` with no arguments prints help: the chord, its binding status, the current mode and model.
- F39. `/enrich <text>` enriches the text (F6).
- F40. `/enrich keys` reports whether the trigger action is bound and prints the snippet to add.
- F41. `/enrich keys install` merges `"ctrl+x e": "<triggerAction>"` into the Chat context of `~/.claude/keybindings.json` (`CLAUDE_CONFIG_DIR` respected). It never replaces the file: it writes a `.bak` first, adds `$schema` and `$docs` when it creates the file, and refuses when `ctrl+x e` is already bound to something else, naming what.
- F42. While no chord is bound, the hint line says so in place of the chord (§5.9).

Configuration (userConfig, each a row in the config menu):

| Field | Default | Meaning |
|---|---|---|
| `mode` | `fast` | `fast` or `context` (F23–F25) |
| `model` | `sonnet` | Fast-mode model, an alias or full model id |
| `effort` | `low` | Fast-mode effort, `low` to `max` |
| `maxTokens` | 2048 | Cap on the enriched reply |
| `timeoutMs` | 45000 | Give up after this long |
| `triggerAction` | `diff:back` | The engine action the chord is bound to (A.11) |
| `hint` | `draft` | When the hint line shows the chord: `draft`, `always`, `off` |
| `answerIn` | set by M0 | `band` or `pane` (F21) |
| `sendHotkey` | `true` | `false` removes the digit from Send, so it can only be clicked |
| `snapshot` | `true` | Send the repository snapshot in fast mode |
| `contextChars` | 12000 | Snapshot budget |
| `houseStyle` | `true` | Read the house style files |

### 4.10 Never losing text

- F43. Every take-out and every revision is written to `$.store` key `last` (the original draft and the newest revision), so it survives a crash or restart.
- F44. `/enrich restore` reopens the last card from the store, so Send, Edit and Original are available again.
- F45. A hot reload while a call runs leaves the card in the error state, `interrupted by reload`, with Retry. `/clear` cancels a running call; the card stays, with Retry and Original.
- F46. A prompt the person sends with Enter while a card is up goes through untouched. The card stays and a one-time toast says it is still waiting.

### 4.11 Later

- Composer lint: faint underlines on vague phrases and the biggest gap named in the hint line (skipped for v1 on 2026-10-11).
- Stepping back through revisions (`[` and `]` while the band is focused).
- A diff of original and enriched text.
- A grounded brain: a read-only subagent that opens the files the draft mentions before rewriting (offered and not chosen on 2026-10-11).
- History: `/enrich history` lists recent enrichments per project.

## 5. Visual design

The examples use one real draft about this repository's `tree` plugin, typed the way drafts usually are. The card is 72 columns here; it takes the transcript column's width. Borders and the header's `✦` are the `claude` accent; the notes row and the dimmed original are dim text; a warning row uses `warning`; the primary button is drawn in the accent.

### 5.1 Typing: the hint line

The engine's own hint line keeps its pills; the plugin adds the chord at the right end while a draft is typed.

```
  …transcript…

> the tree preview jumps back to the top every time i reopen a file. can
  we make it rember where i was, per file probably. also maybe q should
  close it from the prompt too not just when the pane has focus idk.
  dont break the tests█
  ? for shortcuts                                            ⌃x e enrich
```

### 5.2 Enriching

The draft has left the box and shows dimmed in the card. The seconds count up.

```
  …transcript…

╭ ✦ enriching · 4s ───────────────────────────────────── fast · sonnet ╮
│ 1: Cancel                                                            │
│                                                                      │
│ the tree preview jumps back to the top every time i reopen a file.   │
│ can we make it rember where i was, per file probably. also maybe q   │
│ should close it from the prompt too not just when the pane has focus │
│ idk. dont break the tests                                            │
╰──────────────────────────────────────────────────────────────────────╯
> █
  ? for shortcuts
```

### 5.3 Ready

Fast mode knows only the draft and the snapshot, so it adds structure and questions, not facts. "per file probably" stays a requirement; "maybe q should" changes the work, so it becomes a question.

```
  …transcript…

╭ ✦ enriched · rev 1 ───────────────── fast · sonnet · 228 → 557 chars ╮
│ 1: Send  2: Edit  3: Original  4: Answer (3)  5: Full context        │
│                                                                      │
│ ## Goal                                                              │
│ Make the `tree` plugin's file preview remember its scroll position   │
│ per file, so reopening a file returns me to where I was instead of   │
│ the top.                                                             │
│                                                                      │
│ ## Requirements                                                      │
│ - Positions are kept per file.                                       │
│                                                                      │
│ ## Done when                                                         │
│ - Reopening a file in the preview shows the lines it showed when I   │
│   closed it.                                                         │
│ - The existing `tree` tests still pass.                              │
│                                                                      │
│ ## Open questions                                                    │
│ - Remember positions across sessions, or only this one?              │
│ - If the file changed since it was last open, keep the same line or  │
│   go back to the top?                                                │
│ - Should `q` also close the preview while the prompt has focus?      │
│                                                                      │
│ added a goal and done-when; turned the hedges into questions         │
╰──────────────────────────────────────────────────────────────────────╯
> █
  ? for shortcuts                     type feedback, then ⌃x e to refine
```

### 5.4 Refining

The person typed `drop the q part, separate task` and pressed `⌃x e`. The feedback leaves the box and heads the card while the previous revision shows dimmed.

```
╭ ✦ refining · 3s ────────────────────────────────────── fast · sonnet ╮
│ 1: Cancel                                                            │
│                                                                      │
│ ↻ drop the q part, separate task                                     │
│                                                                      │
│ ## Goal                                                              │
│ Make the `tree` plugin's file preview remember its scroll position   │
│ per file, so reopening a file returns me to where I was instead of   │
│ the top.                                                             │
│                                                                      │
│ ## Requirements                                                      │
╰──────────────────────────────────────────────────────────────────────╯
> █
```

Revision 2 changes only what the feedback named:

```
╭ ✦ enriched · rev 2 ───────────────── fast · sonnet · 228 → 493 chars ╮
│ 1: Send  2: Edit  3: Original  4: Answer (2)  5: Full context        │
│                                                                      │
│ …                                                                    │
│ ## Open questions                                                    │
│ - Remember positions across sessions, or only this one?              │
│ - If the file changed since it was last open, keep the same line or  │
│   go back to the top?                                                │
│                                                                      │
│ removed the q question                                               │
╰──────────────────────────────────────────────────────────────────────╯
```

### 5.5 Answering

`4` opens the questions with a field under each. Once the person has the keyboard in the card:

```
╭ ✦ answer · 2 open questions ───────── enter: next · last enter: fold ╮
│ 1: Fold answers  2: Back                                             │
│                                                                      │
│ 1. Remember positions across sessions, or only this one?             │
│    › this session only                                               │
│ 2. If the file changed since it was last open, keep the same line or │
│    go back to the top?                                               │
│    › keep the line, clamp to the end of the file█                    │
╰──────────────────────────────────────────────────────────────────────╯
>
```

Before they have it (`answerIn: band`), the header says how to take it:

```
╭ ✦ answer · 2 open questions ───────────────────── ctrl+x tab to type ╮
│ 1: Fold answers  2: Back                                             │
│                                                                      │
│ 1. Remember positions across sessions, or only this one?             │
│    ›                                                                 │
╰──────────────────────────────────────────────────────────────────────╯
```

Enter on the last field folds the answers in, with no model call:

```
╭ ✦ enriched · rev 3 ───────────────── fast · sonnet · 228 → 554 chars ╮
│ 1: Send  2: Edit  3: Original  5: Full context                       │
│                                                                      │
│ ## Goal                                                              │
│ Make the `tree` plugin's file preview remember its scroll position   │
│ per file, so reopening a file returns me to where I was instead of   │
│ the top.                                                             │
│                                                                      │
│ ## Requirements                                                      │
│ - Positions are kept per file.                                       │
│                                                                      │
│ ## Done when                                                         │
│ - Reopening a file in the preview shows the lines it showed when I   │
│   closed it.                                                         │
│ - The existing `tree` tests still pass.                              │
│                                                                      │
│ ## Decisions                                                         │
│ - Remember positions across sessions, or only this one? → this       │
│   session only                                                       │
│ - If the file changed since it was last open, keep the same line or  │
│   go back to the top? → keep the line, clamp to the end of the file  │
│                                                                      │
│ folded 2 answers into Decisions (no model call)                      │
╰──────────────────────────────────────────────────────────────────────╯
```

### 5.6 Full context

`5` re-runs the draft through a fork of the session. In a session that had already read `tree/hooks/register.tsx`, the rewrite can name real code:

```
╭ ✦ enriched · rev 2 ──────────────────── context · opus · cache 41.2k ╮
│ 1: Send  2: Edit  3: Original  4: Answer (2)                         │
│                                                                      │
│ ## Goal                                                              │
│ Make the `tree` plugin's file preview remember its scroll position   │
│ per file, so reopening a file returns me to where I was instead of   │
│ the top.                                                             │
│                                                                      │
│ ## Context                                                           │
│ - The preview draws in the band (`drawBand` in                       │
│   `hooks/register.tsx`); its position is the `previewOffset` atom,   │
│   which `openPreview` resets to 0.                                   │
│ - `pane.test.tsx` already mounts the band preview, so a remembered   │
│   offset can be asserted there.                                      │
│ …                                                                    │
╰──────────────────────────────────────────────────────────────────────╯
```

### 5.7 Mentions and pastes

When the draft holds an `@mention` or a pasted image, Send cannot attach them (F15). The warning row explains; **2: Edit** is drawn as the primary button.

```
╭ ✦ enriched · rev 1 ───────────────── fast · sonnet · 188 → 604 chars ╮
│ 1: Send  2: Edit  3: Original                                        │
│                                                                      │
│ ⚠ @hooks/register.tsx and [Image #1] are only attached when you send │
│   from the prompt box: Edit, then Enter.                             │
│                                                                      │
│ ## Goal                                                              │
│ …                                                                    │
╰──────────────────────────────────────────────────────────────────────╯
```

### 5.8 Error

```
╭ ✦ enrich failed ───────────────────────── api-error 529 · overloaded ╮
│ 1: Retry  3: Original  5: Full context                               │
│                                                                      │
│ Your draft is safe: 3 puts it back in the prompt box.                │
╰──────────────────────────────────────────────────────────────────────╯
```

### 5.9 No chord bound

```
> make the tree legend wrap on narrow panes█
  ? for shortcuts                    ⌃x e unbound · /enrich keys install
```

## 6. Non-functional requirements

### 6.1 Latency

- Pressing `⌃x e` shows the enriching card within 100 ms; nothing waits on the model before the draft leaves the box.
- Fast mode: median under 8 s for a 300-word draft on `sonnet` at `low` effort. Context mode depends on the transcript's length and the prompt cache.

### 6.2 Cost

- Fast mode sends the fixed instructions and house style first, marked for the prompt cache, so repeated calls within five minutes pay for them once.
- The snapshot is capped at `contextChars` (about 3k tokens at the default).
- Context mode reads the transcript from the main thread's cache; the header shows how much was served from it.
- Tokens are shown on every card (F29).

### 6.3 Never losing text

The invariant: at every moment the original draft is in the prompt box, on the card behind `3: Original`, or in `$.store` behind `/enrich restore`. Tests cover each transition out of every state.

### 6.4 Quiet when idle

- No timers run unless a call is in flight (the seconds ticker stops with it).
- No `prompt.edit` hook: typing costs nothing.
- The hint line re-draws only when the engine re-draws it (`isDraft` changes).

### 6.5 Platforms

- Terminal first; the fullscreen layout is not required (the band exists in both layouts).
- Desktop: the engine raises the band and the hint line there too, so the card draws; where there is no prompt box, Edit and Original copy instead (F16).
- Theme keys only (`claude`, `subtle`, `warning`, `error`), so light, dark and custom themes need no configuration.

## 7. Constraints and risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Plugins cannot register keybinding actions.** The only way a chord reaches a plugin from the prompt is a Button whose `action` names an engine action, pressed by the person's chord for it while the Button is mounted, no dialog is up and no engine handler of that action is mounted. | The chord depends on borrowing an engine action, and the person has to bind it once. A future build could mount that action's handler or rename it. | Default `diff:back`: its only handler lives inside the modal diff dialog, which blocks plugin buttons anyway. The Button lives only in the small hint tree, never in the card, so a refused name costs the hint and not the card. `triggerAction` is a picker. `/enrich keys install` does the binding. `/enrich <text>` always works. Re-run M0's probe S1 on every Claude Code update. |
| Plugin-submitted prompts do not expand `@mentions` or attach pasted images. | Send loses those attachments. | Warning row and Edit as the primary button (F15). |
| A digit typed into the empty box presses a card button. | Feedback that starts with a digit ("2 sections only") would press Edit, or Send. | The hint says "type feedback, then ⌃x e"; Send writes `last` first; `sendHotkey: false` takes the digit off Send. |
| The enricher invents requirements or drops something. | A wrong prompt is sent with confidence. | Strict rules (A.7); a check that every mention, path and code token survived (F33); the notes row says what changed; Original is one key away. |
| A long card scrolls its buttons out of the digit window. | Digits stop working. | Buttons are the first row; `↓ more` cue. |
| The band is shared. The `tree` plugin draws its file preview there, and only one tree shows. | One plugin's drawing can hide the other's. | Enrich passes the band through while idle and draws its card alone while one is up. If M0 shows `tree`'s hook runs first, `tree` changes to call `next(e)` first and draw only into an empty band (A.9). |
| Paste placeholders may not survive a take-out and put-back. | An image could detach from a draft restored with Original or Edit. | M0 probe S8; the warning row; `last` in the store. |
| Hot reload drops module variables. | A call in flight is lost. | Everything a drawing needs is in session state; a reload mid-call leaves an error card with Retry (F45). |

## 8. Success metrics

- No lost text: across the integration suite and a week of use, every path out of every state leaves the original reachable.
- A clear one-liner comes back without headings and at most 1.5× its length.
- A 200-word brain dump comes back with Goal and Done when, and on 10 real drafts spot-checked, no requirement lacks a source in the draft, snapshot, house style or conversation.
- `⌃x e` to the enriching card: under 100 ms. Fast mode median under 8 s.
- After a week, the person reaches for `⌃x e` on brain dumps and Enter on clear asks (their own judgment).

## 9. Milestones

| M | Deliverable | Done when |
|---|---|---|
| M0 Spike | A throwaway `--plugin-dir` mod running probes S1–S11 (§10.1). | Every row of §10.1 has a result; `triggerAction`, `hint` and `answerIn` defaults and the attachment policy are decided. |
| M1 Skeleton and trigger | Manifest, state contract, trigger in the hint line, `/enrich` with `keys`, `keys install` and `restore`, keybinding detection, the state machine with an echo brain (returns the draft wrapped in a heading), Cancel and Original. | `⌃x e` on a draft empties the box and shows the card; `3` restores the draft; `claude plugin validate`, `tsc -p` and `claude plugin test` are green. |
| M2 Fast brain | Instructions, snapshot, reply parser, verbatim check; `$.model.complete` with caching, the seconds ticker, timeout, error and Retry, Send, Edit, the copy fallback. | A one-liner comes back lightly touched; a 300-word dump comes back with sections and questions; Send and Edit work live. |
| M3 Refine and context | Refine and regenerate revisions, the fork with its fallback, `5: Full context`, house style. | Feedback changes only what it names; context mode resolves "the bug above" into a real file. |
| M4 Answer | Answer fields in the band or pane, focus handling, folding answers into Decisions. | Two answers and Enter give the next revision with Decisions and no model call. |
| M5 Ship | README, root `marketplace.json` entry and root README row, the `tree` band change if M0 needs it, the full test matrix on `terminal` and `desktop`. | `/plugin install enrich --marketplace jyerxa/agent-skills` works on a clean machine; tests green. |

## 10. Decision log

| Date | Decision |
|---|---|
| 2026-10-11 | Review UI: a card in the band above the prompt, rendered Markdown, like a plan approval. Chosen over replacing the draft in place and over a docked pane. |
| 2026-10-11 | Brain: configurable. `fast` (one-shot model plus repository snapshot) is the default; `context` (a fork of the session) is the option. Not chosen: a grounded subagent (Later). The card's `5: Full context` escalates a single draft; added in the PRD as the per-prompt form of the setting. |
| 2026-10-11 | Style: right-sized, and it asks. Structure scales with the draft; gaps become open questions rather than assumptions. |
| 2026-10-11 | Chord: `ctrl+x e`. Enter is unchanged. |
| 2026-10-11 | Pitched one at a time: refine loop (in), answer open questions in place (in), composer lint (out), house style files (in). |
| 2026-10-11 | Plugins cannot register keybinding actions, so the chord borrows an engine action through a Button's `action` prop. Default `diff:back`; the person binds it once (`/enrich keys install`). The trigger lives in the hint line under the prompt. M0 confirms both. |
| 2026-10-11 | Editing happens in the prompt box (2: Edit), because plugin text fields are single-line. |
| 2026-10-11 | No close button on the card: `3: Original` is the way out, so closing never leaves the draft out of the box. |
| 2026-10-11 | The band cannot take the keyboard by itself, so answering needs `ctrl+x tab` (`band`) or a pane opened with `focus` (`pane`). M0 picks the default. |
| 2026-10-11 | An unbound chord shows in the hint line's tail (`⌃x e unbound · /enrich keys install`), not as a card. |
| 2026-10-11 | Name: `enrich`. |
| 2026-10-11 | PRD v0.1 approved by the user, including the additions not asked for: `5: Full context`, no close button, token counts, `/enrich restore`, `/enrich keys install`. |

### 10.1 M0 probes (to fill in)

| # | Probe | Decides | Result |
|---|---|---|---|
| S1 | A `diff:back` Button in the hint line and in the band, with `"ctrl+x e": "diff:back"` in the Chat context. Does it fire? Any keybinding warning in the debug log? Does a new binding apply without a restart? | Trigger action | |
| S2 | `app:cycleDiffBase` with the diff panel open; `pane:next` with the `tree` pane open. | Which actions are safe to borrow | |
| S3 | An action Button inside `display: 'none'`, inside a zero-height box, in a collapsed band, and scrolled out of view. | `hint: off`; collapse behaviour | |
| S4 | The hint line drawn as our own tree around `next(e)`: do the engine's pills stay live? How quickly does `isDraft` re-draw? | Hint line as the host | |
| S5 | What `next(e)` holds in the band when idle, with `tree`'s preview up, and with a plan approval up. | Band etiquette (A.9) | |
| S6 | Does `alt+e` reach `prompt.edit` as a key? Does a pass-through hook there slow typing? | Whether a second trigger exists | |
| S7 | `fill({ text: '' })` empties the box; fill while the band holds the keys; fill under a permission dialog returns `dialog`. | Take-out (F4) | |
| S8 | `prompt.read` with `[Image #1]` and a long paste: after Original, and after Edit then Enter, is the attachment still attached? | Attachment policy (F15) | |
| S9 | After a digit press, does the band hold the keys? `$.ui.focus` from a press handler; `autoFocus` after `ctrl+x tab`; a pane opened with `focus` over the empty box. | `answerIn` default | |
| S10 | `/enrich <text>` with mentions and pastes; does answering `{}` print nothing in the transcript? | Command fallback | |
| S11 | `$.model.complete` awaited inside a press handler versus started from `$.clock.after(0)`, with Esc pressed meanwhile; a fork while a turn runs. | Job pattern (A.5) | |

## Appendix A. Technical design

### A.1 Files

```
claude/plugins/in-progress/enrich/
  .claude-plugin/plugin.json   name, version, description, author, types, userConfig (§4.9)
  .gitignore                   .claude-plugin/types/, tsconfig.json (written by the engine)
  README.md                    install, binding the chord, using it, configuration, development
  docs/PRD.md                  this file
  hooks/hooks.json             { "modules": ["./register.tsx"] }
  hooks/register.tsx           every hook, every atom, every function that takes $, all JSX
  hooks/meta.ts                enrichment instructions and the per-call prompt (A.7)
  hooks/parse.ts               parseReply, findOpenQuestions (A.6)
  hooks/answers.ts             foldAnswers (F22)
  hooks/snapshot.ts            formatSnapshot: the repository block, within a budget (A.8)
  hooks/preserve.ts            tokens that must survive (mentions, paths, code, URLs, placeholders); which went missing
  hooks/draft.ts               classifyDraft: empty, command, bash, memory, ok; placeholder and mention detection
  hooks/keys.ts                find the chord bound to an action; label it (⌃x e); merge a binding
  hooks/view.ts                the card as plain data: header, buttons, body, warnings, notes
  hooks/paths.ts               copied from tree: toPosix, normalizeRoot, cells
  hooks/*.test.ts              one per pure module
  hooks/flow.test.tsx          integration: hint line and card on terminal and desktop
  types/index.d.ts             the PluginState contract (A.2)
```

The engine's static scanner refuses `$` passed to any function not declared at the top level of the hooks module, and atoms must be declared in the file that reads them. So the pure modules never take `$`: `view.ts` returns plain data and `register.tsx` turns its button list into Buttons with handlers. The plugin installs from its own folder, so helpers are copied from `tree`, not imported.

### A.2 State

```ts
export type EnrichPhase = 'idle' | 'enriching' | 'ready' | 'refining' | 'answering' | 'error'
export type EnrichBrain = 'fast' | 'context'
export type EnrichDraft = { text: string; cursor: number }
export type EnrichRev = {
  rev: number; text: string; notes: string; questions: string[]
  brain: EnrichBrain; model: string; fellBack: boolean
  feedback: string | null; via: 'model' | 'answers'
  usage: { input: number; output: number; cacheRead: number }
  warnings: string[]; truncated: boolean
}
export type EnrichJob = {
  id: number; kind: 'enrich' | 'refine' | 'regenerate'; brain: EnrichBrain
  startedAt: number; feedback: string | null
}
export type EnrichBinding = { action: string; chord: string | null }

declare module 'claude-code' {
  interface PluginState {
    enrich: {
      phase: EnrichPhase
      draft: EnrichDraft | null   // the original, until the card closes
      revs: EnrichRev[]           // newest last, at most 8
      job: EnrichJob | null       // the call in flight
      elapsed: number             // seconds, for the header
      answers: string[]           // answer fields, by question
      error: string | null
      binding: EnrichBinding
    }
  }
}
```

Module variables (lost on reload, which is fine): the parsed config, the `AbortController` of a fast call, the ticker and timeout handles. `$.store` holds `last` (F43).

### A.3 Hooks

| Hook | Does |
|---|---|
| `session.start` | Registers `/enrich`; reads the keybindings file into `binding`; if `job` is set, the call was cut by a reload: phase `error`, `interrupted by reload`. |
| `command.run` `{ command: 'enrich' }` | Help, `<text>`, `keys`, `keys install`, `restore`. |
| `ui.render` `PromptHint` | Wraps the engine's line (`next(e)`) with the trigger Button (`action: triggerAction`) and its label, per F2, F42 and `hint`. |
| `ui.render` `AbovePrompt` | Idle or `hasSurvey`: `next(e)`. Otherwise the card. |
| `prompt.submit` | Observes only, `.catch` passes through. If a card is up, one toast (F46). |
| `session.end` `reason: 'clear'` | Cancels the call (F45). |
| `ui.render` `Pane`, `ui.close` | Only with `answerIn: pane`. |

### A.4 State machine

| Phase | Band draws | Hint line | Leaves by |
|---|---|---|---|
| idle | nothing (`next(e)`) | `⌃x e enrich` while a draft is typed | trigger on a draft: take out (F4), go to enriching, start the ticker, schedule the call |
| enriching | §5.2 | nothing | success: rev 1, ready. `nothing-to-fork`: same job re-run fast, `fellBack`. Failure or timeout: error. `1`: Cancel: new job id, abort, put the draft back, idle |
| ready | §5.3 | `type feedback, then ⌃x e to refine` | `1` Send, `2` Edit, `3` Original: idle. `4`: answering. `5`: enriching (context). Trigger with text in the box: refining with that feedback. Trigger on the empty box: refining (regenerate) |
| refining | §5.4 | nothing | success: rev N+1, ready. Failure or Cancel: ready, feedback back in the box |
| answering | §5.5 | nothing | Enter on the last field or `1`: fold, rev N+1, ready. `2`: ready |
| error | §5.8 | nothing | `1` Retry: the same job again. `3` Original: idle. `5`: the other brain |

One top-level `trigger($)` decides by phase and box contents; the hint Button, `/enrich <text>` and the probes all call it.

### A.5 Jobs: scheduling, cancel, timeout

- A press only writes state and schedules the call with `$.clock.after(0, …)`, so the model call never runs inside the press's dispatch, which the engine may abandon.
- Every job carries an id (its start time). A result whose id is no longer `job.id` is dropped: this is how Cancel works for `fork`, which takes no abort signal.
- Fast calls also get an `AbortController` (`options.signal`) and `timeoutMs`. Fork calls get a `$.clock.after(timeoutMs)` timer that fails the job.
- A `$.clock.every(1000)` ticker writes `elapsed` while a job runs and is cancelled when it ends.

### A.6 Reply contract and parser

The model replies:

```
<enriched>
…the rewritten prompt in Markdown; when there are gaps, its last section is "## Open questions"…
</enriched>
<notes>one line: what changed</notes>
```

Open questions stay inside the enriched text, so Send and Edit carry them to Claude. `parseReply`:

1. Normalise line endings.
2. Take the text from the first `<enriched>` to the last `</enriched>`. If the closing tag is missing, take the rest and mark the revision `truncated`.
3. If there is no tag at all: drop a leading "Here's…" or "Sure…" paragraph, unwrap a single code fence around the whole reply, and record a warning.
4. Notes from `<notes>`, cut to 140 characters.
5. If the result is empty, it's an error.

`findOpenQuestions` finds a heading or bold line matching `open questions`, then takes `-`, `*` and `1.` items up to the next heading, with their offsets. `foldAnswers` moves answered items to `## Decisions` (created before Open questions, or appended to), keeps blank ones, and removes an empty Open questions section.

### A.7 Enrichment instructions (draft)

The fixed part, sent as the cached system prompt in fast mode and at the head of the fork prompt in context mode:

```
You rewrite a developer's draft prompt for Claude Code, an agentic coding
assistant that will act on it in their repository. You never answer the draft
or do the work it asks for. You return the draft rewritten so Claude Code can
act on it well.

Size the rewrite to the draft:
- A clear one-liner: fix only what would mislead. No headings. Returning it
  almost unchanged is a good answer.
- A paragraph or a few asks: one tight paragraph, then a short list of
  requirements if there are several.
- A brain dump (several threads, or about 120 words or more): use only the
  sections that have real content, in this order: Goal, Context, Requirements,
  Done when, Out of scope, Open questions.
- A question stays a question. Make it precise; don't turn it into a task.

Never invent. Every requirement, constraint, file, name, number and technology
must come from the draft, the <repo> block, the house style, or the
conversation. When something the work depends on is missing or ambiguous, ask
instead of guessing: put it under "## Open questions" as the last section, at
most 5 questions, each answerable in a few words. A hedge in the draft
("maybe", "probably", "idk") that changes what gets built becomes a question;
one that doesn't stays as the author wrote it.

Keep verbatim: @mentions, file paths, identifiers, inline code and code
blocks, URLs, error messages, quoted text, and placeholders such as
[Image #1] or [Pasted text #1].

Keep the author's voice: first person, their terms. Fix spelling. No
pleasantries and no commentary about the rewrite.

Length: at most the larger of 600 characters and 3 times the draft; for drafts
over 1,000 characters, at most 1.5 times the draft plus 1,500. Shorter is
better when nothing is lost.

Reply in exactly this form and nothing else:
<enriched>
the rewritten prompt, in Markdown
</enriched>
<notes>one line: what you changed</notes>
```

Appended when they apply:

- **House style** (F36): `## House style (yours)` and `## House style (this project)`, then "Where they conflict, follow this project's."
- **Refine** (F17): "You are revising your previous rewrite. `<previous>` holds it; `<feedback>` holds what the author wants changed. Make the smallest change that satisfies the feedback. Keep everything else exactly as it was, and don't bring back anything an earlier revision removed."
- **Regenerate** (F18): "Polish `<previous>`. Weave each item under `## Decisions` into the section it belongs to, drop the questions it answers, and remove the Decisions section."
- **Context mode** (F25): "The conversation above is the session this prompt will be sent into. Use it to resolve references ('the bug above', 'that file') into concrete names, and add a Context section only with facts from it. Don't continue the conversation and don't call tools."

The per-call message wraps the snapshot in `<repo>…</repo>` and the draft in `<draft>…</draft>` (plus `<previous>` and `<feedback>` on a refine), escaping any closing tag inside the person's text.

### A.8 Repository snapshot

```
<repo>
cwd: .   (root: agent-skills)
branch: feat/enrich-prd
status:
?? claude/plugins/in-progress/enrich/
top level: .claude-plugin/ .github/ claude/ skills/ LICENSE README.md
instructions: (none in this repository; the person's own ~/.claude/CLAUDE.md if present)
</repo>
```

Sources:
- cwd and root: `$.session` and the copied path helpers.
- Branch and status: `git rev-parse --abbrev-ref HEAD` and `git status --short --branch` through `$.process.run`, hooks off, at most 40 lines.
- Top level: `$.fs.list` of the root, at most 60 entries.
- Instructions: `CLAUDE.md`, `CLAUDE.local.md` and `.claude/CLAUDE.md` up the tree (`$.fs.ancestors`), plus the person's own.

Each part is cut to fit `contextChars`, instructions last, with a note saying what was cut.

### A.9 Sharing the band with `tree`

The band shows one tree. Enrich's rule: pass through (`next(e)`) while idle; draw the card alone while one is up, and yield to surveys. If M0 (S5) shows `tree`'s hook runs above enrich's, `tree` changes its AbovePrompt hook (`claude/plugins/in-progress/tree/hooks/register.tsx`, around line 1868) to call `next(e)` first and draw its preview only when nothing came back. The shared rule for both plugins: draw only into an empty band, and an enrich card wins.

### A.10 Tooling and tests

- `claude plugin validate`, `tsc -p` and `claude plugin test` on the plugin folder, as for `tree`.
- Unit tests, one file per pure module:
  - **parse:** tags; a missing closing tag; a whole-reply fence; a preamble; no tags; open questions as a heading, bold or numbered; none.
  - **answers:** all answered; some answered; an existing Decisions section; blank answers.
  - **meta:** size tiers; project house style over the person's; the refine message carries previous and feedback; closing tags escaped.
  - **snapshot:** caps and cut notes.
  - **preserve:** mentions, paths, fences and placeholders found, missing ones flagged.
  - **draft:** classification and placeholders.
  - **keys:** chord lookup, label, merge (a taken chord is refused; a new file gets `$schema` and `$docs`).
  - **view:** header text, buttons per phase, Edit primary when mentions are present.
- `flow.test.tsx`, mirroring `tree`'s `world()` stub helper (`tree/hooks/pane.test.tsx`):
  - **Stubs:**
    - a prompt box object behind `prompt.read`, `prompt.fill` and `prompt.submit`;
    - scripted `model.complete` and `model.fork`, the fork able to answer `nothing-to-fork`;
    - `fs.read` for the keybindings file and `enrich.md`;
    - `fs.list`, `fs.ancestors` and git through `process.run`;
    - the mocked clock.
  - **Mounts:** the hint line and the band on `terminal` and on `desktop`.
  - **Cases:**
    - trigger, take-out and the enriching card, with seconds after `advance(3000)`;
    - Send, Edit and Original;
    - Cancel mid-call ignoring the late result;
    - an aborted call leading to error and Retry;
    - refine carrying previous and feedback;
    - context mode and its fallback;
    - answering folding with no model call;
    - `hasSurvey` hiding the card and keeping state;
    - idle pass-through of another plugin's band tree;
    - reload mid-call and `/clear`;
    - a `/` draft refused;
    - the `no_composer` copy fallback;
    - an unbound chord;
    - a dropped mention warned.

### A.11 Engine references (Claude Code 2.1.296)

Line numbers in the engine's `claude-code.d.ts` for this build:

| What | Line |
|---|---|
| Button `action`, the borrowed-chord rule | 1096 |
| Button `hotkey`, bare digits from an empty composer | 1087 |
| `$.prompt.submit`, `read`, `fill` | 2944 |
| `$.ui.focus`, denied unless the site holds the keys | 2549 |
| `prompt.submit` event | 4100 |
| `$.model.complete` request | 6178 |
| `$.model.fork` request and `nothing-to-fork` | 6349 |
| Pane `focus`, granted over an empty composer | 7415 |
| `PromptBox` | 8307 |
| Plugin prompts don't expand mentions or pastes (`asUser`) | 9021 |
| `PromptHint` site, `isDraft` | 10225 |
| `AbovePrompt` site, `hasSurvey`, digits within the visible window | 10263 |

Keybinding actions with no default key that a Button could borrow: `diff:back` (DiffDialog, chosen), `app:cycleDiffBase` (DiffPanel; has `ctrl+x b`), `pane:next` and `pane:previous` (Pane), `footer:dismiss` (Footer), `app:toggleDiffPreSession`, `app:toggleDiffNoiseFilter` (Global).
