---
tags: [technical-writing]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

on-call keeps pinging me about how to rotate the webhook signing key (partners verify our webhooks with it, we rotate it when someone leaves or if we think it leaked). can you write a runbook they can follow at 2am without asking anyone? the tool is in tools/keyctl/. put it at docs/runbooks/rotate-webhook-signing-key.md

Input files: tools/keyctl/keyctl.py, tools/keyctl/README.md, docs/runbooks/restart-webhook-workers.md
