# Architecture storytelling evaluation

## Scope

New skill, version 0.0.1 / in-progress. It independently accepts architecture
specifications and diagrams rather than requiring the process-model contract of
visualize-process. Lifecycle is in metadata; no release or promotion is implied.
Automatic discovery retains the platform default because this request did not
specify explicit-only invocation.

The implementation prioritizes source fidelity, components and behavior over
visual spectacle. It builds a storyboard before rendering; ties objectives and
business rules to mechanisms and precise source locations; uses concise,
synchronized nontechnical captions; and preserves technical inspection. TRON-like
luminous lines are an optional aesthetic, not an imposed theme.

## Package checks

- Skill Creator quick validation passed.
- Three package tests passed: metadata, UI prompt and reference containment.
- Every bundled reference is inside the skill folder.
- No runtime library is required by the skill package itself. A generated
  presentation chooses and bundles only the implementation assets it needs.

## Behavioral trial

An independent agent used the skill on the fictional source in `sample/source.md`.
It produced the working model and storyboard before HTML implementation. The
output retains the unspecified approval enforcement location and provider timeout
recovery, distinguishes inferred rationale, and does not invent a store-to-adapter
transfer. A second independent review found no instruction or packaging blockers. The
forward test identified ambiguous wording about an approval gate; this was
clarified to mean user approval of the storyboard, not source-defined business
approval rules.

The offline SVG example is a **fidelity and controls trial**, not a polished
Three.js showcase or proof of the full cinematic ambition. It changes composition
between a receipt opening, validation cutaway, rule gate and separated flow
islands. Its camera choreography and 3D depth are limited. A future real-system
trial should assess the full visual design bar; do not copy this fixture as a
mandatory layout.

Local Chromium could not launch because the sandbox rejects browser sockets.
A supported escalation also failed before launch. No local browser pass is
claimed. The PR workflow runs the sample offline in Chromium and uploads desktop
and narrow screenshots; results are pending until that workflow completes.

The browser checker covers all scenes, navigation/reversal, pause/replay,
keyboard controls, evidence focus restoration, reduced motion and overflow.
Hidden-tab handling is tested by simulating document.hidden and dispatching its
event, not by minimizing an OS window. SVG does not require a WebGL fallback.

Reproduce package checks with `python3 reviews/in-progress/architecture-storytelling/check.py`
(PyYAML 6.0.3). Reproduce browser checks with Playwright Core 1.63.0 and Chromium:
`node reviews/in-progress/architecture-storytelling/sample/browser-check.cjs`.
Use `PLAYWRIGHT_MODULE` for an absolute module path and `CHROMIUM_PATH` for an
existing browser. The check creates screenshots and browser-results.json.
