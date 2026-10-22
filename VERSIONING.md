# Skill versioning and releases

Version each skill independently. Keep its files in one folder and its release
metadata in `SKILL.md`; no central version manifest, copied release directories,
or release automation is needed. This policy applies only to `skills/**/SKILL.md`
and the files bundled with each skill. Claude Code plugins keep their existing
`plugin.json` versions and marketplace configuration; their release process is
separate. Principles notes are not separately versioned skill packages.

## Metadata and lifecycle

Add these string fields to the skill's existing YAML frontmatter:

```yaml
metadata:
  version: "0.0.1"
  lifecycle: "in-progress"
```

`metadata.version` is a numeric `MAJOR.MINOR.PATCH` version, with no leading
zeroes. `metadata.lifecycle` is exactly one of these labels:

| Lifecycle | Meaning | Version policy |
| --- | --- | --- |
| `in-progress` | Still being shaped; no compatibility promise. | `0.0.x`, starting at `0.0.1`. |
| `alpha` | Ready for deliberate early trials; significant changes are expected. | `0.y.z`, with `y` at least 1. |
| `beta` | Intended scope and contracts are defined; broader validation remains. | `0.y.z`, with `y` at least 1. |
| `release` | Reviewed for general use against its documented contract. | Starts at `1.0.0`; follow SemVer thereafter. |

Only an explicit maintainer decision promotes a skill. Passing checks, elapsed
time, a merged PR, or its directory name never promotes it. Changing lifecycle
also requires a higher numeric version; never relabel an already tagged version.
For example, `0.0.3` / in-progress could become `0.1.0` / alpha, then `0.2.0` /
beta, then `1.0.0` / release. These are examples, not planned promotions.

All existing skills start at `0.0.1` / `in-progress`, including `pattern-design`,
`system-discovery`, and `jy-codebase-analysis` outside the `in-progress/` folder.
This conservative initialization does not assess their quality or claim a prior
stable release. No Git tags or GitHub Releases are created by adding metadata.
Keep existing paths on promotion to preserve links and direct-path installs;
read the metadata rather than inferring lifecycle from a path. Do not duplicate
a skill into alpha, beta, release, or numbered directories.

### Why separate labels instead of SemVer prerelease suffixes?

[SemVer](https://semver.org/spec/v2.0.0.html) permits prerelease suffixes such as
`1.0.0-alpha.1`, but this repository uses its numeric core plus an explicit
maturity label. That keeps the requested `0.0.x` development numbers simple and
avoids maintaining the same lifecycle in both a suffix and a separate field.
SemVer already treats major version zero as unstable. The lifecycle vocabulary
is a repository convention, not an extension that installers must understand.

The [Agent Skills specification](https://agentskills.io/specification#metadata-field)
allows string metadata. The fields travel with an installed skill, but do not
make `npx skills` select versions, hide unfinished skills, or gate updates. The
CLI discovers skills by `SKILL.md` and name; use a Git ref for a fixed snapshot.

## Choosing the next version

A skill's compatibility contract is its documented inputs, output formats and
meaning, required tools/environment, workflow guarantees, and bundled script
interfaces. It does not promise identical model wording or results. Keep these
contracts in the skill and its references; define them before the first release.

- While `in-progress`, increment the patch number for each merged skill change.
- During `alpha` and `beta`, increment the minor number for breaking contract
  changes or new capabilities; increment patch for compatible fixes.
- From `1.0.0`, increment major for breaking changes, minor for compatible new
  capabilities, and patch for compatible fixes or clarifications. Reset lower
  numbers when incrementing a higher one.

Bump only affected skills. A change anywhere in the bundled skill directory
(instructions, references, scripts, assets, or fixtures) needs a version bump;
repository-only documentation does not. Shared reference copies count as a
change to every skill whose copy changes. Keep model/schema versions inside
those references separate from skill versions. A lifecycle-only change also
bumps the version. Multiple commits in one PR can share its proposed next
version; before merging, recheck against main so concurrent PRs do not reuse it.

## Cutting a snapshot later

Metadata on the default branch describes development work, not a published
snapshot. When a maintainer decides to publish a particular skill:

1. Review its whole bundle, contract, lifecycle, and next version in a PR.
   Record changes, breaking changes/migration steps, and known limitations in
   the PR. Keep unrelated skills and plugin versions unchanged.
2. Parse the YAML and check that version/lifecycle follow the rules above. Run
   the skill's checks and `npx skills add . --list` from the repository root;
   verify its name is discovered once. Test installation into a scratch project
   and any bundled scripts. For coding-principles, also run
   `python3 principles/in-progress/check.py`.
3. After approval, merge and select the exact tested commit. Create an annotated,
   immutable Git tag named `skill-<name>-v<version>`, using the frontmatter name
   and version, for example `skill-capture-process-v0.0.3`. Tag only on an
   explicit release decision; normal skill edits do not create tags.
4. Create a GitHub Release for that tag with the skill name, version, lifecycle,
   changes, limitations, verification, and exact install command. Mark it as a
   **pre-release** unless lifecycle is `release`. GitHub's pre-release checkbox is
   publication metadata, separate from SemVer syntax. Never mark a single skill
   as the repository-wide "latest" release; versions are independent.
5. Verify the published tag resolves to the tested commit and the install
   command retrieves the intended skill. Never move a published tag or replace
   its contents; publish a new numeric version for a correction.

A Git tag snapshots the whole repository, but only the named skill is being
released or assigned that version. Other skills at that commit are not promoted.
GitHub release notes supply the release history; there is no second changelog
or version registry to keep synchronized.

## Installing a fixed snapshot

The [skills CLI](https://github.com/vercel-labs/skills/blob/main/docs/commands.md)
accepts a GitHub tree URL with a ref and path. After the example tag above has
actually been published, install only that skill with:

```bash
npx skills add https://github.com/Jyerxa/agent-skills/tree/skill-capture-process-v0.0.3/skills/in-progress/capture-process --skill capture-process
```

The tag and version in this example are illustrative, not an existing release.
Keep the tag name slash-free so the CLI can separate the ref from the path.
`npx skills add jyerxa/agent-skills --skill capture-process` still uses the
moving default branch. Do not use `@0.0.3` as if this were an npm package:
`owner/repo@name` selects a skill, not a version. Lifecycle labels do not provide
release channels or SemVer range resolution. Choose another published tag
explicitly to upgrade; do not rely on `skills update` to advance release pins.
