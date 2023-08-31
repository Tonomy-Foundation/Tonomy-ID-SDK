import fs from 'fs';
import path from 'path';

export function generateRandomKeywords(numKeywords = 6): string[] {
    const wordListPath = path.join(__dirname, '..', 'passphraseWords.txt');
    const wordList = fs.readFileSync(wordListPath, 'utf8').split('\n');

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
