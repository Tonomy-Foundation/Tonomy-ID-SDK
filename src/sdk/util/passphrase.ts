import fs from 'fs';
import path from 'path';

const wordListPath = path.join(__dirname, '..', 'passphraseWords.txt');
const wordList = fs.readFileSync(wordListPath, 'utf8').split('\n');

export function generateRandomKeywords(numKeywords = 6): string[] {
    const randomIndices: number[] = [];

    while (randomIndices.length < numKeywords) {
        const randomIndex = Math.floor(Math.random() * wordList.length);

        if (!randomIndices.includes(randomIndex)) {
            randomIndices.push(randomIndex);
        }
    }

    const randomKeywords: string[] = randomIndices.map((index) => wordList[index]);

    return randomKeywords;
}

export function generateAutoSuggestions(inputString: string): string[] {
    const wordsLinting = wordList.filter((word) => word.trim() !== '');

    const matchingSuggestions: string[] = wordsLinting
        .filter((word: string) => word.toLowerCase().includes(inputString.toLowerCase()))
        .slice(0, 4);

    return matchingSuggestions;
}
