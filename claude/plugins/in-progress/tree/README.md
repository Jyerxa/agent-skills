# tree

A live file tree pane for Claude Code. It shows the whole working directory beside the transcript, colors rows by `git status`, and shimmers the file Claude is editing.

```
agent-skills
⎇ codex/system-discovery  ↑1 ·5
▾ plugins
  ▾ tree
    ▾ .claude-plugin
        plugin.json              A
    ▾ docs
        PRD.md                   A
    ▾ hooks
      · git.ts                   ?
        hooks.json               A
      ● register.tsx             M
▾ skills
  ▾ pattern-design
g: changes  f: find  z: focus
h: ignored  r: refresh
c: fold  e: unfold
```

- The working directory's name heads the pane; hover it for the full path. The branch row shows ahead/behind and a dirty count, or `✓` when clean.
- While Claude has a file open, a pinned line under the header shows it (`● hooks/register.tsx`, shimmering); for a few seconds after, a dim `· last: …`. Click it to jump to the file.
- Faint indent guides mark each level; folder names are bold; file extensions are dim; hovering a row tints it, and the row holding the keyboard focus carries a `▍` mark at the left edge.
- Long paths show your home folder as `~` and elide their middle (`~/.claude/dev-mods/…/tree/README.md`); hover shows the whole path.
- **Ember glow.** While Claude writes a file, its row and the two rows above and below carry a warm tint in the accent color, the `●` breathes, and the guide from the folder down to the file lights up; the glow fades out over half a second when the edit ends.
- **Fold ripple.** Click a folder and its rows ripple out bottom-up before it folds, or ripple in top-down as it unfolds; under half a second however big the folder.
- **Focus cues.** While the pane holds the keyboard, an accent edge runs down its left side, the title turns the accent color, and the title row says `esc to leave`; otherwise it says `ctrl+x tab to focus`, dim. The thick segment of the edge marks the row the keyboard focus is on.
- `●` and a sweeping highlight: Claude is editing (or reading, muted) this file right now.
- `·`: Claude touched it earlier this session; the dot fades over two minutes.
- Name color and the letter at the right edge follow git: `M` modified, `S` staged, `A` added, `?` untracked, `D` deleted, `R` renamed, `!` conflicted.
- A folded folder shows how many changed files it holds.

## Requirements

- Claude Code 2.1.296 or later, in the fullscreen terminal layout. Run `/tui fullscreen` once if the pane appears above the prompt instead of beside the transcript; the dock needs 110 columns.
- `git` on the PATH. Outside a repository the tree still works, without colors.

## Install

```
/plugin install tree --marketplace jyerxa/agent-skills
```

Answer `y` to add the marketplace, then pick the user scope. From a local checkout, the same install reads the plugin straight from the checkout, so edits there take effect with `/reload-plugins`:

```
claude plugin install tree --marketplace C:\path\to\agent-skills --scope user
```

(The marketplace is named `jyerxa-agent-skills`; the bare name `agent-skills` is reserved by Claude Code.) To try it for one session without installing:

```
claude --plugin-dir claude/plugins/in-progress/tree
```

## Using it

The pane opens on its own in a terminal of 144 columns or more. `/tree` opens or closes it at any width. Close it with ctrl+x x and it stays closed for the session.

| Action | How |
|---|---|
| Mention a file in your next prompt | click it, or Tab to it and press Enter: `@path ` lands at the cursor |
| Fold or unfold a folder | click it |
| See what changed | `g` while focused, or `/tree changes`: changed files grouped by state with `+added −removed` counts; `g` again returns to the tree |
| Peek a diff | `±` on a row of the Changes view; `g` goes back |
| Find a file | `f` while focused, or `/tree find <text>`: fuzzy, so `prd` finds `docs/PRD.md`; Enter mentions the best match; `×` or `f` closes |
| Show only what's in play | `z` while focused: changed and touched files and the folders above them; `z` again shows everything |
| Focus the pane | ctrl+x tab (cycles band, panes, prompt) |
| Resize the dock | ctrl+x ← / ctrl+x → |
| Scroll | wheel, or ↑ ↓, PgUp PgDn, Home End while focused |
| Show gitignored entries | `h` while focused |
| Refresh now | `r` while focused, or `/tree refresh` |
| Fold or unfold everything | `c` / `e` while focused |
| Scroll to a file | `/tree reveal <path>` |
| Mention without the mouse | `/tree mention <path>` |

Hover a row to light it; hover a truncated name to see it whole.

The key legend is always pinned to the bottom of the pane, dim until the pane has the keyboard. Docked, the pane scrolls its own rows between the header and the legend, so both stay put as you wheel or arrow through a long tree; a slim scrollbar on the right and `↑ N more` / `↓ N more` lines at the edges show what's off screen.

The diff peek opens inside the tree pane rather than beside it: Claude Code shows one pane at a time, and a second pane would become a tab hiding the tree.

## Configuration

Each field is a row in `/config` under the plugin's name.

| Field | Default | Meaning |
|---|---|---|
| `side` | `left` | Preferred dock side. This Claude Code build docks every pane on the right and offers plugins no choice; the preference is stored for a build that does. |
| `columns` | 32 | Requested dock width. Your own resize wins. |
| `openOnStart` | true | Open the pane when a session starts. |
| `followClaude` | true | Unfold and scroll to the file Claude is editing. |
| `readsShimmer` | true | Shimmer (muted) on Read as well as on writes. |
| `shimmer` | `sweep` | `sweep`, `pulse` (bold blink, for reduced motion) or `off`. |
| `showIgnored` | false | Show gitignored entries, dimmed. |
| `compactFolders` | true | Draw single-child folder chains on one row. |
| `accent` | `#D97757` | Hex color for the glow, the lit guide and the focus edge. The glow's tints are blended from it toward a dark or light pane background, picked from your theme setting. |
| `glow` | true | Tint the rows around the file Claude is editing. |
| `animate` | true | Ripple rows when a folder opens or closes. |

## How it stays cheap

The tree is walked once at open, root first so the pane paints immediately. Git is polled every 3 seconds while a turn runs and every 20 seconds idle, and only while the pane is shown. A file tool call re-lists just that file's folder. The shimmer redraws ten times a second only while a file is active. Line counts are fetched only while the Changes view is open. A fold ripple runs a 30 fps frame clock only for its own half second. Nothing runs while the pane is hidden. Trees over 2,000 rows fold their deepest levels; nothing is hidden, only folded.

## Development

```
claude plugin validate claude/plugins/in-progress/tree
claude plugin test claude/plugins/in-progress/tree
```

Loading the plugin lays this build's type declarations in `.claude-plugin/types/` and a `tsconfig.json` beside them (both gitignored), after which `tsc -p claude/plugins/in-progress/tree` type-checks it. The product requirements are in `docs/PRD.md`.
