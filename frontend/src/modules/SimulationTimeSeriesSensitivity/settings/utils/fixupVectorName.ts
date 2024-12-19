export function fixupVectorName(
    currVectorName: string | null,
    availableVectorNames: string[] | undefined
): string | null {
    if (!availableVectorNames || availableVectorNames.length === 0) {
        return null;
    }

    if (currVectorName && availableVectorNames.some((name) => name === currVectorName)) {
        return currVectorName;
    }

    return availableVectorNames[0];
}
