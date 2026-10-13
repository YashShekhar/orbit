# Development workflow

Use the Node version in `.nvmrc`, run `npm ci`, and start development with `npm run dev`. Stop the process with Ctrl+C. Use `ORBIT_DATA_DIR` for an isolated development workspace if you need to preserve your usual data.

Before submitting a change:

```sh
npm run format
npm run check
npm run test:coverage
npm run security:audit
```

| Command              | Purpose                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `npm run lint`       | Type-aware TypeScript linting, Hooks rules, CSS validation, import boundaries   |
| `npm run typecheck`  | Strict checks for browser, server, shared contracts, scripts, tests and configs |
| `npm test`           | Server integration tests and React behavior tests                               |
| `npm run test:watch` | Interactive client test runner                                                  |
| `npm run build`      | Browser assets in `dist/client`, compiled server in `dist/server`               |
| `npm start`          | Run the compiled application after building                                     |

Keep source in `.ts` or `.tsx`. Use `import type` for types. Server imports use `.js` specifiers so TypeScript emits modules Node can load; these refer to `.ts` source files during development. Keep secrets and generated files outside source control. Commit `package-lock.json` with dependency changes and use `npm ci` in CI.

Add UI behavior inside the appropriate `src/features` directory. Keep reusable components free of feature-specific API calls. Add endpoints under `server/routes` with validation in the HTTP boundary. Place execution logic in services/tools rather than route handlers. Prefer explicit dependencies and small public interfaces over generic framework layers.

Write regression tests for state transitions, failure handling, permissions, persistence, and asynchronous races. Server tests must use temporary directories and shut down services before deleting fixtures. Client tests live beside their feature or hook. Do not make normal tests depend on a paid model, external website, or the real `data/` directory.

Git hooks run automatically in a Git checkout after `npm ci`. A source folder without `.git` deliberately skips installation; run `npm run prepare` after creating the repository. CI remains the authoritative check because local hooks can be bypassed. GitHub branch protection must be enabled in the hosting repository to require the workflow before merging.
