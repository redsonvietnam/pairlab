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

**PASS for the minimal navigation-state slice.**

Automated tests cover focus/history, zoom isolation, arbitrary-depth back navigation, side-quest origin/return, checkpoint restore, context-loss reconstruction, BACK vs RETURN, graph immutability, and deterministic resolution boundaries.

EXP-001 did **not** prove that navigation was bound to a real Project Graph. That question is isolated in EXP-002.

## Failed assumptions

- EXP-001 assumed symbolic node IDs were sufficient for testing the navigation state machine.
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

## EXP-002 — Graph-Bound Navigation

### Hypothesis

Can navigation reference and validate real nodes from the existing Project Graph representation without Navigation State becoming the owner or mutator of graph state?

### Boundary

EXP-002 reuses the existing graph representation:

`src/state.js → src/model.js::toGraphModel() → src/navigation.js`

The graph model is supplied to navigation for read-only node resolution. Navigation stores only stable node identity, not graph nodes or graph mutation functions.

### Implementation

- `resolveNode(graphModel, nodeId)` validates an actual graph node and returns a deep clone.
- `focusNode(navigationState, graphModel, nodeId)` validates the node first, then reuses the existing pure `focus()` transition.
- Graph mutation remains in the existing graph-state layer (`addNode()`); navigation has no graph mutation path.

### Evidence

Tests in `test/navigation-002.test.js` verify:

- real node resolution from the graph model;
- rejection of unknown node IDs;
- Navigation State stores identity rather than the graph node object;
- resolved-node mutations do not mutate the graph model;
- graph-bound FOCUS does not mutate graph state;
- graph mutation remains outside navigation transitions;
- BACK still restores prior meaningful focus;
- RETURN remains distinct from BACK.

### Results

**EXP-002 provides evidence for a graph/navigation boundary, not a complete Project Graph architecture.**

The strongest result is:

`Real Graph State → Pure Graph Model → graph-bound focus validation → Navigation State`

with no graph mutation performed by navigation transitions.

### What EXP-002 does NOT prove

- No durable navigation persistence.
- No nested side quests.
- No UI interaction.
- No graph database.
- No ownership model for future graph/navigation services.
- No final Project Graph architecture.
- No claim that every future navigation operation should remain shaped this way.

### Remaining architectural questions

- Whether navigation should ultimately resolve against persisted graph state, a pure domain graph model, or a dedicated read-only graph index.
- Whether graph connectivity should constrain navigation beyond node existence.
- Whether `BACK` history should preserve graph revisions or only node identity.
- How graph mutation and navigation should interact when the underlying graph changes between transitions.

## Scope

These branches are experimental vertical slices only and are not canonical architecture.
