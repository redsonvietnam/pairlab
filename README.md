# PairLab — Project Graph Navigation Experiment #001

## Hypothesis

Can a minimal stateful navigation model let a human/AI move through project context, zoom into detail, enter a side quest, and return to the meaningful origin without losing orientation?

## Model

This vertical slice keeps graph identity separate from navigation state:

`Persisted/fixture state → Pure Graph Model → Navigation State → Pure Navigation Transitions → Tests`

Navigation contains project, focus, resolution (`R0..R4`), view, meaningful focus history, side-quest origin, and checkpoint. Zoom changes resolution only; focus creates meaningful history. `BACK` walks that history. `RETURN` restores the recorded side-quest origin.

## Scenario

`BAMSO/UI → UI-02 → ZOOM_IN → KEYBOARD → GIANT-SCAN → C4 → STRUCTURIZR → RETURN`

The test verifies that the pre-quest context is recoverable after the side quest.

## Results

**PASS for this minimal hypothesis slice.**

Automated tests cover focus/history, zoom isolation, arbitrary-depth back navigation, side-quest origin/return, checkpoint restore, context-loss reconstruction, BACK vs RETURN, graph immutability, and deterministic resolution boundaries.

## Failed assumptions

- None required for the tested model.
- The experiment does not establish that this state shape is the right long-term architecture.

## Unresolved questions

- How project identities and persisted nodes should bind to navigation without coupling layers.
- Whether one history stack is sufficient for real nested side quests.
- Whether `view` needs a structured type rather than a string.
- How navigation state should persist across sessions, if at all.

## What should NOT be implemented yet

- No graph database.
- No general-purpose navigation framework.
- No polished renderer/UI.
- No OdinTree application integration.
- No PCM/PWF changes.
- No claim that this validates the complete Project Graph architecture.

## Scope

This branch is an experimental vertical slice only and is not canonical architecture.
