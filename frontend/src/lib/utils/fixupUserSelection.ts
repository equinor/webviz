export function fixupUserSelection<TSelection>(
    userSelection: TSelection[],
    validOptions: TSelection[],
    selectAll: boolean = false
): TSelection[] {
    const newSelections = userSelection.filter((selection) => validOptions.includes(selection));
    if (newSelections.length === 0 && validOptions.length > 0) {
        if (selectAll) {
            return validOptions;
        }
        newSelections.push(validOptions[0]);
    }

    return newSelections;
}
