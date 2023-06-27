import fs from 'fs';

const filePath = './package.json';

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Remove the tag property from publishConfig
delete packageJson.publishConfig.tag;

// Write the updated package.json file
fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));

console.log('Tag removed successfully from package.json.');
