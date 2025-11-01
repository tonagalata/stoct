#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the service worker file
const swPath = path.join(__dirname, '../public/sw.js');

// Read the current service worker
let swContent = fs.readFileSync(swPath, 'utf8');

// Extract current version
const versionMatch = swContent.match(/const CACHE_VERSION = '(.+)';/);
if (!versionMatch) {
  console.error('Could not find CACHE_VERSION in sw.js');
  process.exit(1);
}

const currentVersion = versionMatch[1];
console.log('Current version:', currentVersion);

// Generate new version
const now = new Date();
const newVersion = `v${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

// Update the version in the service worker
swContent = swContent.replace(
  /const CACHE_VERSION = '.+';/,
  `const CACHE_VERSION = '${newVersion}';`
);

// Write the updated service worker
fs.writeFileSync(swPath, swContent);

console.log('Updated version to:', newVersion);
console.log('Service worker cache version updated successfully!');
console.log('\nNext steps:');
console.log('1. Build your app: npm run build');
console.log('2. Deploy to your hosting platform');
console.log('3. Users will be prompted to update when they visit the app');

