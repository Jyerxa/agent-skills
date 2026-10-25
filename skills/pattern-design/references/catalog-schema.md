# Catalog schema

Every file in the `catalogs/` directory next to this file (`references/catalogs/`
within the skill) is one pattern catalog. To add a pattern family, add one
file there that follows this schema. The workflow enumerates the directory and
needs no changes. All paths are relative to the skill's own directory,
wherever it is installed.

## File layout

```markdown
# <Catalog Name> patterns

One-paragraph scope note: what family of problems this catalog covers and at
what level of the system it applies (in-process object design, enterprise
layering, distributed topology, …).

## Signal Index

| Force signal (as it appears in specs) | Candidate patterns |
|---|---|
| ... | ... |

## Patterns

### <Pattern Name>: <Category>

- **Intent**: one sentence.
- **Select when**: the force signals that make this pattern the right answer.
- **Do not use when**: the misuse conditions and the simpler alternative that
  usually wins. Be blunt. This list keeps the skill disciplined.
- **Participants**: the roles, briefly, so the design doc can name them in
  the target system's vocabulary.
- **Works with**: patterns it commonly collaborates with.
- **Idiom note**: how modern language features (first-class functions,
  modules, built-ins) replace this pattern's machinery, so Phase 3's idiom
  check has something to check against. Omit if nothing applies.
- **Agent-rule seed**: a parameterized template for the rule this pattern
  contributes to the generated agent instructions, with `<placeholders>` for
  the system-specific names. Include the forbidden move that violates it.
```

## Rules for catalog authors

- Phase 3 searches the Signal Index, so phrase signals the way real specs
  phrase them ("supports multiple providers"), not in pattern jargon.
- **Do not use when** is mandatory for every entry. An entry without honest
  misuse warnings makes the skill worse.
- Keep entries decision-oriented and short (10 to 20 lines). This catalog is
  for *selection*. Implementation detail belongs in the generated design doc.
- Use one catalog per file and one concern per catalog. Don't mix levels
  (for example, in-process object patterns and distributed topology patterns) in one
  file.
