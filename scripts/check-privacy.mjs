import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['node_modules', '.git', 'dist', 'coverage']);
const findings = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const file = path.join(directory, entry.name), relative = path.relative(root, file);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (!entry.isFile()) { findings.push(`${relative}: unexpected non-regular file`); continue; }
    if (/\.(pcapng?|har|pem|key|log)$/i.test(entry.name) || (/^\.env/.test(entry.name) && entry.name !== '.env.example')) {
      findings.push(`${relative}: private/diagnostic file type`); continue;
    }
    const text = await readFile(file, 'utf8');
    const checks = [
      [/\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/, 'private LAN address'],
      [/(?<![A-Fa-f\d:])(?:[A-Fa-f\d]{2}:){5}[A-Fa-f\d]{2}(?![A-Fa-f\d:])/, 'installation MAC/BSSID'],
      [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
      [/(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/, 'access token'],
      [/\/home\/[A-Za-z0-9_-]+\//, 'personal home-directory path'],
    ];
    for (const [regex, label] of checks) if (regex.test(text)) findings.push(`${relative}: ${label}`);
  }
}
await scan(root);
if (findings.length) { process.stderr.write(findings.join('\n')+'\n'); process.exitCode=1; }
else process.stdout.write('Privacy policy checks passed. Also manually review git history and evidence before publishing.\n');
