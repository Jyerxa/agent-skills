# PRD: Tree, a live file tree pane for Claude Code

**Version** 0.1 draft, 2026-10-10
**Author** jeremiah, drafted with Claude
**Target stack** Claude Code 2.1.296 function-hooks plugin ("mod"): a TypeScript/JSX hooks module drawn on the Ink terminal surface; the git CLI for status

## 1. Overview

Claude Code shows a transcript and a prompt. While Claude works, the person has no spatial picture of the project: which file is being edited right now, what has already changed, where in the tree the work is happening. They tab out to an editor or run `git status` by hand.

Tree is a Claude Code plugin that opens a docked side pane with the project's file tree. It answers two questions at a glance, without stealing space or attention:

1. **Where is Claude right now?** The file a tool call is touching shimmers.
2. **What has changed?** Rows follow `git status`: colored names and a one-letter badge at the right edge.

Everything else in the pane exists to serve those two questions and otherwise stays out of the way.

By default the pane shows the whole working directory, like a file explorer: every subfolder expanded and every file listed. Collapsing a folder is the person's choice and is remembered.

Identity: plugin id `tree`, pane id `tree`, slash command `/tree`, folder `claude/plugins/in-progress/tree` in the `agent-skills` repo.

## 2. Goals and non-goals

### Goals

- **Glanceable, not busy.** One row per entry, no inner borders, no icons that need a special font. Color and weight carry meaning; glyphs are plain Unicode (`▸ ▾ ● ·`).
- **Economic with space.** Target width 32 columns. Names truncate in the middle. Status badges sit in a fixed 1-cell column at the right edge. Chrome is a one-row header and a one- or two-row key legend pinned to the bottom, dim until the pane has the keyboard.
- **Shows everything.** The whole working directory, every subfolder expanded, every file listed. Only `.git` and gitignored noise are hidden, and a toggle shows even those.
- **Follows the work.** The tree scrolls to the file Claude is editing and re-expands its folder if the person had collapsed it.
- **Quiet when idle.** No timers run while nothing is active and the pane is hidden. Git is polled at a low rate when idle and a higher rate while a turn runs.
- **Theme-native.** Colors are theme keys (`claude`, `warning`, `success`, `error`, `subtle`, `inactive`, `diffAdded`, `diffRemoved`), so the pane matches light, dark and custom themes without configuration.
- **Keyboard and mouse.** Every row is pressable. Hotkeys work while the pane holds focus. Hover reveals detail without a click.

### Non-goals

- Not an editor. No rename, delete, move, create.
- No drag and drop.
- No file preview beyond the diff peek (the transcript already shows Read results).
- No remote surfaces in v1 (desktop, VS Code, mobile). The render hook defers to the engine on any surface other than `terminal` so nothing draws broken there. Desktop support is a follow-up and mostly means testing.

## 3. Personas

- **The driver.** Runs Claude Code in a wide terminal, asks for multi-file changes, and wants to watch where Claude is working without leaving the terminal.
- **The reviewer.** Comes back after a long turn and wants to see what changed before reading the transcript, then reference a changed file in the next prompt with one click.

## 4. Functional requirements

### 4.1 Pane and layout

- F1. The pane opens docked beside the transcript in the fullscreen terminal layout (the engine docks from 110 columns; an unasked open needs 144, or 110 once the person has opened the pane before). On the main-screen renderer or a narrow terminal it sits inline above the prompt with a requested height of 12 rows.
- F2. Requested width 32 columns (config `columns`). The person's resize (`pane:grow` / `pane:shrink`) wins and the resulting width is stored as the new preference.
- F3. The header is the working directory's name on its own row, bold, with the full path revealed on hover. In a git repository a second row follows: branch glyph and name on the left; on the right `✓` when clean, otherwise `·N` dirty count, plus `↑a ↓b` ahead/behind when non-zero. Outside a repository only the name row is drawn. (Title row added 2026-10-10 at the user's request.)
- F4. The legend of hotkey hints is always drawn, pinned to the bottom of the pane: dim while the pane lacks the keyboard, full strength while it has it. Each hint is a pressable button with that hotkey. Docked, the pane owns its scroll window: it draws only the rows that fit between the header and the legend and answers the engine's wheel and key scrolls itself, so header and legend never move. (Changed 2026-10-10 from "footer only while focused", at the user's request.)
- F5. Closing the pane by hand (ctrl+x x) is remembered for the session; the plugin does not reopen it unasked. `/tree` reopens it.

### 4.2 Tree

- F6. On open the plugin walks the whole working directory and shows it fully expanded: every subfolder and every file. The walk runs in the background, root first, so the pane paints at once and deeper folders fill in as it completes. `.git` is always hidden. Entries matched by `.gitignore` are hidden by default; config `showIgnored` or the `h` hotkey shows them dim.
- F7. Folders show `▾` open / `▸` closed; files show name only, indented 2 cells per level under the folder glyph.
- F8. Compact folders: a chain of single-child folders collapses onto one row (`src/main/java`). Config `compactFolders`, default on.
- F9. Clicking a folder collapses or expands it. `c` collapses all, `e` expands all. Collapsed folders persist per repository root across sessions; everything the person has not collapsed is shown expanded.
- F10. Safeguard for very large trees only: when the full listing would exceed 2,000 rows, the deepest folders start collapsed with a dim count (`▸ node_modules  1,204`) and expand on click. Nothing is hidden, only folded.

### 4.3 Git status

- F11. Status comes from `git status --porcelain=v2 -z --branch --untracked-files=all` run at the repository root. Git runs with repository hooks off.
- F12. File rows are colored and badged by state:

| Git state | Name color (theme key) | Badge |
|---|---|---|
| Modified, unstaged | `warning` | `M` |
| Staged (any) | `success` | `S` |
| Untracked | `diffAdded` | `?` |
| Added (staged new) | `diffAdded` | `A` |
| Deleted (kept in tree, strikethrough) | `diffRemoved` | `D` |
| Renamed | `suggestion` | `R` |
| Conflicted | `error`, bold | `!` |
| Ignored (hidden by default) | `inactive` | none |
| Clean | `text` | none |

- F13. A collapsed folder with changes inside shows a dim count in place of a badge (`▸ skills  2`). An expanded folder shows nothing; its children speak for themselves.
- F14. Deleted files stay in the tree with strikethrough until the next refresh no longer lists them.
- F15. A failed git run keeps the last snapshot and shows `git ✗` in the header. No toasts.

### 4.4 Attention: shimmer, reveal, trail

- F16. **Active row.** While a Write, Edit, MultiEdit, NotebookEdit or Read tool call is running on a file, that row is active: a `●` glyph in the `claude` accent color, and the name shimmers. Read calls use a muted style and can be turned off (config `readsShimmer`).
- F17. **Shimmer.** A 3-cell bright window sweeps left to right across the name at about 10 frames per second; the window is bold `claude`, the rest of the name is `claude` dimmed. Config `shimmer`: `sweep` (default), `pulse` (whole name toggles bold at 1 Hz, for reduced motion), `off`. The shimmer stops the moment the tool call resolves.
- F18. **Auto-reveal.** When a file becomes active, any folder above it that the person had collapsed re-expands, and the row scrolls into view centered. Reveal yields to the person: if they scrolled the pane in the last 5 seconds, the tree does not jump. Config `followClaude`.
- F19. **Attention trail.** Every file Claude has touched this session keeps a dot that fades by age: `claude` (last 10 s), `subtle` (last 2 min), `inactive` (older). Nothing else about the row changes. The trail clears on `/clear`.
- F20. A file outside the project root that Claude touches is listed under a single `⋯ outside project` row rather than hidden, so a shimmer never silently disappears.

### 4.5 Interaction

| Input | Where | Effect |
|---|---|---|
| Click / Enter on a folder row | tree | Toggle expand. |
| Click / Enter on a file row | tree, changes | Insert `@relative/path ` into the composer at the cursor. If the composer refuses (a dialog is up), toast the path instead. |
| Click `±` | changes view | Open the diff peek for that file inside the pane; `g` or the header row goes back. |
| `f` | focused pane | Show the filter input and focus it; again to close. |
| `g` | focused pane | Toggle tree / changes view; from the peek, back to the changes. |
| `z` | focused pane | Toggle focus mode. |
| `h` | focused pane | Toggle gitignored entries (dotfiles other than `.git` are always shown). |
| `r` | focused pane | Force a git and tree refresh. |
| `c` | focused pane | Collapse all. |
| `e` | focused pane | Expand all. |
| Hover a row | tree, changes | Row lights (name at full strength, bold). A truncated name reveals a one-row card with the full relative path, painted over the rows beneath so nothing reflows. |
| Esc | focused pane | Engine returns the keys to the prompt; the pane stays open. |

Engine keys the plugin never rebinds: ctrl+x tab focuses the band, then each pane, then the prompt; ctrl+x ←/↑ and ctrl+x →/↓ resize the dock; ↑ ↓, PgUp PgDn, Home End scroll a focused pane; ctrl+x x closes it. `pane:next` / `pane:previous` exist unbound; the README suggests a binding for people who also use the peek pane.

The legend lists only the keys that apply to the view on screen: the full set in the tree, `g f r` in the Changes view, `g r` in the peek.

### 4.6 Commands and configuration

Commands: `/tree` (toggle), `/tree changes`, `/tree reveal <path>`, `/tree refresh`, `/tree side left|right`, `/tree mention <path>`.

Configuration (`userConfig` in `plugin.json`; each field is a `/config` row):

| Field | Type | Default | Meaning |
|---|---|---|---|
| `side` | string: `left`, `right` | `left` | Preferred dock side. Stored now; takes effect once the engine exposes side (see section 7). |
| `columns` | number | 32 | Requested dock width. |
| `openOnStart` | boolean | true | Open unasked at session start when the layout is fullscreen. |
| `followClaude` | boolean | true | Auto-expand and scroll to the active file. |
| `readsShimmer` | boolean | true | Shimmer on Read as well as writes (muted). |
| `shimmer` | string: `sweep`, `pulse`, `off` | `sweep` | Animation style. |
| `showIgnored` | boolean | false | Show gitignored entries and dotfiles, dim. |
| `compactFolders` | boolean | true | Collapse single-child folder chains. |
| `accent` | string (hex) | `#D97757` | Color of the glow, the lit guide and the focus edge. |
| `glow` | boolean | true | Tint the rows around the file Claude is editing. |
| `glass` | boolean | true | Draw the pane on the tinted glass slab (§5.6). Off, rows sit on the terminal's own background. |
| `animate` | boolean | true | Ripple rows on fold and unfold. |
| `icons` | string: `unicode`, `nerd` | `unicode` | Glyph set (later). |

### 4.7 Views (built 2026-10-10, chosen one by one by the user)

- F21. **Changes view** (`g`, `/tree changes`): a flat list of only the changed files, grouped by state (Conflicted, Modified, Staged, Added, Renamed, Deleted, Untracked), with `+n −m` line counts from `git diff HEAD --numstat` (untracked files counted by reading them; binaries say `bin`). Paths are truncated at the start so the file name always shows. A `±` button at the right edge opens the **diff peek**: the file's unified diff against HEAD (an untracked file against nothing), colored by line, shown inside the same pane with the file and its counts in the header; `g` or the header goes back. Line counts are fetched only while this view is open.
- F22. **Filter** (`f`, `/tree find <text>`): an input row under the header narrows every listed file to fuzzy matches (each query character in order; boundary hits and runs rank higher, and a match in the file name beats one in a folder, so `prd` finds `docs/PRD.md`). Matches show flattened with the hits in `claude` color, best first, capped at 200. Enter mentions the best match; `×` or `f` closes. Surfaces without an input field show the text and take `/tree find`.
- F23. **Focus mode** (`z`): prune the tree to the files with git changes or touched by Claude this session and the folders that lead to them, so the tree breathes with the work. Remembered across sessions.
- F24. **Scroll cue.** While the rows overflow the window, a one-cell scrollbar at the right edge (dim track, bright thumb sized and placed by the window) and dim `↑ N more` / `↓ N more` lines in the blank rows under the header and above the legend. Nothing is drawn when the tree fits.
- Pitched and skipped by the user: **open in editor** (a hover button running a configurable editor command).

### 4.8 Later

- Subagent awareness: files touched by a subagent shimmer in the `ide` color, and viewing an agent's transcript highlights that agent's files.
- Digit hotkeys `1` to `9` on the first nine rows of the Changes view for one-key mentions.
- Nerd-font icons for people who have the font.
- Worktree awareness: show the worktree name when the repository root differs from the working directory.

## 5. Visual design

All mockups are 32 columns wide. The engine draws the frame and the close mark; Tree draws only the body.

### 5.1 Default view: this repo as it stands today, fully expanded

```
agent-skills
⎇ codex/system-discovery      ·1
▾ plugins
  ▾ tree
    ▾ docs
        PRD.md                   ?
▾ skills
  ▾ pattern-design
    ▾ fixtures
        brewhub-pr…SWER-KEY.md
        brewhub-prd.md
    ▾ references
      ▾ catalogs
          gof.md
        catalog-schema.md
        templates.md
      SKILL.md
  ▾ system-discovery
    ▾ references
        brief-template.md
      SKILL.md
  LICENSE
  README.md
```

Every folder and file in the working directory is on screen (`.git` excluded). Folders sort before files at each level. `PRD.md` is untracked, so it is drawn `diffAdded` with a `?` badge, and the header counts one dirty file. `brewhub-prd.ANSWER-KEY.md` is too long for the column, so it truncates in the middle; hovering it shows the full name.

### 5.2 Claude is working (top of the pane, during milestone M0)

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
```

`● register.tsx` is active and shimmering, and the row scrolled into view. `· git.ts` carries the attention trail from an earlier Write. `plugin.json`, `PRD.md` and `hooks.json` were staged by the person, so they are `diffAdded` with `A`. The tree continues below with the rest of `skills`, then `LICENSE` and `README.md`, all expanded.

### 5.3 Changes view (v1.1)

```
⎇ codex/system-discovery  ↑1 ·3
Modified
  ● hooks/register.tsx  +41 −3 ±
    README.md           +2  −0 ±
Untracked
    hooks/tree.ts       +120    ±
    hooks/git.ts        +88     ±
```

### 5.4 Filter (v1.1)

```
⎇ main                        ✓
› sch▏                         ×
  skills/…/catalog-schema.md
  skills/…/brief-template.md
```

### 5.5 Polish (chosen one by one by the user, 2026-10-10)

- **Indent guides.** A faint `│` per nesting level in the indent cells, in `subtle`.
- **Now-editing line.** Under the header while Claude has a file open: `● path` with the shimmer, whatever is scrolled or in view; for eight seconds after the call, a dim `· last: path`; gone while idle. Pressing it returns to the tree with the file centered.
- **Row highlight.** Hovering a row tints it edge to edge (`subtle` background); the row holding the keyboard focus ring carries a `▍` mark in the accent color in the left padding cell, while the pane has the keyboard.
- **Typographic hierarchy.** Folder names bold; file extensions dim; badges and folder counts right-aligned in one column.
- **Readable paths.** The home folder as `~`; a path that still does not fit keeps its first folder and file name and elides the middle (`~/.claude/dev-mods/…/tree/README.md`). Used in the outside-project list, the Changes view, the peek header and the title's hover card.
- **Padding.** One cell on each side of the text inside the pane (the left one is the edge cell), and one blank row under the header and above the legend (the rows the `↑ N more` / `↓ N more` cues use). The gap between the pane's frame and the terminal window's edge is the terminal's own padding and scrollbar strip, which the plugin cannot change.

### 5.6 Delight (pitched one at a time, 2026-10-10)

A terminal has no alpha or blur, so glow is simulated with background tints blended from a configurable accent (`accent`, default `#D97757`) toward the pane background of a dark or light theme, read from the theme setting.

- **Ember glow** (taken). While Claude writes a file: its row carries the strongest tint, the rows one and two away the lighter ones; the `●` breathes through `● ◉ ○` about once a second; the indent guide from the folder down to the file is drawn in the accent. When the edit ends the tint steps down over half a second. Reads do not glow. Config `glow`.
- **Light pass and settle** (skipped: "over-indexing on the actively edited file").
- **Glass, "dusk"** (taken 2026-10-10, visual only, no behavior change). The pane is a slab of smoked glass lit from the top-left by the accent, and Claude's attention is light moving through it. Every drawn row gets a background on a smoothstep gradient from a warm wash (dark: `#121212` + 9% accent) to a cool tint (+ 8% violet `#7C6FD8`); the legend sits on a brighter shelf. The edges feather (user feedback: "make the border more transparent so the pane is less abrupt"): the left and right cells of every row show 40% of the slab and the top and bottom rows 60%, the rest the terminal's own `#121212` (the user's Windows Terminal background), so the glass fades in rather than starting at a border. The title is a gradient, ember to lavender, brighter while focused. The cue rows become hairlines fading from the light into the glass, with `↑ N more` / `↓ N more` set in them. Indent guides step along the dusk by depth. Badges are tinted chips; the branch status is a pill with half-block caps. The ember glow becomes a Gaussian bell over each row's own glass (±4 rows, continuous fade) with the rim lit beside it; the shimmer becomes a soft eased band, ember for writes and moonlight for reads; trail dots cool continuously from ember to silver; the scroll thumb carries the dusk; diff lines sit on faint green and red; a fold ripple passes as a faint wash. Hex colors come from one palette per accent and theme (`hooks/color.ts`); state letters and names keep the theme's colors. Config `glass`.
- **Fold ripple** (taken, widened by the user from a cascade on open to every fold and unfold). Unfolding, the folder's rows arrive top down, each a step after the last, dim for two steps as they land; folding, they leave bottom up and the fold is written only once the last row has gone. The step is 400 ms divided by the row count, clamped to 12 to 40 ms, so a big folder ripples faster per row. A click during a ripple lands it at once and starts the next. Config `animate`. Fold-all, unfold-all and auto-reveal are instant.
- **Focus cues** (from the user's feedback that hotkeys were landing in the prompt). While the pane holds the keyboard: an accent edge (`▏`) in the left cell of every row, thicker (`▍`) on the row the focus ring is on, the title in the accent color, and `esc to leave` at the right of the title row. Otherwise the edge is blank, the title plain, and the title row reads `ctrl+x tab to focus`, dim. No row is spent.

### 5.6 Legend, always pinned to the bottom of the pane

```
h: ignored  r: refresh
c: collapse  e: expand
```

Drawn dim until the pane has the keyboard. It wraps to two rows at 32 columns and sits on one row from 46. v1.1 adds `f: filter  g: changes  z: focus`.

## 6. Non-functional requirements

### 6.1 Refresh economy

| Trigger | Action | Cost |
|---|---|---|
| File tool call ends | Debounced (300 ms) git status, re-list the file's directory | One git call, one directory list |
| Bash ends | Debounced git status | One git call |
| Turn running | Git status every 3 s | About 50 ms per call on a mid-size repo |
| Idle, pane shown | Git status every 20 s | Negligible |
| Pane hidden or not placed | No timers | Zero |
| Open | One recursive walk, root first, in the background; the pane paints the root while deeper folders fill in | One list per folder, once |
| Each git refresh | Re-list only the folders whose mtime changed | One stat per folder per refresh |
| Shimmer | 10 redraws per second while any file is active; none otherwise | Bounded by active files |

### 6.2 Performance

- The root level paints within 300 ms of open; the full walk finishes within 2 s on a 10,000-file repo and fills in as it goes.
- Shimmer starts within 100 ms of the tool call starting and stops when it resolves.
- A git refresh lands within 1 s of an edit.
- Zero CPU while idle and hidden.

### 6.3 Platforms and accessibility

- Windows and POSIX paths both work; normalization happens once at the boundary.
- Theme keys only, never raw colors, so 16-color terminals degrade through the theme's own fallbacks.
- `shimmer: pulse` and `shimmer: off` serve reduced-motion preferences.
- No glyph requires a special font in the default `unicode` set.

## 7. Constraints and risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Dock side is the engine's, and it is the right side.** The mods interface docs say a pane is "a sidebar on the right". The open call takes `id, title, focus, closeOnEscape, holdToasts, rows, columns` and nothing for side; the keybindings reference lists no action that moves the dock. | The original "left by default, movable to right" requirement cannot be met by a plugin in build 2.1.296. v1 docks on the right. | Ship the `side` setting anyway, documented as "applies once the engine supports it". File a feature request against Claude Code for a `side` field on pane open or a `pane:moveLeft` / `pane:moveRight` action. Nothing in the pane body depends on side. |
| Panes dock only in the fullscreen layout, which is a research preview and not on for everyone. `/tui fullscreen` or `CLAUDE_CODE_NO_FLICKER=1` turns it on; `/tui default` or `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` off; on Windows `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT=1` fixes stale text. | A narrow terminal or the classic renderer gets an inline block, not a sidebar. | Inline mode draws the same tree 12 rows tall; `openOnStart` opens only when the viewport reports fullscreen. README states the requirement and the `/tui` command up front. |
| No directory watch in the hooks API. The classic `FileChanged` hook watches literal file names only, and the docs do not say a mod can add watch paths. | Edits made outside Claude lag until the next poll. | Poll cadence in 6.1; `r` forces a refresh. Possible refinement: watch the hot files in the attention trail if a mod turns out to be able to register watch paths. |
| Large repositories. | Slow `git status`, huge untracked lists, a walk that takes seconds. | Switch to `--untracked-files=normal` when the last status took over 500 ms; above 2,000 rows fold the deepest folders (F10); the walk is background and progressive; the filter uses `git ls-files` instead of walking. |
| Hot reload drops module variables. | Timers and caches vanish on reload. | Everything a draw needs lives in engine-held session state; timers are re-armed in the session-start hook, which re-runs on reload. |
| Terminals without true color. | Colors could look wrong. | Theme keys only. |

## 8. Success metrics

- In a fullscreen terminal of 144 columns or more, the pane is visible within 300 ms of session start with no user action.
- During a multi-file edit, the person can name the file Claude is editing without reading the transcript.
- After a turn, the changed files are identifiable from the pane alone (color and badge), matching `git status` exactly.
- Clicking a row puts `@path ` in the composer in one action, every time the composer is free.
- With the pane hidden, the debug log shows no plugin timer dispatches.

## 9. Milestones

| M | Deliverable | Done when |
|---|---|---|
| M0 Skeleton | Manifest, hooks module, state contract, pane opens with a static root listing, `/tree` toggles it. | `claude plugin validate` is clean; the pane shows in a fullscreen terminal. |
| M1 Tree and git | Full recursive tree expanded by default, collapse and expand, ignore rules, compact folders, git colors, badges, folder counts, header. | Every file in the working directory is on screen; edit one by hand, press `r`, the row recolors. |
| M2 Attention | Shimmer, auto-reveal, trail, refresh on tool calls, turn-aware polling. | Ask Claude to edit a file: the row shimmers within 100 ms of the Edit call, stops when it ends, the trail dot remains. |
| M3 Interaction | Click to mention, hotkeys, footer, hover, persistence, config rows, closed-by-hand memory. | Clicking a row puts `@path` in the composer; a new session restores expanded folders. |
| M3.5 Ship v1 | Tests on `terminal` and `desktop`, README, root `marketplace.json`, side setting stored, feature request filed. | `claude plugin test` is green; `/plugin install tree --marketplace jyerxa/agent-skills` works on a clean machine. |
| M4 Views | Changes view, in-pane diff peek, fuzzy filter, focus mode, scroll cue. Built 2026-10-10. | `g` shows changed files with counts; `±` shows a diff; `f` finds; `z` prunes. |

v1 is M0 through M4. Subagent awareness moved to "Later".

## 10. Decision log

| Date | Decision |
|---|---|
| 2026-10-10 | Dock side: the engine docks on the right in this build and offers no control. v1 docks right, stores a `side` preference, and a feature request goes to Anthropic. |
| 2026-10-10 | Repo home: `claude/plugins/in-progress/tree` in `agent-skills`, with a root `.claude-plugin/marketplace.json`. |
| 2026-10-10 | One click on a file inserts `@path ` into the composer. Diff peek is the `±` button in the Changes view (v1.1). |
| 2026-10-10 | v1 scope is M0 to M3.5. Changes view, filter, focus mode, diff peek and subagent awareness are v1.1. |
| 2026-10-10 | Read calls shimmer in a muted style, with a config switch. |
| 2026-10-10 | Name: `tree`, replacing the working name "Canopy". |
| 2026-10-10 | The default view is the whole working directory with every subfolder expanded, as in a file explorer. Folding is the person's choice; automatic folding only above 2,000 rows. |
| 2026-10-10 | Legend always visible and pinned to the bottom; the pane owns its scroll window when docked. Then a working-directory title row, and one cell of padding inside the pane's edges. |
| 2026-10-10 | Five features pitched one at a time: Changes view with diff peek (in), fuzzy filter (in), focus mode (in), open in editor (skipped), scroll cue with scrollbar and edge counts (in). The diff peek lives inside the tree pane because the engine shows one pane at a time. |
| 2026-10-10 | Right and top margins removed at the user's request (left cell kept). Five visual pitches, all taken: indent guides, now-editing line, row highlight with focus mark, typographic hierarchy, readable paths. |
| 2026-10-10 | Text padding restored on both sides; the gap outside the frame is the terminal's own. Delight pitches: ember glow (in), light pass (out), glass (parked), ripple on every fold and unfold (in). Focus cues added from the user's feedback: accent edge, accent title, `esc to leave` / `ctrl+x tab to focus`. |
| 2026-10-10 | Glass taken off the parked list as a visual-only pass ("dusk": warm top, cool bottom, light as Claude's attention); behavior unchanged; config `glass` to turn the slab off. |

## Appendix A. Technical design

### A.1 Files

```
claude/plugins/in-progress/tree/
  .claude-plugin/plugin.json        name, version, description, types, userConfig
  hooks/hooks.json                  { "modules": ["./register.tsx"] }
  hooks/register.tsx                register(): hooks, commands, timers
  hooks/render.tsx                  ui.render for Pane: header, rows, footer, peek
  hooks/tree.ts                     directory cache, expand/collapse, compact folders, ignore rules
  hooks/git.ts                      git status / numstat / branch parsing (porcelain v2)
  hooks/attention.ts                active files, trail tiers, shimmer phase
  hooks/paths.ts                    Windows/POSIX normalization, relative paths, truncate-middle
  hooks/*.test.ts                   claude plugin test
  types/index.d.ts                  PluginState contract
  README.md                         install line, screenshots, keys, config
  docs/PRD.md                       this document
```

Skeleton to reuse: the pane example shipped with the plugin-authoring skill (`examples/pane.tsx` and `pane-state.d.ts`): `atom` / `read` / `update` from `claude-code`, `$.ui.open` in `session.start`, a `command.run` hook answering `/tree`, and a `tool.call` hook that wraps `next(e)` to bracket the active period.

### A.2 State

Session state lives in `$.state` (engine-held, survives hot reload), declared in `types/index.d.ts`:

```ts
interface PluginState {
  tree: {
    root: string                        // repo root or cwd
    dirs: Record<string, DirListing>    // path -> { entries, listedAtMtime }
    collapsed: string[]                 // folders the person folded; everything else is open
    git: GitSnapshot                    // { branch, ahead, behind, files: Record<path, GitState>, numstat }
    active: ActiveFile[]                // { path, toolUseId, agentId?, tool, since }
    trail: Record<string, number>       // path -> last touched ms
    phase: number                       // shimmer frame counter
    view: 'tree' | 'changes'
    filter: string | null
    focusMode: boolean
    showHidden: boolean
    peek: string | null                 // path shown in the peek pane
    closedByHand: boolean
  }
}
```

Preferences (`collapsed` keyed by root, `view`, `showHidden`, `side`, `columns`) are mirrored to `$.store`, which persists across sessions.

### A.3 Hooks

| Hook | Does |
|---|---|
| `session.start` | Register `/tree`. Load prefs from `$.store`. Resolve root (`$.session.repo()?.root ?? e.cwd`). Open the pane unless closed by hand this session. Start the recursive walk in the background (root first, then each folder; `.git` skipped; ignored entries filtered per folder) and the idle git timer. |
| `command.run` `{ command: 'tree' }` | No args: toggle open/close. `changes`, `reveal <p>`, `refresh`, `side <l|r>`, `mention <p>`. |
| `tool.call` on Write, Edit, MultiEdit, NotebookEdit, Read | Push `{ path, toolUseId, agentId }` to `active`; expand ancestors; start the shimmer timer if not running; `await next(e)`; pop from `active`; stamp `trail[path]`; schedule a debounced git and directory refresh (300 ms). |
| `tool.call` `{ tool: 'Bash' }` | After `next(e)`: debounced git refresh. |
| `turn.start` / `turn.complete` | Switch git polling between 3 s and 20 s. |
| `session.end` reason `clear` | Clear `active` and `trail`; keep prefs. |
| `ui.render` `{ component: 'Pane', requestId: 'tree' }` | Draw header, rows, footer from state, sized to `e.props.bodyColumns`; `next(e)` on non-terminal surfaces. |
| `ui.render` `{ component: 'Pane', requestId: 'tree-peek' }` | Draw `Code format="diff"` of `git diff -- <path>` (or `git diff --no-index /dev/null <path>` for untracked). |
| `ui.close` `{ id: 'tree' }` | If `e.origin.kind === 'person'`, store closed-by-hand with the session id. Cancel timers. |
| `ui.scroll` `{ requestId: 'tree' }` | `next(e)`; record the time so auto-reveal does not fight the person's scroll for 5 s. |

The `tool.call` hook must always reach `next(e)`; it carries `.catch(($, e, next) => next.called ? next(e) : next(e))` so a plugin bug never blocks a tool.

### A.4 Rendering

- Rows are `plain` `Button`s with a stable `key` (`row:<relpath>`), `dimColor` for ignored entries, children `[glyph] [name] [badge]`. Indent is leading spaces and `│` guides in `subtle`.
- Only the active row splits its name into `[before][hot 3 cells][after]`; `hot` is bold `claude`, the rest `claude` dimmed. Every other row is one `Text`.
- Each row is a `Box flexDirection="row"`: the name `flexGrow={1}` with `wrap="truncate-middle"`, then a 1-cell badge `Text`. `bodyColumns` sizes it.
- Footer items are `plain` Buttons with hotkeys.
- Shimmer timer: `$.clock.every(100, () => update($, phase, n => n + 1))` while `active.length > 0`, cancelled when it drops to 0. A state write redraws the pane (the engine caps pane redraws at 30 per second).

### A.5 Git

- `$.process.run(["git", "status", "--porcelain=v2", "-z", "--branch", "--untracked-files=all"], { cwd: root })`. Porcelain v2 gives branch, ahead/behind and per-file XY codes; `-z` is safe for any filename.
- `$.process.run(["git", "diff", "--numstat", "-z"])`, plus `--cached`, only while the Changes view is open.
- Folder counts aggregate the file map by path prefix once per snapshot.
- Ignored entries: `git check-ignore --stdin -z` on each listed directory's entries, batched per listing. Outside a git repo: no ignore filtering, `.git` still hidden.
- Timeout 30 s, output capped at 4 MiB by the engine.

### A.6 Paths

- Root is `$.session.repo()?.root`, else `$.session.cwd()`; `$.session.root()` is re-read on each refresh so `/cd` moves it.
- Tool `file_path` values arrive absolute or relative with either separator. Normalize to forward slashes and make relative to root at the boundary. Git output already uses forward slashes.

### A.7 Tooling

- New top-level `plugins/` beside `skills/`. Root `.claude-plugin/marketplace.json` lists `tree` with `"source": "./claude/plugins/in-progress/tree"`. README gains a Plugins table.
- No bundler, no npm dependencies. The engine lays its types beside the plugin on first load; `tsconfig.json` extends them. The toolchain is `claude plugin validate`, `tsc -p claude/plugins/in-progress/tree` and `claude plugin test claude/plugins/in-progress/tree`.
- Development: write under the session's dev-mods folder (hot-reloaded by the plugin-authoring skill), then copy into `claude/plugins/in-progress/tree` for commits; or run `claude --plugin-dir claude/plugins/in-progress/tree`.

### A.8 Verification

- `claude plugin validate claude/plugins/in-progress/tree` reports the hooks and `$` calls above and nothing refused.
- `tsc -p claude/plugins/in-progress/tree` passes.
- `claude plugin test claude/plugins/in-progress/tree`: the `tool.call` hook adds an active entry during `next` and a trail entry after; a porcelain v2 fixture parses to the expected state map including renames and conflicts; a render test mounts the pane on `terminal` and `desktop`, finds `row:a/b.ts`, presses it, and asserts the composer received `@a/b.ts `; folder counts and compact-folder chains; Windows and POSIX normalization.
- Manual, in a 160-column fullscreen terminal with `--plugin-dir claude/plugins/in-progress/tree`: check that every entry `find . -path ./.git -prune -o -print` lists is on screen; ask Claude to edit a file and watch shimmer, reveal, trail and badge; press `h`, `r`, `c`; close with ctrl+x x and confirm it stays closed after a reload; reopen with `/tree`.
- Idle check: with the pane hidden, `claude --debug` shows no plugin timer dispatches.
