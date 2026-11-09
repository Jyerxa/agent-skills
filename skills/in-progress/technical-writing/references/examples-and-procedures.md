# Examples and procedures

Readers follow steps in order and copy commands and code literally. An error in
either usually appears only when the reader is stuck, so these parts need
verification as well as clear prose.

## Steps

- Number ordered actions. Use bullets for choices or items without an order.
- Give each step one action. Combine tightly coupled actions only when separating
  them adds nothing, such as opening a file and finding a line.
- Start with the condition or location, then the action: "If the job is still
  running, wait for it to finish." "In the Keys tab, select Rotate."
- Put warnings, prerequisites, and irreversible effects before the step they
  affect, not after it.
- State the result the reader should see when it confirms success or decides the
  next step: "The command prints `Rotation scheduled` and the new key ID."
- Give each decision explicit criteria: "If the status is `degraded`, go to
  Rollback."
- End with a verification step when success is not otherwise visible. For a change
  to a live system, include rollback.
- Keep explanation inside steps short. Put background before or after the procedure.

## Commands and code

- Make each example complete enough to run, including imports, setup, and required
  values. Show the smallest example that demonstrates the point.
- Run what you safely can and compare the result with what you wrote. When you
  cannot run an example, check names, signatures, flags, and defaults against the
  source, and tell the user which examples are unverified.
- Tag fenced code blocks with their language, such as `bash`, `python`, or `yaml`.
  Keep commands copyable: no prompt symbols such as `$`, and no output in the same
  block as the command.
- Show output in its own block and introduce it as output. Use real output, and
  mark omissions in long output instead of writing a tidier version.
- Mark placeholders in one consistent form, such as `<key-id>`, and say where the
  reader gets each value the first time it appears.
- Prefer safe examples: dry runs before real runs, test or staging before
  production, and read-only checks before changes. Before a destructive command,
  name its target and warn about its effect.
- Use exact names from the source for flags, functions, paths, environment
  variables, and UI labels. Do not rename them for style. Report a typo in a real
  name instead of silently correcting it.
- Keep one platform or shell per sequence. Label variants when commands differ.

## Values and limits

- Copy defaults, limits, versions, and error messages from the source, not memory.
  When a value depends on configuration, name the setting that controls it.
- Give every time a time zone and every quantity a unit.
