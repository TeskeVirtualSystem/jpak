#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'jssrc');
const distDir = path.join(rootDir, 'dist');

const banner = `/**
 * JPAK — Multi-use JavaScript Package System
 * @version ${require('../package.json').version}
 * @license MIT
 * @author Lucas Teske
 * @see https://github.com/TeskeVirtualSystem/jpak
 */\n`;

async function build() {
  const files = fs.readdirSync(srcDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  const rawFiles = files.map(f => fs.readFileSync(path.join(srcDir, f), 'utf8'));

  fs.mkdirSync(distDir, { recursive: true });

  // UMD/CJS build — zzzz.js handles module.exports / window.JPAK export
  const umdContent = banner + rawFiles.join('\n') + '\n';
  const umdPath = path.join(distDir, 'jpak.js');
  fs.writeFileSync(umdPath, umdContent);

  // ESM build — same content but with ESM export replacing zzzz.js logic
  const esmFiles = rawFiles.map(content => {
    if (content.includes("module.exports.JPAK = JPAK")) {
      return content
        .replace(
          /if\s*\(\(typeof module[^)]+\)\)\s*\n\s*module\.exports\.JPAK = JPAK;\s*\nelse\n\s*window\.JPAK = JPAK;?/,
          'export { JPAK };\nexport default JPAK;'
        );
    }
    return content;
  });
  const esmContent = banner + esmFiles.join('\n') + '\n';
  const esmPath = path.join(distDir, 'jpak.mjs');
  fs.writeFileSync(esmPath, esmContent);

  // Minified UMD
  const minResult = await minify(rawFiles.join('\n'), {
    mangle: false,
  });
  const minPath = path.join(distDir, 'jpak.min.js');
  fs.writeFileSync(minPath, banner + minResult.code);

  console.log(`UMD:   ${umdPath}  (${Buffer.byteLength(umdContent)} bytes)`);
  console.log(`Min:   ${minPath}  (${Buffer.byteLength(minResult.code)} bytes)`);
  console.log(`ESM:   ${esmPath}  (${Buffer.byteLength(esmContent)} bytes)`);
  console.log(`Built ${files.length} source files successfully.`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
