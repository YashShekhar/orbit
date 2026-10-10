# Orbit — a local AI workforce

A working Grok Bot-inspired application: persistent named agents, a shared browser and filesystem, real tool execution, human approvals, delegation, and recurring routines. This is an independent local application, not an xAI product or a cloud VM.

## Run

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm start
```

Open **http://localhost:3000**. For development with hot reload, use `npm run dev` instead. The server binds only to `127.0.0.1`.

The browser uses installed Microsoft Edge on Windows. On other systems (or without Edge), install Chromium once:

```sh
npx playwright install chromium
```

## Connect a model

1. Open **Settings** and choose Ollama, LM Studio, xAI, OpenAI, OpenRouter, or a custom provider.
2. Enter the API base URL and API key if required.
3. Click **Discover**, or enter a model ID manually. Choose a model supporting OpenAI-compatible Chat Completions **and function tool calling**.
4. Save the connection. Assign a task to a bot.

OpenRouter allows tool-capable models from additional vendors through the same API. Native Anthropic Messages and other incompatible protocols are not supported directly. Actual capabilities, model availability, and billing depend on your provider.

API keys are held in server memory, never returned to the UI or stored in task history. Re-enter a key after restarting, or set the `MODEL_API_KEY` environment variable. `MODEL_BASE_URL`, `MODEL_ID`, `PORT`, and `ORBIT_DATA_DIR` are also supported. Non-secret settings persist in `data/state.json`.

No API key or local model is bundled. Use **Computer → Run system check** to execute a real browser and file workflow without an AI model. This check is explicitly labeled and does not simulate an AI response.

## What works

- Create and edit teammates with roles, instructions, per-bot model overrides, and persistent memory.
- Assign real multi-step jobs; inspect tool calls, outputs, failures, and the final result.
- Read/write/list workspace files. Preview and download generated artifacts.
- Open websites, inspect text and controls, and interact after approval.
- View a screenshot of the latest agent browser page; refresh on demand.
- Run host shell commands after reviewing the exact command and approving it.
- Delegate bounded jobs to another bot and inspect their status. A delegated job cannot recursively delegate.
- Run up to three jobs concurrently, with one active job per bot.
- Schedule interval routines; pause, manually run, or delete them.
- Stop work, decline an action, retry interrupted work, and follow up with a new assignment.

## Persistence and operating boundaries

The `data/` directory contains bot configuration, memory, tasks, browser sessions, and the shared `data/workspace/` directory. It is ignored by Git. Back it up if you need to preserve the workspace. Browser profiles can contain authenticated sessions; treat this directory as private.

This is a single-user local app. The server must remain running for tasks and routines to execute. Closing the browser UI does not stop work; shutting down the server or computer does. On restart, in-flight tasks become interrupted and can be run again. Missed routine intervals coalesce into one run, and an existing active routine job prevents overlap.

File tools restrict paths to the shared workspace and reject symlinks. **Approved shell commands run on the host and are not sandboxed**; they can access resources outside the workspace. Shell execution has a 60-second limit and a bounded output log. The child process receives a reduced environment. Browser clicks, form input, and selections also require approval. Page navigation and workspace file tools run automatically. Tool output and relevant history are sent to your model provider. This is not intended to be exposed directly to the internet.

The built-in browser runs headlessly in a separate persistent profile. This version does not include a full remote desktop, interactive manual browser takeover, app connectors, voice, or cloud hosting. Website compatibility and login requirements vary. The screenshot panel is an observation surface rather than a remote-control desktop.

## Validation

```sh
npm test
npm run build
```

Tests exercise the actual agent loop against a local compatible API fixture, artifact creation, memory persistence, file boundaries, command approval/decline, cancellation, queueing, routine behavior, and interrupted-task recovery. Live provider inference requires your own model connection.

Design reference: [Grok Bot](https://x.ai/bot). Protocol references: [xAI Chat Completions](https://docs.x.ai/developers/model-capabilities/legacy/chat-completions), [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility).
