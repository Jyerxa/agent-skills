export type TreeEntry = { name: string; kind: 'file' | 'dir' }

/** One listed directory: its entries and the mtime it was listed at. */
export type DirListing = { entries: TreeEntry[]; mtimeMs: number }

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
  /** tree-relative ignored paths; a directory ends with '/' */
  ignored: string[]
  /** tree-relative path -> lines added and removed against HEAD; filled while the Changes view is open */
  numstat: Record<string, LineCounts>
  at: number
}

export type PaneView = 'tree' | 'changes' | 'peek'

export type FoldAnim = {
  kind: 'fold' | 'unfold'
  /** the folder whose rows move */
  path: string
  startedAt: number
  /** how many rows the folder contributes */
  count: number
  stepMs: number
}

export type ActiveFile = {
  /** tree-relative path, or an absolute path when outside the root */
  path: string
  isOutside: boolean
  toolUseId: string
  tool: string
  agentId?: string
  since: number
  isRead: boolean
}

declare module 'claude-code' {
  interface PluginState {
    tree: {
      root: string
      dirs: Record<string, DirListing>
      collapsed: string[]
      git: GitSnapshot
      active: ActiveFile[]
      trail: Record<string, number>
      phase: number
      tick: number
      showIgnored: boolean
      closedByHand: boolean
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
      /** the key of the element holding the pane's focus ring, for the cursor mark */
      focused: string | null
      /** the fold or unfold ripple in progress */
      anim: FoldAnim | null
      /** animation frame counter: a write redraws the pane */
      frame: number
    }
  }
}
