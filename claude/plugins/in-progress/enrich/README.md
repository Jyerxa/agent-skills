# enrich

Improve a draft prompt in place, without leaving the prompt box. Enter still sends what you typed. Two chords rewrite the draft first.

```
> the tree preview jumps back to the top every time i reopen a file. can
  we make it rember where i was, per file probably. also maybe q should
  close it from the prompt too not just when the pane has focus idk.
  dont break the tests█
  ? for shortcuts                                 ⌃x e quick · ⌃x d deep
```

- **`ctrl+x e`, quick pass.** Tidies the draft in a few seconds. It fixes spelling, makes the ask explicit, and turns several asks into a short list. The size and shape stay the same, with no headings.
- **`ctrl+x d`, deep pass.** Interviews you, then writes.
  1. It reads the whole conversation and plans up to four questions about what it can't settle on its own.
  2. It asks them back to back in Claude Code's own question dialog. For each one you pick a suggested answer, type your own, or choose **You decide** to leave it to Claude.
  3. It writes a structured prompt with your answers built in.

Either way, the result replaces your draft in the prompt box. Read it there, edit it like any prompt, and press Enter. Press the same chord again to put your original back.

After a deep pass on the draft above, answering "only this session" and "separate task":

```
> ## Goal
  Make the `tree` plugin's file preview remember its scroll position per
  file, so reopening a file returns me to where I was instead of the
  top.

  ## Context
  - The position is `previewOffsetAtom`, which `openPreview` in
    `tree/hooks/register.tsx` resets to 0 on every open.

  ## Tasks
  - Keep each file's last position, and restore it when the file
    reopens.

  ## Scope
  - In: positions for this session only.
  - Out: `q` closing the preview from the prompt; that's a separate
    task.

  ## Guardrails
  - Don't break the existing `tree` tests.

  ## Success Criteria
  - Reopening a file shows the lines it showed when I left it.
  - The `tree` tests pass.█
           ✦ deep · 2 answers · 228 → 643 chars · ⌃x d undo · ⌃x e quick
```

The deep pass always uses these sections, in this order: Goal, Context, Tasks, Scope, Guardrails, Success Criteria. A section with nothing true to say is left out rather than padded. Your answers go in as decisions, so there are no open questions left to edit. The deep pass reads the conversation, so "the bug above" or "that file" becomes the real names.

## Requirements

- Claude Code 2.1.296 or later.
- The chords work in the terminal. In the desktop app, click the labels on the hint line instead.
- Two keybindings, added once (below). Plugins can't register shortcuts of their own, so each chord borrows an engine action that only the diff dialog uses.

## Install

```
/plugin install enrich --marketplace jyerxa/agent-skills
```

Answer `y` to add the marketplace, then pick the user scope. Then bind the two chords:

```
/enrich keys install
```

That adds `"ctrl+x e": "diff:back"` and `"ctrl+x d": "diff:nextSource"` to the Chat context of `~/.claude/keybindings.json` (or of your `CLAUDE_CONFIG_DIR`).
- It backs the file up to `keybindings.json.bak` first.
- It never replaces bindings you already have, and refuses a chord you've bound to something else.
- New bindings apply without a restart.

To add them by hand instead:

```json
{ "context": "Chat", "bindings": { "ctrl+x e": "diff:back", "ctrl+x d": "diff:nextSource" } }
```

From a local checkout, the same install reads the plugin straight from the checkout, so edits there take effect with `/reload-plugins`:

```
claude plugin install enrich --marketplace C:\path\to\agent-skills --scope user
```

(The marketplace is named `jyerxa-agent-skills`; the bare name `agent-skills` is reserved by Claude Code.) To try it for one session without installing:

```
claude --plugin-dir claude/plugins/in-progress/enrich
```

## Using it

| To | Do |
|---|---|
| Tidy a draft | `ctrl+x e` |
| Interview and restructure a draft | `ctrl+x d`, then answer each question: a number key, or the arrows and Enter. **Other** lets you type an answer, and **You decide** leaves the point to Claude. |
| Put your original back | The same chord again, before you edit the result |
| Run the other pass instead | The other chord on an untouched result runs that pass on your original, not on the result |
| Cancel | Either chord while a pass is waiting on the model; Esc while a question is up |
| Get text back later | `/enrich original` puts your last original draft in the box; `/enrich last` puts back the last result |
| Check the chords | `/enrich keys`; `/enrich` shows help |

The hint line under the prompt shows what's happening:

| Hint | Means |
|---|---|
| `⌃x e quick · ⌃x d deep` | You're typing a draft; either chord runs a pass |
| `✦ quick pass · 3s · ⌃x e cancel` | The quick pass is running |
| `✦ deep · reading · 6s · ⌃x d cancel` | The deep pass is reading the conversation and planning its questions |
| `✦ deep · question 1 of 2 · esc cancels` | A question is up |
| `✦ deep · writing · 4s · ⌃x d cancel` | The deep pass is writing the prompt with your answers |
| `✦ deep · 2 answers · 228 → 643 chars · ⌃x d undo · ⌃x e quick` | The result is in the box; it stays until your first edit |
| `⚠ dropped @src/a.ts` | The rewrite lost an `@mention`, path, code span, URL or paste placeholder from your draft. Undo is one chord away |
| `⌃x e/d unbound · /enrich keys install` | The chords aren't bound yet |

Your text is safe throughout:
- Your draft never leaves the box while a pass runs.
- A result lands only if the box still holds exactly what the pass started from. If you kept typing, the result is kept for `/enrich last` instead.
- Errors and timeouts leave the draft alone, and a toast says why.
- Slash commands and `!` lines are left alone.

Nothing is drawn above the prompt, so `ctrl+x tab` stays with other plugins, such as `tree`.

Pasted images: a pass keeps `[Image #1]` placeholders in the text, but whether the image stays attached after a pass hasn't been checked yet. To be safe, paste images after the pass.

## House style

Write standing preferences in Markdown, and both passes follow them:

- `~/.claude/enrich.md`: yours, in every project.
- `.claude/enrich.md` at the project root: this project's. It wins where the two conflict.

For example:

```markdown
- Write Success Criteria as checkboxes.
- Always name the test to add.
- Call the service "ledger", never "billing".
```

Both files are read on every pass, so edits apply at once. The `houseStyle` setting turns them off.

## Configuration

Each field is a row in `/config` under the plugin's name.

| Field | Default | Meaning |
|---|---|---|
| `quickModel` | `sonnet` | The quick pass's model: an alias (`sonnet`, `haiku`, `opus`) or a full model id. |
| `quickEffort` | `low` | How hard the quick pass thinks, `low` to `max`. |
| `deepFallbackModel` | `opus` | The deep pass reads the conversation through a fork of the session, on the session's own model. Before there is a conversation (a new session, or just after `/clear`) it runs on this model instead, and the hint says `deep · opus`. |
| `timeoutMs` | 90000 | Give up on a model call after this long. Time spent answering questions doesn't count. |
| `houseStyle` | true | Read the house style files. |
| `quickAction` | `diff:back` | The engine action `ctrl+x e` borrows. Change it only if a Claude Code update breaks the chord, then run `/enrich keys install` again. |
| `deepAction` | `diff:nextSource` | The engine action `ctrl+x d` borrows; it must differ from `quickAction`. |

## Cost

- **Quick:** one small call on `quickModel`.
- **Deep:** one or two reads of the session (one for a clear draft, two with questions). Each read gets the conversation from the prompt cache. On a long session that is about 150–300k cache-read tokens per read, billed at the cache-read rate.
- **Idle:** nothing runs. Timers exist only while a pass runs.

## Development

```
claude plugin validate claude/plugins/in-progress/enrich
claude plugin test claude/plugins/in-progress/enrich
```

Loading the plugin lays this build's type declarations in `.claude-plugin/types/` and a `tsconfig.json` beside them (both gitignored). After that, `tsc -p claude/plugins/in-progress/enrich` type-checks it. The product requirements, and the history of how the design got here, are in `docs/PRD.md`.
