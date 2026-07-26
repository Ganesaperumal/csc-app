<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:token-optimization-rules -->
# Token Optimization Directives
- **MANDATORY FIRST STEP**: At the start of EVERY new conversation, read `PROJECT_MASTER_PROMPT.md` (root of project). It is the single source of truth for this project. It is compact (~11KB) and designed to cost minimal tokens.
- Do NOT read the entire codebase or run full workspace directory listing unless explicitly asked by the user.
- Target file reads strictly to specific filenames mentioned in the prompt.
- Do NOT re-read `PROJECT_MASTER_PROMPT.md` if it was already read in this conversation.
- After making changes that affect architecture, routes, DB schema, or key logic: update the relevant section of `PROJECT_MASTER_PROMPT.md`.
<!-- END:token-optimization-rules -->
