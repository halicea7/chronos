# Chronos

A floating Ollama chat overlay for macOS, Windows, and Linux. Summon it with a hotkey, talk to any local or remote model, then dismiss it — it stays out of your way until you need it.

---

## Features

**Floating overlay** — lives outside your normal window stack. One hotkey to show, Escape to hide. No dock icon, no taskbar clutter.

**Ollama integration** — connects to a local Ollama instance or a remote one over HTTPS. Polls every 30 seconds so it picks up new models automatically.

**Vision support** — when the active model supports multimodal input, a screenshot button appears in the input bar. Captures a screen region and attaches it to your next message.

**Thinking mode** — for reasoning models (r1, QwQ, and derivatives), a toggle enables extended chain-of-thought. The thinking trace is collapsible in the message view.

**Team mode slider** — a 4-position snapping slider in the toolbar injects a security-focused system prompt on every message without polluting the visible history. Switch mid-conversation and context carries over.

| Mode | Prompt focus |
|------|-------------|
| Red | Adversarial — exploitation, lateral movement, evasion, attack chains |
| Blue | Defensive — detection, IR, SIEM/SOAR, threat hunting, hardening |
| Purple | Bridge — TTP mapping, MITRE ATT&CK, detection engineering |
| Custom | User-defined in Settings |

**Conversation history** — sidebar lists past sessions. Persist across restarts or keep everything in-memory only.

**Seraph integration** — connect to a [Seraph](https://github.com/halicea7/seraph-electron) instance and use `@` references in chat to pull in live project context (targets, findings, scan results).

**4 visual variants** — Tactical (blue/dark), Carbon (green terminal), Sentinel (amber), Vault (monochrome monospace). Each has full light and dark mode support.

---

## Getting Started

**Prerequisites:** [Ollama](https://ollama.com) running locally (`ollama serve`) and at least one model pulled (`ollama pull llama3.2`).

```bash
git clone https://github.com/halicea7/chronos.git
cd chronos
npm install
npm run dev
```

To build a distributable:

```bash
npm run dist
```

Outputs a `.dmg` (macOS), `.exe` installer (Windows), or `.AppImage` (Linux) in the `out/` directory.

---

## Settings

| Setting | Description |
|---------|-------------|
| Hotkey | Global shortcut to show/hide the window. Click to record a new one. |
| Ollama host | Local (`http://localhost:11434`) or external HTTPS endpoint |
| Team mode prompts | Editable system prompts for each of the 4 modes |
| Appearance | System / Light / Dark |
| Variant | Tactical / Carbon / Sentinel / Vault |
| Window width | 320–720 px, adjustable via slider |
| Persist history | Save conversation history between sessions |
| Seraph host + token | Optional connection to a Seraph instance for `@` context references |

---

## Stack

- [Electron](https://electronjs.org) + [electron-vite](https://electron-vite.org)
- [React 18](https://react.dev) with TypeScript — no component library, all styles in a single CSS file
- [Ollama](https://ollama.com) streaming API
- Geist / Geist Mono fonts

No telemetry. No cloud. Everything runs locally.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Global hotkey (default `Alt+Space`) | Show / hide window |
| `Escape` | Hide window (or close Settings if open) |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `⌘K` / `Ctrl+K` | Clear history |
| `⌘,` / `Ctrl+,` | Open Settings |
