import fs from 'fs';
import myPackage from './package.json';

myPackage.publishConfig.tag = 'development';
fs.writeFileSync('./package.json', JSON.stringify(myPackage, null, 2));
