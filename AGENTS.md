# Agent Instructions

## Handoff / Context Reset

When the user asks for "handoff", "checkpoint", "fresh context", or "continue in new thread", produce a concise handoff summary with:

1. Goal
2. Current findings
3. Decisions made
4. Files changed or inspected
5. Commands/tests run and results
6. Remaining work
7. Important constraints and things not to change
8. Suggested next prompt for the new thread

Keep it short, accurate, and implementation-focused.
