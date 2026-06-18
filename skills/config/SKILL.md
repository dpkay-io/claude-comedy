---
name: config
description: Configure Claude Comedy plugin settings — cooldown, enable/disable, stats, reset
---

The user wants to configure Claude Comedy. Use the `claude-comedy` CLI to handle their request.

**Available commands:**

| Request | Command |
|---|---|
| Show config | `claude-comedy config` |
| Set cooldown to N minutes | `claude-comedy config --cooldown N` |
| Enable comedy | `claude-comedy config --enable` |
| Disable comedy | `claude-comedy config --disable` |
| Show stats | `claude-comedy stats` |
| Reset counter | `claude-comedy reset` |

Run the appropriate command via Bash based on what the user asked for. Show them the output.
