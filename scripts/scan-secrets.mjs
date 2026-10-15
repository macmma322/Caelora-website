import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const paths = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{25,}/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{20,}/,
  /\bAKIA[A-Z0-9]{16}\b/,
];
const failures = [];
for (const path of new Set(paths)) {
  if (/(^|\/)\.env($|\.)/.test(path) && !path.endsWith('.env.example'))
    failures.push(`${path}: environment file must be ignored`);
  if (/(?:appsettings\.Local\.json|\/runtime-config\.json|\.(?:pfx|pem|key))$/.test(path))
    failures.push(`${path}: private/local file must be ignored`);
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  const content = bytes.toString('utf8');
  if (patterns.some((pattern) => pattern.test(content)))
    failures.push(`${path}: potential secret detected`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `PASS: scanned ${new Set(paths).size} source files; no recognized secrets or forbidden local files. This is a preventative pattern scan, not a guarantee.`,
  );
