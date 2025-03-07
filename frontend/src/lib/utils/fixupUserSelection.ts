export enum FixupSelection {
    SELECT_NONE = "SELECT_NONE",
    SELECT_ALL = "SELECT_ALL",
    SELECT_FIRST = "SELECT_FIRST",
}

export function fixupUserSelection<TSelection>(
    userSelection: TSelection[],
    validOptions: TSelection[],
    fixupSelection: FixupSelection = FixupSelection.SELECT_FIRST,
): TSelection[] {
    const newSelections = userSelection.filter((selection) => validOptions.includes(selection));
    if (newSelections.length === 0 && validOptions.length > 0) {
        if (fixupSelection === FixupSelection.SELECT_ALL) {
            return validOptions;
        }
        if (fixupSelection === FixupSelection.SELECT_NONE) {
            return [];
        }

        // Fall back to selecting the first valid option
        newSelections.push(validOptions[0]);
    }

    return newSelections;
}
