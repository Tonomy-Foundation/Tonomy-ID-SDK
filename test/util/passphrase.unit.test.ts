import { setTestSettings } from '../helpers/settings';
import { generateAutoSuggestions, isKeyword, generateRandomKeywords } from '../../src/sdk/util';

setTestSettings();

describe('Passphrase utilities', () => {
    describe('generateRandomKeywords()', () => {
        it('generates random passphrase words', () => {
            const generatedKeywords = generateRandomKeywords();

            expect(generatedKeywords).toHaveLength(6);
        });
    });

    describe('isKeyword()', () => {
        it('returns true for a valid keyword', () => {
            const isValidKeyword = isKeyword('above');

            expect(isValidKeyword).toBe(true);
        });

        it('returns false for an invalid keyword', () => {
            const isValidKeyword = isKeyword('xyz');

            expect(isValidKeyword).toBe(false);
        });
    });

    describe('generateAutoSuggestions()', () => {
        it('generates suggestions for a non-empty input', () => {
            const suggestedWords = generateAutoSuggestions('cap');

            suggestedWords.forEach((word) => {
                expect(word.toLowerCase()).toContain('cap');
            });
        });

        it('returns an empty array for an empty input', () => {
            const suggestedWords = generateAutoSuggestions('');

            expect(suggestedWords).toEqual([]);
        });

        it('returns an empty array for an input not in the list', () => {
            const suggestedWords = generateAutoSuggestions('xyz');

            expect(suggestedWords).toEqual([]);
        });
    });
});
