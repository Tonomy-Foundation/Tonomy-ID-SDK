import { englishPassphraseWords } from './passphraseWordsEnglish';
import { randomNumber } from './crypto';

/**
 * Generates an array of random keywords.
 * @returns {string[]} An array of 6 random keywords.
 */
export function generateRandomKeywords(): string[] {
    const randomIndices: number[] = [];

    while (randomIndices.length < 6) {
        const randomIndex = randomNumber(0, 2047);

        if (!randomIndices.includes(randomIndex)) {
            randomIndices.push(randomIndex);
        }
    }

    const randomKeywords: string[] = randomIndices.map((index) => englishPassphraseWords[index]);

    return randomKeywords;
}

/**
 * Generates auto-suggestions based on the input string.
 * @param {string} inputString - The input string for which auto-suggestions are generated.
 * @returns {string[]} An array of auto-suggestions with a maximum of 4 words.
 */
export function generateAutoSuggestions(inputString: string): string[] {
    if (inputString.trim() === '') {
        return []; // Return an empty array for empty input string
    }

    inputString = inputString.toLowerCase();
    const matchingSuggestions: string[] = englishPassphraseWords
        .filter((word: string) => word.toLowerCase().includes(inputString))
        .slice(0, 4);

    return matchingSuggestions;
}

/**
 * Checks if the input string is a valid keyword.
 * @param {string} word - The input string to be checked.
 * @returns {boolean} True if the input string is a valid keyword, false otherwise.
 */
export function isKeyword(word: string): boolean {
    return englishPassphraseWords.includes(word);
}
