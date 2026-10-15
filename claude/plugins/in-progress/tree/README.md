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
c: fold  e: unfold  m: mention
o: editor  j: ↓  k: ↑
```

- The working directory's name heads the pane; hover it for the full path. The branch row shows ahead/behind and a dirty count, or `✓` when clean.
- While Claude has a file open, a pinned line under the header shows it (`● hooks/register.tsx`, shimmering); for a few seconds after, a dim `· last: …`. Click it to jump to the file.
- **Glass.** The pane is a slab of smoked glass lit from the top by the accent: a warm wash under the title easing into a cool violet at the bottom, and a shelf under the legend. Its outermost cells on every side are only partly glass, so the slab fades into the terminal (`#121212` on a dark theme) instead of ending at a border. The title runs a gradient, ember to lavender. Claude's attention is light moving through it: cool moonlight on a file it reads, an ember on a file it writes, an afterglow that cools as it fades. A terminal has no alpha or blur, so every tint is a color blended from your `accent` over the slab, for a dark or light theme picked from your theme setting; `glass: false` takes the slab away.
- Indent guides mark each level, each a faint step along the dusk from ember to violet; folder names are bold; file extensions are dim; hovering a row lifts it, and the row holding the keyboard focus carries a `▍` mark at the left edge.
- Long paths show your home folder as `~` and elide their middle (`~/.claude/dev-mods/…/tree/README.md`); hover shows the whole path.
- **Ember glow.** While Claude writes a file, a soft bell of light in the accent color sits over its row and fades across the four rows either side, the rim beside it lights, the `●` breathes in glyph and color, and the guide from the folder down to the file lights up; the glow fades out smoothly over half a second when the edit ends.
- **Fold ripple.** Click a folder and its rows ripple out bottom-up before it folds, or ripple in top-down as it unfolds, a faint wash of light passing with them; under half a second however big the folder.
- **Focus cues.** While the pane holds the keyboard, a light pipe runs down its left side, ember at the top to violet at the bottom, the title's gradient brightens, and the title row says `esc to leave`; otherwise it says `ctrl+x tab to focus`, dim. The thick segment of the edge marks the row the keyboard focus is on.
- `●` and a soft band of light sweeping through the name: Claude is editing (ember) or reading (moonlight) this file right now.
- `·`: Claude touched it earlier this session; the dot cools from ember through violet to a faint silver over two minutes.
- Name color and the chip at the right edge follow git: `M` modified, `S` staged, `A` added, `?` untracked, `D` deleted, `R` renamed, `!` conflicted. The branch row's status sits in a pill tinted the same way.
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
| Move through the tree | ↑ ↓ or `j` `k` while focused move the row cursor (the `▍` row); PgUp PgDn a page, Home End the ends. The window follows the cursor; the wheel scrolls without moving it |
| Read a file | click it, or Enter on the cursor's row: the file opens above the prompt, where plan mode shows, as wide as the transcript and highlighted with line numbers. The tree stays in the pane and keeps the keyboard: ↑ ↓ / `j` `k`, PgUp PgDn and Home End scroll the file, the wheel over it does too, and `q` (or the `‹` path row) closes it with the cursor where it was |
| Fold or unfold a folder | click it, or Enter on it. Folders named in `collapsedFolders` (`node_modules` by default) start folded, with a dim count of changed files; open one the same way, and your choice is remembered |
| Mention a file in your next prompt | `m` on the cursor's row, or in the preview: `@path ` lands at the composer's cursor (a folder mentions as `@folder/ `) |
| Open a file in your editor | `o` on the cursor's row, or in the preview at the top line in view; runs the `editor` setting |
| See what changed | `g` while focused, or `/tree changes`: changed files grouped by state with `+added −removed` counts; `g` again returns to the tree |
| Peek a diff | `±` on a row of the Changes view; `g` goes back |
| Find a file | `f` while focused, or `/tree find <text>`: fuzzy, so `prd` finds `docs/PRD.md`; Enter previews the best match; `×` or `f` closes |
| Show only what's in play | `z` while focused: changed and touched files and the folders above them; `z` again shows everything |
| Focus the pane | ctrl+x tab (cycles band, panes, prompt) |
| Resize the dock | ctrl+x ← / ctrl+x → |
| Scroll | the wheel |
| Show gitignored entries | `h` while focused |
| Refresh now | `r` while focused, or `/tree refresh` |
| Fold or unfold everything | `c` / `e` while focused. `e` leaves the folders that start folded folded; open those one at a time |
| Scroll to a file | `/tree reveal <path>` |
| Mention or preview from the prompt | `/tree mention <path>`, `/tree preview <path>` |

Space can't be bound: Claude Code gives a pane only one-letter or one-digit hotkeys, so Enter does the folding. A click and Enter are the same press to Claude Code, which is why a click previews rather than mentions. Esc hands the keyboard back to the prompt and leaves a preview open; `q` closes it.

Hover a row to light it; hover a truncated name to see it whole.

The key legend is always pinned to the bottom of the pane, dim until the pane has the keyboard. Docked, the pane scrolls its own rows between the header and the legend, so both stay put as you wheel or arrow through a long tree; a slim scrollbar on the right, its thumb carrying the dusk gradient, and `↑ N more` / `↓ N more` set into the hairlines at the edges show what's off screen.

The diff peek opens inside the tree pane rather than beside it: Claude Code shows one pane at a time, and a second pane would become a tab hiding the tree. The file preview uses the band above the prompt instead, the only place a plugin can draw across the transcript's width. A pane can't paint outside itself, and the dock doesn't widen when a plugin asks. The band can't take the keyboard while you hold the tree either, so the tree drives it.

## Configuration

Each field is a row in `/config` under the plugin's name.

| Field | Default | Meaning |
|---|---|---|
| `side` | `left` | Preferred dock side. This Claude Code build docks every pane on the right and offers plugins no choice; the preference is stored for a build that does. |
| `columns` | 32 | Requested dock width. Your own resize wins. |
| `openOnStart` | true | Open the pane when a session starts. |
| `followClaude` | true | Unfold and scroll to the file Claude is editing. |
| `readsShimmer` | true | Shimmer (muted) on Read as well as on writes. |
| `shimmer` | `sweep` | `sweep`, `pulse` (the name breathes in color once a second, for reduced motion) or `off`. |
| `showIgnored` | false | Show gitignored entries, dimmed. |
| `compactFolders` | true | Draw single-child folder chains on one row. |
| `collapsedFolders` | `node_modules` | Comma-separated folder names, matched at any depth, drawn folded until you open them. Their contents are listed only when you first open one, so a huge `node_modules` costs nothing while folded and stays out of find. Claude working inside one does not open it; `/tree reveal` and the pinned file line do. Empty folds nothing. |
| `hiddenFolders` | *(empty)* | Comma-separated folder names, matched at any depth, left out of the tree and its find, as `.git` always is (`dist, .venv`). The Changes view still lists their changes, since it shows what git reports. Wins over `collapsedFolders`. |
| `accent` | `#D97757` | Hex color the pane's light comes from: the glass's warm top, the title gradient, the glow, the lit guide and the focus edge. The cool end of the gradient is a fixed violet. |
| `glow` | true | Light the rows around the file Claude is editing. |
| `glass` | true | Draw the pane on the tinted glass slab. Off, rows sit on the terminal's own background; type colors, chips and the glow stay. |
| `animate` | true | Ripple rows when a folder opens or closes. |
| `editor` | `code -g {path}:{line}` | What `o` runs. `{path}` is the file's absolute path, `{line}` the preview's top line (1 from the tree); a part in double quotes stays whole. On Windows a command with no extension runs through `cmd /c`, since `code` is a `.cmd` script. Use an editor that opens its own window: a terminal editor can't take over Claude's screen, but `wt nvim {path}` opens one in a new Windows Terminal tab. |
| `previewIn` | `band` | Where a file preview shows. `band`: above the prompt, as wide as the transcript and up to half the terminal tall (Claude Code caps that band there; a survey or question takes it back while it's up). `pane`: inside the tree pane, at its width. |

## How it stays cheap

The tree is walked once at open, root first so the pane paints immediately. Git is polled every 3 seconds while a turn runs and every 20 seconds idle, and only while the pane is shown. A file tool call re-lists just that file's folder. The shimmer redraws ten times a second only while a file is active. Line counts are fetched only while the Changes view is open. A fold ripple runs a 30 fps frame clock only for its own half second. Nothing runs while the pane is hidden. Trees over 2,000 rows fold their deepest levels; nothing is hidden, only folded.

## Development

```
claude plugin validate claude/plugins/in-progress/tree
claude plugin test claude/plugins/in-progress/tree
```

Loading the plugin lays this build's type declarations in `.claude-plugin/types/` and a `tsconfig.json` beside them (both gitignored), after which `tsc -p claude/plugins/in-progress/tree` type-checks it. The product requirements are in `docs/PRD.md`.
