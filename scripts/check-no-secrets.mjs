import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ignoredDirs = new Set(['.git', 'dist', 'node_modules', '.superpowers']);
const ignoredPaths = new Set([join('docs', 'superpowers')]);
const checkedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', '.yml']);
const forbiddenPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /OPENAI_API_KEY/i,
  /ANTHROPIC_API_KEY/i,
  /OCR_API_KEY/i,
  /VITE_.*SECRET/i,
  /VITE_.*API_KEY/i
];

function extensionOf(fileName) {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index);
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const filePath = join(dir, name);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      const relativePath = relative(process.cwd(), filePath);
      return ignoredDirs.has(name) || ignoredPaths.has(relativePath) ? [] : listFiles(filePath);
    }

    return checkedExtensions.has(extensionOf(name)) ? [filePath] : [];
  });
}

const offenders = [];

for (const file of listFiles(process.cwd())) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      offenders.push(`${file} matched ${pattern}`);
    }
  }
}

if (offenders.length > 0) {
  console.error('Potential frontend secret leak detected:');
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}

console.log('No obvious frontend secrets detected.');
