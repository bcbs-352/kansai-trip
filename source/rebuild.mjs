import { cp, mkdir, rename, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const source = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(source);
const upstream = path.join(root, '.upstream/TREK');
const commit = 'dc36c21c08f681fd2806764fad8e17b270f6f175';
try { await access(path.join(upstream, '.git')); }
catch {
  await mkdir(path.dirname(upstream), { recursive: true });
  execFileSync('git', ['clone', '--filter=blob:none', '--no-checkout', 'https://github.com/liketrek/TREK.git', upstream], { stdio: 'inherit' });
}
execFileSync('git', ['-C', upstream, 'checkout', '--detach', commit], { stdio: 'inherit' });
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const runNpm = args => execFileSync(npm, args, { cwd: upstream, stdio: 'inherit', shell: process.platform === 'win32' });
runNpm(['ci']);
runNpm(['run', 'build', '--workspace=shared']);
const client = path.join(upstream, 'client');
await cp(path.join(source, 'src'), path.join(client, 'src/pagesStatic'), { recursive: true });
await cp(path.join(source, 'pages.html'), path.join(client, 'pages.html'));
await cp(path.join(source, 'vite.pages.config.js'), path.join(client, 'vite.pages.config.js'));
const result = path.resolve(upstream, '../github-pages-trek');
execFileSync(process.execPath, [path.join(upstream, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.pages.config.js'], { cwd: client, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=6144' } });
const rebuilt = path.join(root, 'rebuilt');
await mkdir(rebuilt, { recursive: true });
await cp(result, rebuilt, { recursive: true });
await rename(path.join(rebuilt, 'pages.html'), path.join(rebuilt, 'index.html'));
await mkdir(path.join(rebuilt, 'icons'), { recursive: true });
await cp(path.join(client, 'public/logo-dark.svg'), path.join(rebuilt, 'logo-dark.svg'));
await cp(path.join(client, 'public/icons/icon.svg'), path.join(rebuilt, 'icons/icon.svg'));
for (const name of ['LICENSE', 'NOTICE.md']) await cp(path.join(upstream, name), path.join(rebuilt, name));
await cp(source, path.join(rebuilt, 'source'), { recursive: true });
await cp(path.join(source, 'src/trip.json'), path.join(rebuilt, 'trip.json'));
await cp(path.join(source, 'README.md'), path.join(rebuilt, 'README.md'));
const { writeFile } = await import('node:fs/promises');
await writeFile(path.join(rebuilt, '.nojekyll'), '');
console.log(`Built static TREK: ${rebuilt}`);
