# CLAUDE.md

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads)
for issue tracking. Use `bd` commands instead of markdown TODOs.
See AGENTS.md for workflow details.

Claude-specific instructions for this repository. See also AGENTS.md for general agent guidance.

## Quick Reference

```bash
bd ready --json          # Find work with no blockers
bd create "Title" -p 1   # Create issue (priority 0-4, 0=highest)
bd update <id> --status in_progress
bd close <id> --reason "Done"
```

## Build Commands

```bash
bun install              # Install dependencies
bun run tauri dev        # Development mode
bun run tauri build      # Production build
```

If cmake error on macOS: `CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev`
