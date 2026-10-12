# PRD: Enrich, a prompt-improvement pass for Claude Code

**Version** 0.2, approved 2026-10-12. It replaces v0.1's review-card design; §10 says why.
**Author** jeremiah, drafted with Claude
**Target stack** Claude Code 2.1.296 function-hooks plugin ("mod"): a TypeScript/JSX hooks module. Model calls go through the engine's own client (`$.model.complete`, `$.model.fork`).

## 1. Overview

Claude does better with a prompt that states the goal, what it should know, what "done" looks like and what is still undecided. In practice the person types fast. Sometimes that's a one-line ask with a typo. Sometimes it's a brain dump of half-formed thoughts, with "maybe" and "idk" in it.

Enrich adds two chords to the prompt box. Enter still sends the draft as typed.

- **`ctrl+x e`, quick pass.** Tidies the draft: fixes spelling, makes the ask explicit, and turns several asks into a list. The size and shape stay the same, and it takes a few seconds.
- **`ctrl+x d`, deep pass.** Rewrites the draft with the whole conversation in view, as a structured prompt (Goal, Context, Done when, and so on). It lists what it couldn't know as open questions.

Either way, the improved prompt replaces the draft in the prompt box. The person reads it there, edits it like any prompt, and presses Enter. Pressing the same chord again puts the original back. There is no card, panel or button to learn, and nothing is drawn above the prompt.

Identity: plugin id `enrich`, slash command `/enrich`, folder `claude/plugins/in-progress/enrich` in the `agent-skills` repo.

## 2. Goals and non-goals

### Goals

- **Enter is untouched.** Sending as-is costs nothing and changes nothing.
- **Two chords, nothing else.** The whole interaction is: type, chord, read, edit, Enter.
- **The result lands in the prompt box.** The person already knows how to edit and send there, and `@mentions` and pasted images work as they always do.
- **Never invents.** Every requirement in the result traces to the draft, the person's house style or the conversation. Gaps are asked, not guessed.
- **Never loses text.** The draft stays in the box until the result replaces it. The same chord puts it back, and `/enrich original` brings it back later.
- **Quiet.** No timers run while idle. The only thing drawn is a few dim words on the hint line while a draft is typed.

### Non-goals

- No review card or panel. v0.1 had one; it was dropped on 2026-10-12 as too much to learn.
- No refine loop. To change the result, edit the text or run a pass again.
- No answer UI. Open questions are plain text at the end of the prompt. Answer them inline, delete them, or send them and let Claude ask.
- No automatic enrichment, no composer lint, no prompt library.

## 3. Personas

- **The brain-dumper.** Types a paragraph of loosely connected thoughts while thinking out loud. Wants it turned into something Claude can act on, without losing anything they said. Reaches for `ctrl+x d`.
- **The one-liner.** Fires short asks between tasks ("fix the flaky test"). Wants the typos and the vague verb fixed without being slowed down. Reaches for `ctrl+x e`, or just Enter.

## 4. Functional requirements

### 4.1 Chords

- F1. Enter submits the draft exactly as today. The plugin never changes or drops a submission.
- F2. `ctrl+x e` starts a quick pass and `ctrl+x d` starts a deep pass on the draft in the box.
  - Plugins cannot register keybinding actions. Each chord therefore reaches the plugin through a Button in the hint line under the prompt (`PromptHint`). The Button's `action` names a borrowed engine keybinding action: `diff:back` for quick and `diff:nextSource` for deep (config `quickAction`, `deepAction`).
  - The person binds the two chords once, in the Chat context (F21).
  - The Buttons are mounted only while the box holds a draft or a pass is running.
- F3. While a draft is typed, the hint line shows the chords at its right end (§5.1). Each label can also be clicked. That is how the desktop app runs a pass, since chords work only in the terminal.
- F4. Slash commands and bash lines are refused with a toast and left untouched: anything starting with `/` or `!`. A leading `#` is not refused, because a deep result starts with `## Goal` and a pass on it must still run. On an empty box the chords do nothing.

### 4.2 While a pass runs

- F5. The draft stays in the box, untouched. The hint line shows the pass and the elapsed seconds: `✦ deep pass · 6s · ⌃x d cancel`.
- F6. Either chord cancels the running pass. The draft is left as it is, and a result that arrives late is dropped.
- F7. The person may keep typing, or send the draft with Enter, while a pass runs. The result is applied only if the box still holds exactly the text the pass started from. Otherwise the box is left alone and a toast says `draft changed, result not applied (/enrich last)`.
- F8. A pass may run while a Claude turn is running; both brains work mid-turn (M0, S11).

### 4.3 The result

- F9. The result replaces the box's text (`$.prompt.fill`, replace), with the cursor at the end. Until the person's first edit, the hint line says what happened and shows what the two chords now do: `✦ quick · 228 → 239 chars · ⌃x e undo · ⌃x d deep`.
- F10. **Undo.** While the box still holds the untouched result, the same chord puts the original draft back. The other chord runs its own pass on the original draft rather than on the result, so running quick then deep doesn't compound.
- F11. Once the person edits the result, both chords treat the box as it stands, like any draft.
- F12. **Verbatim check.** After each pass, the plugin checks that every `@mention`, path, inline code span, URL and paste placeholder in the draft survived.
  - If one is missing, the hint line names it, for example `⚠ dropped @hooks/register.tsx`.
  - The result is still applied, because undo is one chord away.
- F13. If the pass fails (an API error, an empty reply or a timeout), the box is untouched and a toast names the reason.
- F14. Every result and its original are written to `$.store` (key `last`). `/enrich original` puts the last original back in the box, and `/enrich last` puts back the last result. Both work even after a restart.

### 4.4 Quick and deep

| | Quick, `ctrl+x e` | Deep, `ctrl+x d` |
|---|---|---|
| Call | One `$.model.complete` | One `$.model.fork`, which runs on the session's model and system prompt and reads the whole conversation from the main thread's prompt cache |
| Model | `quickModel` (default `sonnet`) at `quickEffort` (default `low`) | The session's own. With nothing to fork yet (the first prompt, or just after `/clear`), it falls back to one `$.model.complete` on `deepFallbackModel` (default `opus`), and the hint line says `deep · opus` |
| Sees | The draft and the house style | The draft, the house style and the conversation |
| Does | Fixes spelling and grammar. Makes the ask explicit. Turns several asks into a short list, with no headings. Keeps hedges as written. Stays about the same length. | Uses sections, but only those with real content, in this order: Goal, Context, Requirements, Done when, Out of scope, Open questions. Resolves "the bug above" or "that file" into real names. A hedge that changes the work becomes an open question. |
| Typical time | 2–5 s | 10–30 s, longer on long sessions |

### 4.5 What a pass may do

The full instructions are in A.6. The contract:

- F15. Rewrite, never answer. The output is a prompt for Claude Code to act on, not a reply to it.
- F16. Never invent. No requirement, file, name, number, constraint or technology without a source in the draft, the house style or the conversation.
- F17. Keep these verbatim: `@mentions`, paths, identifiers, inline code, code blocks, URLs, error text, quotes and paste placeholders.
- F18. Keep the author's voice: first person and their terms, with spelling fixed. No pleasantries and no commentary about the rewrite.
- F19. Deep only:
  - at most 5 open questions, each answerable in a few words, always the last section;
  - length at most the larger of 600 characters and 3× the draft, or 1.5× the draft plus 1,500 for drafts over 1,000 characters.

### 4.6 House style

- F20. Standing preferences can be written in Markdown and are appended to the instructions for both passes:
  - `~/.claude/enrich.md` (the person's);
  - `<repository root>/.claude/enrich.md` (the project's), which wins where the two conflict.

  They are read on every pass, so edits apply at once. Config `houseStyle` turns both off. Examples: "acceptance criteria as checkboxes", "always name the test to add".

### 4.7 Commands and configuration

- F21. Commands:
  - `/enrich` prints help: both chords and whether each is bound.
  - `/enrich keys` reports the binding status and prints the snippet to add.
  - `/enrich keys install` merges both bindings into the Chat context of `~/.claude/keybindings.json`, respecting `CLAUDE_CONFIG_DIR`.
    - It never replaces the file, and it writes a `.bak` first.
    - It adds `$schema` and `$docs` when it creates the file.
    - It refuses a chord that is already bound to something else, and names what.
- F22. `/enrich original` and `/enrich last` (F14).
- F23. While a chord is unbound, the hint line says so in place of the chords (§5.5).

Configuration (`userConfig`, each a row in the config menu):

| Field | Default | Meaning |
|---|---|---|
| `quickModel` | `sonnet` | Quick-pass model, an alias or a full model id |
| `quickEffort` | `low` | Quick-pass effort, `low` to `max` |
| `deepFallbackModel` | `opus` | Deep pass when there is no conversation to fork |
| `timeoutMs` | 90000 | Give up after this long |
| `quickAction` | `diff:back` | The engine action `ctrl+x e` is bound to (A.8) |
| `deepAction` | `diff:nextSource` | The engine action `ctrl+x d` is bound to (A.8) |
| `houseStyle` | `true` | Read the house style files |

### 4.8 Later

- A review card, v0.1's design, as an opt-in for people who want to read the result before the box changes.
- Refining with typed feedback.
- Composer lint.
- A grounded deep pass: a read-only subagent opens the files the draft mentions before rewriting.
- A repository snapshot (git status, top-level listing, CLAUDE.md) for the quick pass and the deep fallback.
- `/enrich history`.
- Pasted images through a pass: check that an `[Image #1]` placeholder still attaches its image after the fill (probe P4), and refuse or warn if it doesn't.

## 5. Visual design

The examples use one real draft about this repository's `tree` plugin, typed the way drafts usually are. Only the hint line under the prompt changes. The plugin's words are dim, and `✦` is in the `claude` accent.

### 5.1 Typing

```
  …transcript…

> the tree preview jumps back to the top every time i reopen a file. can
  we make it rember where i was, per file probably. also maybe q should
  close it from the prompt too not just when the pane has focus idk.
  dont break the tests█
  ? for shortcuts                                 ⌃x e quick · ⌃x d deep
```

### 5.2 Running

The draft stays where it is. Seconds count up, and the same chord cancels.

```
  …transcript…

> the tree preview jumps back to the top every time i reopen a file. can
  we make it rember where i was, per file probably. also maybe q should
  close it from the prompt too not just when the pane has focus idk.
  dont break the tests█
  ? for shortcuts                         ✦ deep pass · 6s · ⌃x d cancel
```

### 5.3 After a quick pass

Spelling is fixed and the ask is explicit. The hedges stay, and so does the shape.

```
  …transcript…

> The tree preview jumps back to the top every time I reopen a file.
  Make it remember where I was, per file probably. Also, maybe `q`
  should close it from the prompt too, not just when the pane has focus;
  I'm not sure. Don't break the tests.█
  ? for shortcuts      ✦ quick · 228 → 239 chars · ⌃x e undo · ⌃x d deep
```

### 5.4 After a deep pass

This is a session that had already read `tree/hooks/register.tsx`. The fork can name the real code, and it turns the hedges into questions.

```
  …transcript…

> ## Goal
  Make the `tree` plugin's file preview remember its scroll position per
  file, so reopening a file returns me to where I was instead of the
  top.

  ## Context
  - The preview's position is `previewOffsetAtom`, which `openPreview`
    in `tree/hooks/register.tsx` resets to 0 on every open.

  ## Done when
  - Reopening a file shows the lines it showed when I left it.
  - The existing `tree` tests still pass.

  ## Open questions
  - Remember positions across sessions, or only this one?
  - Should `q` also close the preview while the prompt has focus?█
  ? for shortcuts      ✦ deep · 228 → 541 chars · ⌃x d undo · ⌃x e quick
```

From here the person can:
- answer a question inline (`- Remember positions across sessions, or only this one? This session only.`);
- delete the questions;
- press Enter as it is and let Claude ask.

### 5.5 No chord bound

```
  …transcript…

> make the tree legend wrap on narrow panes█
  ? for shortcuts                  ⌃x e/d unbound · /enrich keys install
```

## 6. Non-functional requirements

### 6.1 Latency

- After a chord, the hint line shows the running pass within 100 ms. The draft never leaves the box, so there is nothing else to wait for.
- Quick: median under 5 s for a 300-word draft on `sonnet` at `low` effort.
- Deep: under 30 s on a typical session. A fork's time grows with the transcript; on a long session, a trivial fork reply took about 8 s (M0, S11).

### 6.2 Cost

- Quick sends its fixed instructions and the house style first, marked for the prompt cache.
- Deep reads the conversation from the main thread's prompt cache. On a long session that is about 300k cache-read tokens per press (measured 2026-10-11), billed at the cache-read rate. Deep runs only when the person presses its chord.

### 6.3 Never losing text

The invariant: at every moment the original draft is in one of three places:
- in the box;
- one chord away, while the box holds an untouched result;
- in `$.store`, behind `/enrich original`.

The plugin writes to the box only when the box holds exactly the text the pass started from. Tests cover each path.

### 6.4 Quiet when idle

- No timers run unless a pass is running. The seconds ticker stops with the pass.
- One `prompt.edit` hook, which passes every edit straight through. It does work only while a result's hint is up, to retire that hint on the first edit.
- The hint line redraws only when the engine redraws it, plus once a second while a pass runs.

### 6.5 Platforms

- Terminal first. The hint line exists in both the normal and the fullscreen layout.
- Desktop: the engine raises the hint line there too. The labels are clickable, but chords are terminal-only.
- Theme keys only (`claude`, `subtle`, `warning`), so light, dark and custom themes need no configuration.
- Nothing is drawn above the prompt. `ctrl+x tab` and the band stay with other plugins, such as `tree`'s file preview.

## 7. Constraints and risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Plugins cannot register keybinding actions.** A chord reaches a plugin from the prompt only through a Button whose `action` names an engine action. The person's chord for that action presses it while the Button is mounted, no dialog is up, and no engine handler of that action is mounted. | Both chords depend on borrowing engine actions, and the person binds them once. A future build could mount those actions' handlers or rename them. | `diff:back` and `diff:nextSource` are handled only inside the modal diff dialog, which blocks plugin Buttons anyway. `quickAction` and `deepAction` are pickers, and `/enrich keys install` does the binding. Re-run M0's probes S1 and P1 on every Claude Code update. |
| The result overwrites the draft. | A bad rewrite replaces good text. | It is applied only over the exact text it started from (F7). The same chord undoes it (F10). `/enrich original` restores it after edits (F14). |
| The rewrite invents requirements or drops something. | A wrong prompt is sent with confidence. | Strict rules (A.6), the verbatim check (F12), and undo one chord away. |
| A deep pass is slow and reads a lot of cache on long sessions. | Waiting, and cost. | It is opt-in per press. The seconds show in the hint line, and either chord cancels. Quick is the cheap default. |
| A paste placeholder that goes back into the box may not still be bound to its image. | An image could detach after a pass. | Deferred to a later pass (§4.8). Meanwhile the verbatim check names a placeholder the rewrite dropped, and undo is one chord away. |
| A long deep result makes the prompt box tall. | The transcript gets less room while editing. | Deep's length cap (F19). `ctrl+g` opens the external editor. |
| A hot reload drops module variables. | A pass in flight is lost. | The draft never left the box. A reload mid-pass just ends the pass. |

## 8. Success metrics

- No lost text: across the tests and a week of use, every path leaves the original reachable.
- A clear one-liner comes back from a quick pass at most 1.3× its length, with no headings.
- On 10 real brain dumps, a deep pass returns Goal and Done when, and no requirement lacks a source in the draft, house style or conversation.
- Chord to running hint: under 100 ms. Quick median under 5 s.
- After a week, the person's own judgment is that they reach for `⌃x d` on brain dumps, `⌃x e` on sloppy one-liners, and Enter on the rest.

## 9. Milestones

| M | Deliverable | Done when |
|---|---|---|
| M0 Spike | A throwaway mod running the probes in §10.1. Round 3 is a working prototype of both chords. | Every row of §10.1 has a result, and the person has used both chords live and agreed v0.2. |
| M1 Quick pass | <ul><li>Manifest and state contract</li><li>Both chord Buttons and the hint line</li><li>`/enrich`, `keys`, `keys install`, `original` and `last`</li><li>The quick brain</li><li>Apply only over the start text; undo; cancel; errors</li><li>The verbatim check</li></ul> | `⌃x e` on a draft replaces it with a tidied version, and `⌃x e` again restores it. `claude plugin validate`, `tsc -p` and `claude plugin test` are green. |
| M2 Deep pass | <ul><li>The fork, with its `opus` fallback</li><li>The timeout</li><li>House style</li></ul> | In a session that discussed a bug, `⌃x d` on "fix the bug above" names the real file. In a fresh session it falls back and says so. |
| M3 Ship | <ul><li>README</li><li>A root `marketplace.json` entry and a root README row</li><li>Tests on `terminal` and `desktop`</li></ul> | `/plugin install enrich --marketplace jyerxa/agent-skills` works on a clean machine, and the tests are green. |

## 10. Decision log

| Date | Decision |
|---|---|
| 2026-10-11 | v0.1: a review card above the prompt, a `fast`/`context` setting plus `5: Full context`, a refine loop, answering open questions in the card, and house style. Chord `ctrl+x e` on the borrowed `diff:back`. Name `enrich`. Approved, then superseded by v0.2. |
| 2026-10-11 | Plugins cannot register keybinding actions, so chords borrow engine actions through a Button's `action` prop in the hint line. Still true in v0.2. |
| 2026-10-12 | The person tried the card in the spike: "This interaction model is too complex for this to be useful." v0.2 drops the card, the refine loop, the answer UI, digit hotkeys and any use of `ctrl+x tab`. |
| 2026-10-12 | Two chords: `ctrl+x e` for a quick pass and `ctrl+x d` for a deep pass. They replace v0.1's `mode` setting and `5: Full context`. |
| 2026-10-12 | The result replaces the draft in the prompt box. v0.1 had rejected this in favour of the card; reversed. |
| 2026-10-12 | Undo is the same chord on the untouched result. The other chord runs its pass from the original. |
| 2026-10-12 | Quick is v0.1's fast brain, without the repository snapshot. Deep is v0.1's context brain (a fork of the session), with an `opus` one-shot when there is nothing to fork. |
| 2026-10-12 | Open questions stay as plain text at the end of a deep result. |
| 2026-10-12 | Nothing is drawn above the prompt, so `ctrl+x tab` always reaches the `tree` pane, as the person asked. |
| 2026-10-12 | The second borrowed action is `diff:nextSource`. Like `diff:back`, its only handler is inside the modal diff dialog. |
| 2026-10-12 | Additions not asked for: the verbatim check and its hint (F12); `/enrich original` and `/enrich last` (F14); refusing a pass when the draft changed mid-run (F7); clickable labels for desktop. |
| 2026-10-12 | PRD v0.2 approved by the person after using both chords in the round 3 prototype, including the additions above. |
| 2026-10-12 | M1: drafts starting with `#` are no longer refused (F4), since deep results start with a heading. A test cannot raise the person's own `prompt.edit`, so retiring the result's hint on the first edit is checked live, not in `flow.test.tsx`. |
| 2026-10-12 | M1 checked live by the person: the quick pass, undo by the same chord, the hint retiring on the first edit, a result not applied after typing mid-pass, and the hint line's look. Images through a pass are deferred to a later pass. |

### 10.1 M0 probes

Rounds 1 and 2 tested v0.1's design; v0.2 makes some of them moot.

| # | Probe | Result |
|---|---|---|
| S1 | A `diff:back` Button in the hint line, with `"ctrl+x e": "diff:back"` in the Chat context | **Works.** It fires from the prompt, and the binding applied without a restart (2026-10-11, and again 2026-10-12). |
| S2 | `app:cycleDiffBase` and `pane:next` as borrowed actions | Both fire from a hint-line Button with the `tree` pane open. Not tested with the diff panel open. Unused in v0.2. |
| S3 | A Button inside `display: 'none'` | **Fires** (`ctrl+x 1`, twice). v0.2 uses it for the other pass's cancel while one pass runs. |
| S4 | The hint line drawn as our own row around `next(e)` | `next(e)` is the engine's line (`{type: engine}`), and it redraws normally. Whether the left side looks right: open, see round 3. |
| S5 | What `next(e)` holds in the band | The engine's own. Moot: v0.2 draws no band. |
| S6 | `alt+e` reaching `prompt.edit` | No modified key was seen. Moot. |
| S7 | `fill({ text: '' })` and filling the text back | **Both work.** `{isFilled: true}`, and the cursor lands at the end. |
| S8 | A pasted image through take-out and put-back | Not run. Becomes P4. |
| S9 | A bare digit from the empty box pressing a band Button | **Works.** Moot. |
| — | `ctrl+x tab` with a band card up | It focuses the card, not `tree`. This finding drove v0.2's rule of drawing nothing above the prompt. |
| S10 | `/enrich <text>` | Not run. Moot. |
| S11 | A model call started from `$.clock.after(0)`; a fork while a turn runs | **Both work.** `complete` on `haiku` took about 1 s. A fork mid-turn on a long session took about 8 s and about 305k cache-read tokens. |

Round 3 is the two-chord prototype:

| # | Probe | Decides | Result |
|---|---|---|---|
| P1 | `ctrl+x d` bound to `diff:nextSource` fires its hint Button, with `tree` open | The deep chord | **Works.** It fired the deep Button, and the new binding applied without a restart. |
| P2 | Both passes end to end: time, usage, a multi-line result filled into the box, cursor at the end, Enter sending it | The brains; F9 | **Both work.** Each result filled the box with the cursor at the end. Quick on `sonnet`: 1.2 s, 395 tokens in and 15 out. Its instructions are too short to cache yet (0 cache read). Deep by fork on this long session: 5.0 s, 511 in and 421 out, 166k cache read. Enter after a fill not yet checked. |
| P3 | Does the box's own undo (`ctrl+_`) revert a plugin's fill? What does `prompt.edit` see? | Whether F10 needs mentioning beside `ctrl+_` | **Moot.** In Windows Terminal `ctrl+_` never reaches Claude Code; the terminal zooms out instead. The same chord is the undo (F10). |
| P4 | `[Image #1]` kept by a pass: after the fill, does Enter still attach the image? | Attachment policy (§7) | **Deferred.** The person set images aside for a later pass (§4.8). |
| P5 | Typing while a pass runs: the result isn't applied, and a toast says so | F7 | **Works live** (M1). |
| P6 | A deep pass while idle, while a turn runs, and in a fresh session (`nothing-to-fork`, then `opus`) | Deep fallback | |
| S4 | Does the hint line's left side (the engine's pills) look normal next to the chords? | The hint host | **Looks normal live** (M1). |

## Appendix A. Technical design

### A.1 Files

```
claude/plugins/in-progress/enrich/
  .claude-plugin/plugin.json   name, version, description, author, types, userConfig (§4.7)
  .gitignore                   .claude-plugin/types/, tsconfig.json (written by the engine)
  README.md                    install, binding the chords, using them, configuration
  docs/PRD.md                  this file
  hooks/hooks.json             { "modules": ["./register.tsx"] }
  hooks/register.tsx           every hook, every atom, every function that takes $, all JSX
  hooks/meta.ts                the quick and deep instructions and the per-call prompt (A.6)
  hooks/parse.ts               parseReply (A.5)
  hooks/preserve.ts            tokens that must survive; which went missing (F12)
  hooks/draft.ts               classifyDraft: empty, command, bash, ok
  hooks/keys.ts                find the chord bound to an action; label it (⌃x e); merge bindings
  hooks/*.test.ts              one per pure module
  hooks/flow.test.tsx          integration: the hint line and the box, on terminal and desktop
  types/index.d.ts             the PluginState contract (A.2)
```

The engine's static scanner refuses `$` passed to any function not declared at the top level of the hooks module. Atoms must be declared in the file that reads them. So the pure modules never take `$`.

### A.2 State

```ts
export type EnrichPass = 'quick' | 'deep'
export type EnrichJob = {
  id: number; pass: EnrichPass
  source: string      // the text being improved
  box: string         // what the box held at the start; it must still hold it to apply
  startedAt: number
}
export type EnrichResult = {
  pass: EnrichPass; original: string; text: string
  model: string; warnings: string[]
}

declare module 'claude-code' {
  interface PluginState {
    enrich: {
      job: EnrichJob | null         // the pass in flight
      elapsed: number               // seconds, for the hint line
      result: EnrichResult | null   // the applied result, until the person's first edit
      binding: { quick: string | null; deep: string | null }   // chord labels, null when unbound
    }
  }
}
```

Module variables, lost on reload (which is fine): the parsed config, the `AbortController` of a `complete` call, and the ticker. `$.store` holds `last` (F14).

### A.3 Hooks

| Hook | Does |
|---|---|
| `session.start` | Registers `/enrich`, reads the keybindings file into `binding`, and clears a `job` a reload cut short. |
| `command.run` `{ command: 'enrich' }` | Help, `keys`, `keys install`, `original`, `last`. |
| `ui.render` `PromptHint` | With no draft and no pass running: `next(e)`. Otherwise a row holding `next(e)` and, at the right, the two chord Buttons with labels by state (§5). The other pass's Button stays mounted, hidden, so either chord cancels. |
| `prompt.edit` | Passes through. If `result` is set and the edit changes text, it clears `result`. |
| `session.end` `reason: 'clear'` | Cancels a running pass. |

One top-level `chord($, pass)` decides what a press does:
- a pass is running: cancel it;
- the box holds the untouched result: the same pass undoes, the other pass runs from the original;
- the draft is refused (F4): toast;
- otherwise: start the pass.

### A.4 Passes: scheduling, cancel, timeout

- A press only writes state and schedules the call with `$.clock.after(0, …)`, so the model call never runs inside the press's dispatch.
- Every pass carries an id. A result whose id is no longer `job.id` is dropped; this is how cancel works for `fork`, which takes no abort signal.
- `complete` calls get an `AbortController` and `timeoutMs`. A fork gets a `$.clock.after(timeoutMs)` timer that fails the pass.
- A `$.clock.every(1000)` ticker writes `elapsed` while a pass runs.
- Applying a result:
  1. read the box;
  2. compare it with `job.box`;
  3. fill;
  4. set `result` from the fill's returned text, so a later comparison sees exactly what the box holds.

### A.5 Reply contract and parser

The model replies `<prompt>…the improved prompt…</prompt>` and nothing else. `parseReply` works in this order:

1. It normalises line endings.
2. It takes the text from the first `<prompt>` to the last `</prompt>`. If the closing tag is missing, it takes the rest.
3. With no tag at all, it unwraps a single code fence around the whole reply.
4. It trims the result. An empty result is an error (F13).

### A.6 Instructions (draft, as running in the round 3 spike)

Shared tail, used by both passes:

```
Never invent. Every requirement, constraint, file, name, number and
technology must come from the draft or the conversation.

Keep verbatim: @mentions, file paths, identifiers, inline code and code
blocks, URLs, error messages, quoted text, and placeholders such as
[Image #1] or [Pasted text #1 +12 lines].

Keep the author's voice: first person, their terms. No pleasantries and no
commentary about the rewrite.

Reply with exactly this and nothing else:
<prompt>
the improved prompt
</prompt>
```

Quick (the cached `system` of a `complete` call):

```
You tidy a developer's draft prompt for Claude Code, an agentic coding
assistant that will act on it in their repository. You never answer the
draft or do the work it asks for; you return the draft, improved.

Make a light pass:
- Fix spelling and grammar, and anything that would mislead.
- Make the ask explicit: what to do, and to what.
- Several separate asks become a short list; otherwise keep prose. No
  headings.
- Keep hedges ("maybe", "not sure") as the author wrote them.
- Keep about the same length. A draft that is already clear comes back
  nearly unchanged.
```

Deep (the head of the fork's prompt; the `system` of the fallback):

```
Stop: don't continue the conversation and don't call tools. The developer
has drafted their next prompt for this session and wants it rewritten
before they send it. Return the draft rewritten so Claude Code can act on
it well; never answer it or do the work.

Restructure it:
- Use only the sections that have real content, in this order: Goal,
  Context, Requirements, Done when, Out of scope, Open questions. A short
  draft can stay one tight paragraph plus "Done when".
- Use the conversation, when there is one, to resolve references ("the
  bug above", "that file") into concrete names. Add a Context section only
  with facts from it that the work needs.
- When something the work depends on is missing or ambiguous, ask instead
  of guessing: put it under "## Open questions" as the last section, at
  most 5, each answerable in a few words. A hedge that changes what gets
  built becomes a question; one that doesn't stays as written.
- Length: at most the larger of 600 characters and 3 times the draft.
```

Appended when present: `## House style (yours)` and `## House style (this project)`, then "Where they conflict, follow this project's." The draft goes last, as `<draft>…</draft>`, with any `</draft>` inside it escaped.

### A.7 Tooling and tests

- `claude plugin validate`, `tsc -p` and `claude plugin test` on the plugin folder, as for `tree`.
- Unit tests, one file per pure module:
  - **parse:** a tagged reply; a missing closing tag; a fenced reply; an empty reply.
  - **meta:** quick and deep prompts; the project's house style over the person's; `</draft>` escaped.
  - **preserve:** mentions, paths, code spans, URLs and placeholders found; missing ones named.
  - **draft:** classification.
  - **keys:** chord lookup and labels; merging (a taken chord refused; a new file gets `$schema` and `$docs`).
- `flow.test.tsx`, mirroring `tree`'s `world()` stub helper (`tree/hooks/pane.test.tsx`):
  - **Stubs:**
    - a prompt box behind `prompt.read` and `prompt.fill`;
    - scripted `model.complete` and `model.fork`, the fork able to answer `nothing-to-fork`;
    - `fs.read` for the keybindings file and `enrich.md`;
    - the mocked clock.
  - **Cases:**
    - each chord starts its pass, and the hint shows the seconds;
    - the result fills the box and the hint shows undo;
    - the same chord undoes; the other chord runs from the original;
    - an edit retires the hint, after which a chord runs on the edited text;
    - cancel ignores the late result;
    - a draft changed mid-pass leaves the box alone and toasts;
    - an error leaves the box alone;
    - deep falls back on `nothing-to-fork`;
    - a dropped mention is named;
    - `/` and `!` drafts are refused;
    - an unbound chord;
    - `/enrich original` and `/enrich last`;
    - `/clear` mid-pass;
    - the desktop surface.

### A.8 Engine references (Claude Code 2.1.296)

Line numbers in the engine's `claude-code.d.ts` for this build:

| What | Line |
|---|---|
| Button `action`, the borrowed-chord rule | 1096 |
| `$.ui.toast` | 2453 |
| `$.model.complete`, `$.model.fork` | 2624 |
| `$.prompt.read`, `fill` | 2944 |
| `ModelCompleteRequest`, `ModelCompleteResult` | 6178 |
| `ModelForkRequest`, `nothing-to-fork` | 6349 |
| `PromptEditInput` | 8540 |
| `PromptFillArgs` | 8621 |
| `PromptHint` site, `isDraft` | 10225 |

Keybinding actions whose only handler lives inside the modal diff dialog, and which a Button can therefore borrow from the prompt: `diff:back` (no default key; used for quick) and `diff:nextSource` (default `right`, in DiffDialog only; used for deep). Others are `diff:previousSource`, `diff:previousFile` and `diff:nextFile`.
