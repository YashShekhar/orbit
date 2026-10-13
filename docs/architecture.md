# Architecture and extension points

Orbit is a single-process, single-user application. React renders a polling view of state held by a Node HTTP service. The service owns model credentials, tasks, the browser profile, workspace tools, and JSON persistence. The production build serves browser assets and API routes from the same local origin.

## Dependency direction

`src/app` composes feature pages and dialogs. Features use shared components, hooks, and `src/lib/api.ts`. `shared` supplies contracts and pure helpers; it cannot import either application. ESLint rejects frontend imports of server modules or Node built-ins and server imports of frontend modules.

`server/index.ts` loads configuration and owns process signals. `server/app.ts` composes the store, workspace, browser and engine, then supplies those services to routes. Importing the composition module does not start a listener or scheduler. Tests can therefore create isolated applications on ephemeral ports.

Routes validate untrusted request bodies before calling services. `HttpError` supplies intentional HTTP statuses. The provider adapter validates remote response shapes before the engine sees them. TypeScript contracts complement these runtime checks; they do not validate external data by themselves.

## Task lifecycle

Tasks progress from queued to running, optionally waiting for approval, then completed, failed, or cancelled. The engine limits concurrency to three tasks and one per bot. Model tool calls pass through one executor. Shell execution and browser interactions suspend for approval; filesystem tools and browser navigation execute directly. A step budget and bounded delegation limit repeated work.

Shutdown disables scheduling and queue draining, cancels pending work, closes browser activity, and waits for running tasks to finish saving before the HTTP service closes. Startup marks previously unfinished tasks interrupted, preventing silent replay of external actions. Routines coalesce missed intervals and avoid overlapping jobs.

To add a tool, update its schema in `agent/tool-definitions.ts`, implement dispatch in `agent/tool-executor.ts`, and put I/O behavior under `tools`. Decide explicitly whether it needs human approval. Add tests for denial, cancellation, input boundaries, and failure recovery when applicable.

To add a provider protocol, implement a separate adapter that returns the shared `ModelMessage` contract. The current adapter supports compatible Chat Completions endpoints. Credentials are held in memory and scoped to the selected endpoint; changing endpoints without a replacement key clears the saved key.

## Persistence and deployment limits

`storage/store.ts` saves through a temporary file and rename. It is intended for one process writing one data directory. It is not a database, distributed queue, multi-user authorization system, or container sandbox. Back up the private data directory; never run multiple server instances against it. A future hosted deployment needs explicit authentication, isolated execution, database migrations, durable scheduling, operational logging, and rate limits.

The browser uses a persistent headless profile. File tools reject traversal and symlinks, but approved shell commands have host access. Keep the service bound to loopback. Quality checks improve maintainability and catch regressions; they do not change these operating boundaries.

## Verification

Node integration tests exercise real HTTP handlers, storage, queueing, provider calls against a local fixture, and approved shell execution. React tests exercise API failures, polling races, timers, filtering, and keyboard focus. Coverage includes all server source except the process entry point and type-only modules. Frontend thresholds apply to selected behavior modules; presentation and real browser automation require separate verification. Windows and Linux CI jobs run the same checks and audit the locked dependency graph.
