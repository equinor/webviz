export function fixupVectorName(
    currVectorName: string | null,
    availableVectorNames: string[] | undefined
): string | null {
    if (!availableVectorNames?.length) {
        return null;
    }

    if (currVectorName && availableVectorNames.includes(currVectorName)) {
        return currVectorName;
    }

    return availableVectorNames[0];
}
