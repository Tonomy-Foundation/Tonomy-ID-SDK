import fs from 'fs';

const filePath = './package.json';

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Modify the tag value
packageJson.publishConfig.tag = 'development';

// Write the updated package.json file
fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));

console.log('Version tag changed successfully to development.');
