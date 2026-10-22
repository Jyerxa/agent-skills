export type TreeEntry = { name: string; kind: 'file' | 'dir' }

/** One listed directory: its entries. */
export type DirListing = { entries: TreeEntry[] }

export type GitState =
  | 'modified'
  | 'staged'
  | 'untracked'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'conflicted'

export type LineCounts = { added: number; removed: number; isBinary: boolean }

export type GitSnapshot = {
  isRepo: boolean
  failed: boolean
  branch: string | null
  ahead: number
  behind: number
  /** tree-relative path -> state */
  files: Record<string, GitState>
  /** tree-relative directory ('' is the root) -> changed files beneath it */
  dirCounts: Record<string, number>
  /** tree-relative path -> lines added and removed against HEAD; filled while the Changes view is open */
  numstat: Record<string, LineCounts>
}

export type PaneView = 'tree' | 'changes' | 'peek' | 'file'

/** The file the preview shows, and where the pane goes back to. */
export type Preview = {
  /** tree-relative path, or absolute outside the root */
  path: string
  /** the text, cleaned for the highlighter; null when a note stands in for it */
  text: string | null
  /** why there is no text: binary, too large, unreadable; or 'empty file' */
  note: string | null
  /** the view the preview was opened from */
  back: PaneView
  /** the row the cursor was on, put back when the preview closes */
  cursor: string | null
}

export type FoldAnim = {
  /** a ripple of the folder's rows; or, with `animate` off, a flash of the folder's own row once the fold has landed */
  kind: 'fold' | 'unfold' | 'flash'
  /** the folder whose rows move */
  path: string
  startedAt: number
  /** how many rows the folder contributes; 0 for a flash */
  count: number
  stepMs: number
}

export type ActiveFile = {
  /** tree-relative path, or an absolute path when outside the root */
  path: string
  toolUseId: string
  tool: string
  isRead: boolean
}

declare module 'claude-code' {
  interface PluginState {
    tree: {
      root: string
      dirs: Record<string, DirListing>
      collapsed: string[]
      /** folders that start folded (`startFolded`, `collapsedFolders`) which the person or a reveal has opened */
      expanded: string[]
      git: GitSnapshot
      /** tree-relative paths git ignores, a directory ending with '/'; read again only when the tree lists folders, not on every poll */
      ignored: string[]
      active: ActiveFile[]
      trail: Record<string, number>
      phase: number
      showIgnored: boolean
      walkDone: boolean
      /** first visible line of the pane's own scroll window */
      offset: number
      view: PaneView
      /** the filter's text while the filter row is shown, else null */
      filter: string | null
      focusMode: boolean
      /** the file whose diff the peek shows */
      peek: string | null
      peekDiff: string
      /** the key of the element holding the pane's focus ring: the row cursor */
      focused: string | null
      /** the file the preview shows while the view is 'file' */
      preview: Preview | null
      /** the preview window's first line, 0-based */
      previewOffset: number
      /** the fold or unfold ripple, or the flash, in progress */
      anim: FoldAnim | null
      /** frame counter for the fold ripple and the trail's fade: a write redraws the pane */
      frame: number
    }
  }
}
