const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Returns a unique letter combination for a given index. For example, 0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, etc.
 */
export function getAlphabetLetter(index: number): string {
    const base = ALPHABET.length;
    let result = "";
    let currentIndex = index;

    do {
        result = ALPHABET[currentIndex % base] + result;
        currentIndex = Math.floor(currentIndex / base) - 1;
    } while (currentIndex >= 0);

    return result;
}
