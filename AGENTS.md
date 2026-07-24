<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- BEGIN:token-optimization-rules -->
# Token Optimization Directives
- Do NOT read the entire codebase or run full workspace directory listing unless explicitly asked by the user.
- Target file reads strictly to specific filenames mentioned in the prompt.
- For broad questions, ask for clarification or refer to `PROJECT_MASTER_PROMPT.md` before reading individual source files.
<!-- END:token-optimization-rules -->
