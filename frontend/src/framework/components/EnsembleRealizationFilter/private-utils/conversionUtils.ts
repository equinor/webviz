import { RealizationNumberSelection } from "@framework/RealizationFilter";

/**
 * Convert a realization number selection to a string tag for a realization picker.
 *
 * The string tag is in the format "start-end" or "number".
 */
function makeRealizationPickerTagFromRealizationNumberSelection(selection: RealizationNumberSelection): string {
    if (typeof selection === "number") {
        return `${selection}`;
    }
    return `${selection.start}-${selection.end}`;
}

/**
 * Convert realization number selections to string tags for a realization picker.
 *
 * The string tags are in the format "start-end" or "number".
 *
 * The selection can be be null, in which case an empty array is returned.
 */
export function makeRealizationPickerTagsFromRealizationNumberSelections(
    selections: readonly RealizationNumberSelection[] | null
): string[] {
    if (!selections) return [];

    return selections.map(makeRealizationPickerTagFromRealizationNumberSelection);
}

/**
 * Convert a string tag from a realization picker to a realization number selection.
 *
 * The string tag is expected to be in the format "start-end" or "number".
 */
function makeRealizationNumberSelectionFromRealizationPickerTag(tag: string): RealizationNumberSelection {
    const split = tag.split("-");
    if (split.length === 1) {
        return parseInt(split[0]);
    }
    return { start: parseInt(split[0]), end: parseInt(split[1]) };
}

/**
 * Convert string tags from a realization picker to realization number selections.
 */
export function makeRealizationNumberSelectionsFromRealizationPickerTags(tags: string[]): RealizationNumberSelection[] {
    return tags.map(makeRealizationNumberSelectionFromRealizationPickerTag);
}
