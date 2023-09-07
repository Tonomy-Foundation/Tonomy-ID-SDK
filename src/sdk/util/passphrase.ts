import { englistPassphaseWords } from '../englistPassphaseWords';
import { randomNumber } from './crypto';

/**
 * Generates an array of random keywords.
 * @returns An array of random keywords with a maximum of 6 words.
 */
export function generateRandomKeywords(): string[] {
    const randomIndices: number[] = [];

    while (randomIndices.length < 6) {
        const randomIndex = randomNumber(0, 2047);

        if (!randomIndices.includes(randomIndex)) {
            randomIndices.push(randomIndex);
        }
    }

    const randomKeywords: string[] = randomIndices.map((index) => englistPassphaseWords[index]);

    return randomKeywords;
}

/**
 * Generates auto-suggestions based on the input string.
 * @param inputString - The input string for which auto-suggestions are generated.
 * @returns An array of auto-suggestions with a maximum of 4 words.
 */
export function generateAutoSuggestions(inputString: string): string[] {
    if (inputString.trim() === '') {
        return []; // Return an empty array for empty input string
    }

    inputString = inputString.toLowerCase();
    const matchingSuggestions: string[] = englistPassphaseWords
        .filter((word: string) => word.toLowerCase().includes(inputString))
        .slice(0, 4);

    return matchingSuggestions;
}
