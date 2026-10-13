import { createApplication } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await createApplication(config);
app.server.on('error', (error) => {
  console.error('Server failed:', error.message);
  process.exitCode = 1;
  void app.shutdown();
});
app.server.listen(config.port, '127.0.0.1', () => {
  const address = app.server.address();
  if (!address || typeof address === 'string') return;
  console.log(`Orbit is running at http://localhost:${address.port}`);
  console.log(`Shared workspace: ${app.workspace.root}`);
  app.startScheduler();
});
const shutdown = () => {
  void app.shutdown().catch((error) => {
    console.error('Shutdown failed:', error);
    process.exitCode = 1;
  });
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
