---
name: skill-editor
description: REQUIRED for editing any skill file. Ensures changes sync to Claude, Codex, and Cursor. Never edit .claude/skills/ files directly - always use this skill.
---

# Skill Editor

Edit existing AI agent skills while keeping Claude, Codex, and Cursor in sync.

## Workflow

1. **Always edit Claude first** - `.claude/skills/<name>/SKILL.md` is the canonical source
2. **Replicate with CLI** - Copy changes to `.codex/skills/` and `.cursor/skills/`
3. **Never edit Codex/Cursor directly** - They are copies of Claude's version

## Finding Existing Skills

List all skills:

```bash
ls -la .claude/skills/
```

Read a skill:

```bash
cat .claude/skills/<name>/SKILL.md
```

## Editing a Skill

1. Read the current skill content from `.claude/skills/<name>/SKILL.md`
2. Make the requested changes
3. Replicate to other agents:
   ```bash
   cp .claude/skills/<name>/SKILL.md .codex/skills/<name>/
   cp .claude/skills/<name>/SKILL.md .cursor/skills/<name>/
   ```

## Verification

Always verify sync after editing:

```bash
diff .claude/skills/<name>/SKILL.md .codex/skills/<name>/SKILL.md
diff .claude/skills/<name>/SKILL.md .cursor/skills/<name>/SKILL.md
```

No output means files are identical.

## Common Edits

- **Update description** - Improve auto-discovery keywords
- **Add instructions** - Expand the skill's capabilities
- **Fix errors** - Correct mistakes in the skill logic
- **Add references** - Create `references/` directory for supporting docs

## Deleting a Skill

Remove from all three locations:

```bash
rm -rf .claude/skills/<name> .codex/skills/<name> .cursor/skills/<name>
```
