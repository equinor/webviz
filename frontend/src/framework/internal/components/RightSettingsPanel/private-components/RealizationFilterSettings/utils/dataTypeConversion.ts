import { RealizationIndexSelection } from "@framework/RealizationFilter";

/**
 * Convert a realization index selection to a string tag for a realization picker.
 *
 * The string tag is in the format "start-end" or "index".
 */
function makeRealizationPickerTagFromRealizationIndexSelection(selection: RealizationIndexSelection): string {
    if (typeof selection === "number") {
        return `${selection}`;
    }
    return `${selection.start}-${selection.end}`;
}

/**
 * Convert realization index selections to string tags for a realization picker.
 *
 * The string tags are in the format "start-end" or "index".
 *
 * The selection can be be null, in which case an empty array is returned.
 */
export function makeRealizationPickerTagsFromRealizationIndexSelections(
    selections: readonly RealizationIndexSelection[] | null
): string[] {
    if (!selections) return [];

    return selections.map(makeRealizationPickerTagFromRealizationIndexSelection);
}

/**
 * Convert a string tag from a realization picker to a realization index selection.
 *
 * The string tag is expected to be in the format "start-end" or "index".
 */
function makeRealizationIndexSelectionFromRealizationPickerTag(tag: string): RealizationIndexSelection {
    const split = tag.split("-");
    if (split.length === 1) {
        return parseInt(split[0]);
    }
    return { start: parseInt(split[0]), end: parseInt(split[1]) };
}

/**
 * Convert string tags from a realization picker to realization index selections.
 */
export function makeRealizationIndexSelectionsFromRealizationPickerTags(tags: string[]): RealizationIndexSelection[] {
    return tags.map(makeRealizationIndexSelectionFromRealizationPickerTag);
}
