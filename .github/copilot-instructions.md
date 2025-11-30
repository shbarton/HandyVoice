# GitHub Copilot Instructions for HandyVoice

## Project Overview

**HandyVoice** is a cross-platform desktop speech-to-text application built with Tauri (Rust backend + React/TypeScript frontend).

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs.

### Essential Commands

```bash
# Find work
bd ready --json                    # Unblocked issues

# Create and manage
bd create "Title" -t bug|feature|task -p 0-4 --json
bd create "Subtask" --parent <epic-id> --json  # Hierarchical subtask
bd update <id> --status in_progress --json
bd close <id> --reason "Done" --json

# Search
bd list --status open --json
bd show <id> --json
```

### Workflow

1. **Check ready work**: `bd ready --json`
2. **Claim task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** `bd create "Found bug" -p 1 --deps discovered-from:<parent-id> --json`
5. **Complete**: `bd close <id> --reason "Done" --json`
6. **Commit together**: Always commit `.beads/issues.jsonl` with code changes

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

## Build Commands

```bash
bun install              # Install dependencies
bun run tauri dev        # Development mode
bun run tauri build      # Production build
```

If cmake error on macOS: `CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev`

## Tech Stack

- **Backend**: Rust with Tauri
- **Frontend**: React + TypeScript
- **Audio**: whisper-rs, cpal, vad-rs
- **Package Manager**: Bun

## Important Rules

- Use bd for ALL task tracking
- Always use `--json` flag for programmatic use
- Do NOT create markdown TODO lists
- Do NOT commit `.beads/beads.db` (JSONL only)

**For detailed workflows, see [AGENTS.md](../AGENTS.md)**
