# Workshop visualization evaluation

This is a derived view of the fictional workshop evaluation material already
captured in `skills/capture-process/fixtures/workshop-process.md`. The canonical
model was not edited by this skill.

Baseline: `workshop-bike-intake`, revision 1, EXISTING, draft, reviewable.
Source SHA-256: `560868aeab1ba9e774cf0db7b91e8359e2de50f517c3ec44152912b1552bf03c`.

## Reproduce the artifact

From the repository root:

```bash
python3 skills/visualize-process/scripts/render_process.py \
  skills/capture-process/fixtures/workshop-process.md \
  --view skills/visualize-process/fixtures/workshop.view.json \
  --output /tmp/workshop.html
cmp /tmp/workshop.html skills/visualize-process/fixtures/workshop.html
python3 -m unittest discover -s skills/visualize-process/scripts -p 'test_*.py' -v
```

Open `workshop.html` directly; it does not need a server or an internet
connection. The generator also works from an isolated installation containing
only the `visualize-process` folder and a supplied model.

## Independent use and semantic review

An independent agent received the skill and actual captured model, without
this derived plan, HTML, or evaluation conclusions. It generated its own HTML
and presentation plan successfully. Review covered:

- Ordinary-case sequence applies only to the reported completed case.
- Inspection and parts checking remain unordered in the general account;
  prerequisites do not imply concurrency or parts availability.
- Declined-quote collection does not acquire repair, payment, or a ready state.
- Early repair remains partial reported practice, with unknown authority and
  thresholds; it is not an authorized policy exception.
- Both notification accounts remain visible; neither is promoted to fact.
- Concept definitions, cardinalities, record IDs, evidence, source locators,
  five open questions, and the complete source Markdown remain available.

The review found and prompted fixes for CRLF source/hash preservation and
relationship qualifications that were previously hidden behind inspection.
Regression checks cover both. Case steps retain the generic action's name
(e.g. “Accept or decline the quote”); the case account beside it identifies the
actual accepted outcome without changing the baseline action.

## Automated and visual evidence

On 2026-10-09, 17 renderer unit tests and the 13 unchanged capture-validator
tests passed. Unit coverage includes exact source/hash preservation, stale
baseline rejection, plan links and version checks, escaped adversarial text,
partial/envisioned/no-scenario inputs, artifact reproducibility, and standalone
contract consistency.

The development-only GitHub Actions job runs Chromium against the generated
portable HTML. [Successful browser run](https://github.com/Jyerxa/agent-skills/actions/runs/37965040839)
recorded 18 behavioral checks in Chromium 153.0.8010.12:

- Initial paused state; Next, Back, Reset, scoped arrow/Home keys
- Play/Pause, repeated clicks, complete-case ending, scenario switch mid-play
- Declined branch, partial exception, policy evidence and source inspection
- Native dialog Escape dismissal; both conflicting accounts; all open questions
- Six evidence-backed links, visible disputed/guarded-edge qualifications
- Real frame-change animation and reduced-motion/manual-step behavior
- Working controls and no horizontal page overflow at 360, 390, and 768 pixels
- Usable record explorer when no scenario is captured
- No JavaScript errors or external network requests

The job saves full-page desktop, relationship, and mobile screenshots plus
machine-readable results. Finite animations are fast-forwarded for still screenshots so intermediate
frames do not masquerade as faded or missing content. The CI
artifacts have a seven-day retention; the committed HTML and scripts let a
reviewer regenerate them later.

Actual screenshot pixels were reviewed for layout, labels, clipping, reading
order, and readable evidence presentation. The available cloud browser could
not directly preview this VM's local file; the screenshots come from the
normal CI Chromium run, not a fabricated browser session. These checks are
not a full assistive-technology or cross-browser accessibility audit.

No site was published or deployed. All baseline facts remain distinct from
proposals; this package does not implement an improvement input contract.
