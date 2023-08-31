import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory path of the current module
const currentModulePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentModulePath);

// Construct the absolute path to the passphraseWords.txt file
const filePath = path.join(currentDirectory, 'passphraseWords.txt');
const TopPassphrasePath = path.join(currentDirectory, 'topPassphrases.ts');

// Read words from words.txt
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading words.txt:', err);
        return;
    }

    // Split the data into an array of words
    const words = data.trim().split('\n');

    // Prepare the new passwords.ts content
    const newPasswordsContent = `export const topPasswords = [\n    // List your words here\n    '${words.join(
        "',\n    '"
    )}',\n];\n`;

    // Write the updated content back to passwords.ts
    fs.writeFile(TopPassphrasePath, newPasswordsContent, 'utf8', (writeErr) => {
        if (writeErr) {
            console.error('Error writing to passwords.ts:', writeErr);
            return;
        }

        console.log('Passwords updated successfully.');
    });
});
