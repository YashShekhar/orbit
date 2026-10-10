import fs from 'node:fs/promises';
import path from 'node:path';

export class Workspace {
  root: string;
  constructor(root: string) { this.root = path.resolve(root); }
  async resolve(relative = '.') {
    if (typeof relative !== 'string' || relative.includes('\0') || relative.includes(':')) throw new Error('Use a relative workspace path.');
    const target = path.resolve(this.root, relative);
    if (target !== this.root && !target.startsWith(this.root + path.sep)) throw new Error('Path is outside the shared workspace.');
    await fs.mkdir(this.root, { recursive: true });
    let check = this.root;
    for (const part of path.relative(this.root, target).split(path.sep).filter(Boolean)) {
      check = path.join(check, part);
      try { if ((await fs.lstat(check)).isSymbolicLink()) throw new Error('Symbolic links are not allowed in workspace tools.'); }
      catch (error) { if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error; }
    }
    return target;
  }
  async list(relative = '.') {
    const target = await this.resolve(relative);
    return Promise.all((await fs.readdir(target, { withFileTypes: true })).slice(0, 200).map(async entry => {
      const itemPath = path.join(relative, entry.name).replaceAll('\\', '/');
      const stat = await fs.lstat(path.join(target, entry.name));
      return { name: entry.name, path: itemPath, directory: entry.isDirectory(), size: stat.size, modified: stat.mtime.toISOString() };
    }));
  }
  async read(relative: string) {
    const target = await this.resolve(relative);
    if ((await fs.stat(target)).size > 256000) throw new Error('File is too large to read (250 KB limit).');
    return fs.readFile(target, 'utf8');
  }
  async write(relative: string, content: string) {
    if (typeof content !== 'string' || Buffer.byteLength(content) > 256000) throw new Error('Write a text file up to 250 KB.');
    const target = await this.resolve(relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
    return { path: relative, bytes: Buffer.byteLength(content) };
  }
}
