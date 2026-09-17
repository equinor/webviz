export function makeUniqueName(existingNames: Set<string>, baseName: string, maxAttempts: number = 1000): string {
    if (!existingNames.has(baseName)) {
        return baseName;
    }

    let suffix = 1;
    let uniqueName = `${baseName} (${suffix})`;
    while (existingNames.has(uniqueName)) {
        suffix++;
        uniqueName = `${baseName} (${suffix})`;
        if (suffix > maxAttempts) {
            throw new Error(
                `Unable to generate a unique name for base name "${baseName}" after ${maxAttempts} attempts.`,
            );
        }
    }
    return uniqueName;
}
