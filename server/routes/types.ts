import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AgentEngine } from '../agent/engine.js';
import type { Store } from '../storage/store.js';
import type { Workspace } from '../tools/workspace.js';
import type { BrowserComputer } from '../tools/browser.js';

export interface Services { store: Store; workspace: Workspace; browser: BrowserComputer; engine: AgentEngine }
export interface RouteContext extends Services { req: IncomingMessage; res: ServerResponse; url: URL; port: number }
export type Route = (context: RouteContext) => Promise<boolean>;
