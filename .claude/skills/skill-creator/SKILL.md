---
name: skill-creator
description: Create new AI agent skills for Claude Code, Codex, and Cursor. Use when asked to create a skill, add a new agent capability, or set up a slash command.
---

# Skill Creator

Create AI agent skills that work across Claude Code, Codex, and Cursor.

## Workflow

1. **Claude is canonical** - Always create/edit in `.claude/skills/<name>/` first
2. **Replicate with CLI** - Copy to `.codex/skills/` and `.cursor/skills/` using `cp -r`
3. **Format differences** - Use `sed` only if agent-specific tweaks are needed (rare)

## Directory Structure

```
.claude/skills/<skill-name>/
├── SKILL.md          # Required - instructions + metadata
├── references/       # Optional - supporting documentation
├── scripts/          # Optional - executable helpers
└── assets/           # Optional - templates, resources

.codex/skills/<skill-name>/   # Copy of Claude's
.cursor/skills/<skill-name>/  # Copy of Claude's
```

## SKILL.md Format

```yaml
---
name: skill-name # Required: lowercase, hyphens, max 64 chars
description: What it does... # Required: triggers auto-selection by agent
allowed-tools: Read, Grep, Bash # Optional: Claude-specific (ignored by others)
model: claude-opus-4-5-20251101 # Optional: Claude-specific (ignored by others)
---
# Skill Title

Instructions in markdown...
```

### Required Fields

- **`name`**: Lowercase with hyphens, must match directory name
- **`description`**: Explains what the skill does and when to use it. Include keywords users would say to help the agent auto-select this skill.

### Optional Fields (Claude-specific, ignored by other agents)

- **`allowed-tools`**: Tools the agent can use without asking permission
- **`model`**: Override the model for this skill
- **`context: fork`**: Run in isolated subagent context

## Creating a New Skill

1. Ask the user what the skill should do
2. Choose a descriptive name (lowercase, hyphens)
3. Create the Claude skill:
   ```bash
   mkdir -p .claude/skills/<name>
   ```
4. Write `.claude/skills/<name>/SKILL.md` with proper frontmatter
5. Replicate to other agents:
   ```bash
   cp -r .claude/skills/<name> .codex/skills/
   cp -r .claude/skills/<name> .cursor/skills/
   ```

## Modifying an Existing Skill

1. Edit `.claude/skills/<name>/SKILL.md` (canonical source)
2. Replicate changes:
   ```bash
   cp .claude/skills/<name>/SKILL.md .codex/skills/<name>/
   cp .claude/skills/<name>/SKILL.md .cursor/skills/<name>/
   ```

## Best Practices

- Keep skills focused on a single capability
- Write clear descriptions with keywords for auto-discovery
- Use `references/` for lengthy documentation to keep SKILL.md concise
- Test the skill by asking the agent to perform the task
