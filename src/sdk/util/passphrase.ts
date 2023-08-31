import { topPasswords } from '../topPassphrases';
import { randomBytes } from './crypto';

export function generateRandomKeywords(): string[] {
    const randomIndices: number[] = [];
    const maxIndex = topPasswords.length;

    while (randomIndices.length < 6) {
        // Generate a random 4-byte number
        const randomBytesArray = randomBytes(4);
        const randomIndex = byteArrayToNumber(randomBytesArray) % maxIndex;

        if (!randomIndices.includes(randomIndex)) {
            randomIndices.push(randomIndex);
        }
    }

    const randomKeywords: string[] = randomIndices.map((index) => topPasswords[index]);

    return randomKeywords;
}

// Convert a byte array to a number
function byteArrayToNumber(byteArray: Uint8Array): number {
    return byteArray.reduce((value, byte) => value * 256 + byte, 0);
}

export function generateAutoSuggestions(inputString: string): string[] {
    inputString = inputString.toLowerCase();
    const matchingSuggestions: string[] = topPasswords
        .filter((word: string) => word.toLowerCase().includes(inputString))
        .slice(0, 4);

    return matchingSuggestions;
}
