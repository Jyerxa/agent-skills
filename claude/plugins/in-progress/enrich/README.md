# enrich

Type a draft in the prompt box and press `ctrl+x r`, r for rewrite. Claude rewrites the draft for clarity and puts the result in its place. Read it, edit it like any prompt, and press Enter.

```
> the tree preview jumps back to the top every time i reopen a file. can
  we make it rember where i was█
  ? for shortcuts                                          ⌃x r enrich
```

```
> The tree preview jumps back to the top every time I reopen a file.
  Make it remember where I was.█
  ? for shortcuts                                          ⌃x r enrich
```

By default, the rewrite fixes spelling, makes the ask explicit, and turns several asks into a short list. It keeps your voice and adds nothing the draft doesn't say. @mentions, paths, code and URLs stay exactly as you wrote them.

Press `ctrl+x r` again before you edit the result to put your original back.

## Install

```
/plugin install enrich --marketplace jyerxa/agent-skills
```

Then bind the chord once, in `~/.claude/keybindings.json`:

```json
{
  "bindings": [
    { "context": "Chat", "bindings": { "ctrl+x r": "diff:back", "ctrl+x ctrl+r": "diff:back" } }
  ]
}
```

The `ctrl+x ctrl+r` binding makes the chord work when you hold ctrl through the `r`. If the file already has a `Chat` block, add the two bindings to it. Claude Code picks up the change without a restart.

Plugins can't register shortcuts of their own, so the chord borrows an engine action, `diff:back`. Only the diff dialog handles `diff:back`. While that dialog is open the prompt can't take the chord, so the two never clash.

To try it for one session from a checkout, without installing:

```
claude --plugin-dir claude/plugins/in-progress/enrich
```

## Details

- The hint line shows `⌃x r enrich` while you type. While the rewrite runs, it shows `✦ Claude is enriching…` with a highlight sweeping across it. On desktop, click the label instead of pressing the chord.
- If you keep typing while the rewrite runs, enrich discards the rewrite, keeps your draft, and shows a toast saying so.
- An error or a timeout leaves your draft alone and shows a toast saying why. The timeout is 30 seconds.
- The chord does nothing on a slash command or a `!` line.
- Each press makes one model call. The call sees only your draft, not the conversation.

## Configuration

Each field is a row in `/config` under the plugin's name. A change takes effect on the next press.

| Field | Default | Meaning |
|---|---|---|
| `model` | `claude-sonnet-5-5` | The model that rewrites your draft. Use an alias (`sonnet`, `haiku`, `opus`) or a full model id. |
| `effort` | `low` | How hard the model thinks, `low` to `max`. At `low` a rewrite takes a few seconds. |
| `instructions` | the rules above | How the model rewrites your draft. Clear the field to go back to the default. |

`instructions` is the part of the prompt you can change. Edit the default or replace it with your own, for example:

```
Rewrite it for clarity and fix spelling. Use a short "## Goal" and "## Success criteria" section, with the criteria as a checklist. Call the service "ledger", never "billing".
```

Two rules apply whatever you write. The model keeps your @mentions, paths, code, URLs and `[Image #1]` placeholders exactly as written, and it replies with the rewritten prompt and nothing else.

## Development

```
claude plugin validate claude/plugins/in-progress/enrich
claude plugin test claude/plugins/in-progress/enrich
```

When Claude Code loads the plugin, it writes this build's type declarations to `.claude-plugin/types/` and a `tsconfig.json` beside them. Git ignores both. After the first load, `tsc -p claude/plugins/in-progress/enrich` type-checks the plugin.
