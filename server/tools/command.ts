import { spawn } from 'node:child_process';
export interface CommandResult {
  exitCode: number | null;
  output: string;
  stopped: boolean;
}
export function executeCommand(
  command: string,
  cwd: string,
  signal?: AbortSignal,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    if (typeof command !== 'string' || !command.trim() || command.length > 12000)
      return reject(new Error('Invalid command.'));
    const win = process.platform === 'win32';
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        /^(path|systemroot|windir|temp|tmp|home|userprofile|comspec|pathext|localappdata|appdata)$/i.test(
          key,
        ),
      ),
    );
    const child = spawn(
      win ? 'powershell.exe' : '/bin/sh',
      win ? ['-NoProfile', '-NonInteractive', '-Command', command] : ['-c', command],
      { cwd, windowsHide: true, env, detached: !win },
    );
    let output = '',
      stopped = false;
    const append = (data: Buffer) => {
      if (output.length < 32000) output += data.toString().slice(0, 32000 - output.length);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    const kill = () => {
      stopped = true;
      if (win && child.pid)
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
      else {
        try {
          if (child.pid) process.kill(-child.pid, 'SIGKILL');
        } catch {
          child.kill('SIGKILL');
        }
      }
    };
    const timer = setTimeout(kill, 60000);
    signal?.addEventListener('abort', kill, { once: true });
    if (signal?.aborted) kill();
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', kill);
    };
    child.on('error', (error) => {
      cleanup();
      reject(error);
    });
    child.on('close', (code) => {
      cleanup();
      resolve({ exitCode: code, output, stopped });
    });
  });
}
