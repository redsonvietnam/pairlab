# PairLab — Glassbox 002

Minimal experiment proving:

`Persisted State → Pure Graph Model → Renderer`

The canonical state is stored as `{ nodes, edges }` and is independent of the browser renderer. The only mutation in this slice is `ADD_NODE`.

## Run

```bash
npm test
npm start
```

Open `http://localhost:3000`, add a node, then reload the page. The node is reconstructed from persisted state.

## Boundaries

- No database, auth, GitHub, AI, or OdinTree application integration.
- `vendor/odintree` is untouched.
- Renderer representation is derived data, never canonical state.
- Reload reads persisted state and derives the graph again; it does not hard-code or regenerate the node in the UI.
