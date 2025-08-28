import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const requiredFiles = [
  'templates/default/package.json',
  'templates/default/firebase.json',
  'templates/default/src/main.js',
  'templates/default/src/App.vue',
  'templates/default/functions/index.js'
];

console.log('Validating template structure...');

let hasErrors = false;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing required file: ${file}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found: ${file}`);
  }
}

if (hasErrors) {
  console.error('\n❌ Template validation failed');
  process.exit(1);
} else {
  console.log('\n✅ Template validation passed');
}