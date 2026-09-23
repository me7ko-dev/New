// Събира уеб версията (dist/, от `expo export --platform web`) в един HTML файл,
// който може да се отвори или публикува самостоятелно: CSS и JS са вградени.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="\/([^"]+)"/g)].map((m) => m[1]);
const jsFiles = [...html.matchAll(/<script src="\/([^"]+)"/g)].map((m) => m[1]);
if (jsFiles.length === 0) throw new Error('В dist/index.html няма JS пакет — първо изпълнете expo export.');

const read = (f) => fs.readFileSync(path.join(dist, f), 'utf8');
// `</script` вътре в пакета би затворило тага по-рано.
const safeJs = (s) => s.replace(/<\/script/gi, '<\\/script');

const out = `<title>Обект План</title>
<style>
:root { --app-bg: #F4F5F7; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --app-bg: #0E0F11; color-scheme: dark; } }
:root[data-theme="dark"] { --app-bg: #0E0F11; color-scheme: dark; }
html, body { height: 100%; }
body { overflow: hidden; background: var(--app-bg); }
#root { display: flex; height: 100%; flex: 1; }
${cssFiles.map(read).join('\n')}
</style>
<div id="root"></div>
${jsFiles.map((f) => `<script>\n${safeJs(read(f))}\n</script>`).join('\n')}
`;

const target = path.join(dist, 'obekt-plan.html');
fs.writeFileSync(target, out);
console.log(`${target} — ${(Buffer.byteLength(out) / 1024 / 1024).toFixed(2)} MB`);
