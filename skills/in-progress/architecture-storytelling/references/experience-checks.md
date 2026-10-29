# Experience checks

## Visual direction

Give the main stage most of the viewport. Design lighting, depth, framing and
contrast around one focal subject. Use changes of scale or perspective to reveal
structure; preserve landmarks and identities so movement does not disorient.
Keep a settled composition for reading. Labels should remain large enough for a
presented screen, with technical detail behind deliberate interaction.

A filmstrip should show a meaningful journey, not the same layout with different
highlights. Examples include a user-level outcome, a cutaway of its supporting
components, a focused handoff, a rule-driven branch, and a recomposed overview.
These are possible scenes, not a checklist of mandatory slides.

## Implementation and functional proof

- Read source strings into text nodes, not raw HTML. Safely encode embedded JSON;
  a literal closing script tag must not escape into executable markup.
- Keep identifiers stable between graphics, explanation, detail and citations.
- Start with manual control. Test Next twice quickly, Back during movement,
  Replay while paused, and returning from the final scene. No stale callbacks.
- Pause freezes camera and object motion. Hiding the tab suspends animation;
  returning must not fast-forward a long elapsed-time jump.
- Reduced-motion applies to both CSS and JavaScript. Keep all meaning and controls
  available in settled views. Avoid flashing and forced scroll behavior.
- Keyboard focus is visible, modal/drawer closure restores it, and arrow shortcuts
  do not steal input from form fields. Controls have names and useful hit targets.
- On narrow screens, recompose the scene and labels rather than shrinking a wide
  diagram. Inspect overflow, occlusion, clipped drawers and reachable controls.
- Test WebGL-disabled or failed renderer startup. The fallback must still explain
  the architecture and its rationale, not just announce an unsupported browser.
- With the network disabled, verify the claimed offline package. Keep license
  notices for bundled dependencies. Missing runtime assets are a delivery defect.

## Evidence to retain

Record input revision/hash, tested browser and viewport, exercised journeys,
representative screenshots, known gaps, and any failures left unresolved. Test
claims should describe what ran: packaging checks are not browser verification;
a screenshot is not proof that transitions or keyboard navigation work.

For a generated sample, label fictional inputs and presentation choices clearly.
A successful fixture proves that example's behavior, not general architectural
understanding. Try at least one incomplete or conflicting input when evaluating
the skill itself; check that it does not manufacture a tidy flow.
