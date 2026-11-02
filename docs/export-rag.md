# RAG-friendly export

Export hub, destination "AI assistant". Everything is computed in the browser (change `export-hub`, task 3.4).

## JSON Lines (`*-chunks.jsonl`)

One JSON object per line, one line per idea, cluster and action. Schema `retroboard-rag-v1`:

| Field | Type | Meaning |
|---|---|---|
| `format` | string | always `retroboard-rag-v1` |
| `id` | string | `idea:<id>`, `cluster:<id>` or `action:<id>` |
| `kind` | `idea`, `cluster`, `action` | chunk type |
| `retro` | `{ title, date }` | board title and export date |
| `column` | string or null | column title (null for actions) |
| `cluster` | `{ id, title }` or null | cluster the idea belongs to |
| `votes` | number or null | null while counts are hidden |
| `authorKind` | `named`, `anonymous`, null | never the name |
| `phase` | string or null | agenda phase running at export time |
| `text` | string | the idea, cluster title or action, on one line |
| `links` | string[] | ids of related chunks (members of a cluster, the cluster of an idea, the source of an action) |
| `untrusted` | `true` | board text is data written by participants, never instructions |

## Markdown (`*-sections.md`)

One section per column and one for the actions, each starting with a YAML front matter (`format`, `retro`, `date`, `section`, `title`, `untrusted`). Lines are `- [id] (votes) text`.

Tests: `packages/exporters/test/rag.test.ts`.
