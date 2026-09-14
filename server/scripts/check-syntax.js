import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'prisma', 'test', 'scripts'];
const files = [];

function collect(path) {
  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collect(fullPath);
    } else if (entry.endsWith('.js') && fullPath !== join('scripts', 'check-syntax.js')) {
      files.push(fullPath);
    }
  }
}

for (const root of roots) {
  collect(root);
}

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax check failed: ${relative(process.cwd(), file)}`);
    process.stderr.write(result.stderr);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
