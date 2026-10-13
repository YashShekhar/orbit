import type { BrowserLocation, BrowserSnapshot, BrowserAction } from '../../shared/types.js';
import { errorMessage } from '../../shared/errors.js';
import { text, number, optionalText } from '../http/validation.js';
import { chromium, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

export class BrowserComputer {
  root: string;
  context: BrowserContext | null = null;
  opening: Promise<BrowserContext> | null = null;
  pages = new Map<string, Page>();
  latest: BrowserLocation | null = null;
  constructor(root: string) {
    this.root = root;
    this.context = null;
    this.opening = null;
    this.pages = new Map();
    this.latest = null;
  }
  async start() {
    if (this.context) return this.context;
    if (this.opening) return this.opening;
    this.opening = (async () => {
      const options: Parameters<typeof chromium.launchPersistentContext>[1] = {
        headless: true,
        viewport: { width: 1280, height: 800 },
        acceptDownloads: false,
      };
      if (
        process.platform === 'win32' &&
        fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
      )
        options.channel = 'msedge';
      try {
        this.context = await chromium.launchPersistentContext(
          path.join(this.root, 'browser'),
          options,
        );
        this.context.on('close', () => {
          this.context = null;
          this.pages.clear();
        });
        return this.context;
      } catch (error) {
        throw new Error(
          'Browser could not start. Install Chromium with: npx playwright install chromium. ' +
            errorMessage(error).split('\n')[0],
          { cause: error },
        );
      } finally {
        this.opening = null;
      }
    })();
    return this.opening;
  }
  async page(taskId: string): Promise<Page> {
    const context = await this.start();
    if (!this.pages.has(taskId) || this.pages.get(taskId)?.isClosed())
      this.pages.set(taskId, await context.newPage());
    const page = this.pages.get(taskId);
    if (!page) throw new Error('Browser page unavailable.');
    return page;
  }
  async snapshot(page: Page, taskId: string): Promise<BrowserSnapshot> {
    const text = (await page.locator('body').innerText({ timeout: 10000 })).slice(0, 16000);
    const elements = await page.locator('a,button,input,textarea,select').evaluateAll((els) =>
      els.slice(0, 100).map((el, index) => ({
        index,
        tag: el.tagName.toLowerCase(),
        text: (
          (el instanceof HTMLElement ? el.innerText : el.textContent) ||
          el.getAttribute('aria-label') ||
          el.getAttribute('placeholder') ||
          el.getAttribute('name') ||
          ''
        ).slice(0, 100),
        href: el.getAttribute('href'),
        type: el.getAttribute('type'),
      })),
    );
    this.latest = {
      taskId,
      url: page.url(),
      title: await page.title(),
      at: new Date().toISOString(),
    };
    return { ...this.latest, text, elements };
  }
  async navigate(taskId: string, url: string) {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
      throw new Error('Use an HTTP or HTTPS URL without credentials.');
    const page = await this.page(taskId);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return this.snapshot(page, taskId);
  }
  async act(taskId: string, args: BrowserAction) {
    const page = await this.page(taskId);
    if (!Number.isInteger(args.index) || args.index < 0 || args.index > 99)
      throw new Error('Use an element index from the latest browser result.');
    const el = page.locator('a,button,input,textarea,select').nth(args.index);
    if (args.action === 'fill') await el.fill(String(args.value ?? ''), { timeout: 10000 });
    else if (args.action === 'click') await el.click({ timeout: 10000 });
    else if (args.action === 'select')
      await el.selectOption(String(args.value ?? ''), { timeout: 10000 });
    else throw new Error('Browser action must be click, fill, or select.');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    return this.snapshot(page, taskId);
  }
  async screenshot(taskId: string) {
    return (await this.page(taskId)).screenshot({ type: 'jpeg', quality: 70, timeout: 10000 });
  }
  async closePage(taskId: string) {
    const page = this.pages.get(taskId);
    if (page) await page.close().catch(() => {});
    this.pages.delete(taskId);
  }
  async close() {
    // A launch already in progress must settle before its context can be closed.
    await this.opening?.catch(() => {});
    await this.context?.close();
  }
}

export function parseBrowserAction(args: Record<string, unknown>): BrowserAction {
  const action = text(args.action, 10, 'browser action');
  if (!['click', 'fill', 'select'].includes(action))
    throw new Error('Browser action must be click, fill, or select.');
  const index = number(args.index, 0, 99, 'Element index');
  if (!Number.isInteger(index)) throw new Error('Element index must be an integer.');
  return {
    action: action as BrowserAction['action'],
    index,
    value: optionalText(args.value, 24000, 'input value'),
  };
}
