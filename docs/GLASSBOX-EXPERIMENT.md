# PAIRLAB Glassbox Experiment

PAIRLAB and the Glassbox/visualization work are separate experiments that support each other.

- PAIRLAB tests R2 → CC2 → GitHub Cloud → GATE.
- Glassbox tests whether repository/workflow state can be rendered as a persistent visual model.
- OdinTree is vendored only as an experimental visualization substrate.
- OdinTree is not PAIRFLOW/PCM canonical architecture.
- The visual layer must not become authority over workflow state.
- Prefer state mutation + rendering over regenerating the whole UI.
- IF is the expected path; ELSE records deviations, decisions, and recovery paths.
