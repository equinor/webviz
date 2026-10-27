import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { FixupSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelection } from "@lib/utils/fixupUserSelection";

export function filterAndOrderSelectedIndexValues(selectedValues: string[], availableValues: string[]): string[] {
    const selectedValueSet = new Set(selectedValues);
    return availableValues.filter((value) => selectedValueSet.has(value));
}

/*
 * The selection for the index columns that are offered. A retained selection can hold entries for columns that are no
 * longer offered (e.g. after switching to a table without FACIES). Nothing shows them, so they can't be repaired - they
 * are kept, but must neither make the selection invalid nor be used for filtering. An offered column without an entry
 * (e.g. FACIES after switching to a table that has it) has never been filtered, so all its values count as selected -
 * without writing them to the selection until the user changes them.
 */
export function getSelectionForOfferedIndexColumns(
    selectedIndicesWithValues: InplaceVolumesIndexWithValues_api[],
    availableIndicesWithValues: InplaceVolumesIndexWithValues_api[],
): InplaceVolumesIndexWithValues_api[] {
    const offeredSelection = selectedIndicesWithValues.filter((selected) =>
        availableIndicesWithValues.some((available) => available.indexColumn === selected.indexColumn),
    );
    const unfilteredIndicesWithValues = availableIndicesWithValues
        .filter((available) => !offeredSelection.some((selected) => selected.indexColumn === available.indexColumn))
        .map((available) => ({ indexColumn: available.indexColumn, values: [...available.values] }));

    return [...offeredSelection, ...unfilteredIndicesWithValues];
}

// Utility function to check if a selection is a valid subset of available options
export function isSelectedIndicesWithValuesValidSubset(
    selectedIndicesWithValues: InplaceVolumesIndexWithValues_api[],
    availableIndicesWithValues: InplaceVolumesIndexWithValues_api[],
): boolean {
    // Selection cannot contain more indexColumns than available options
    if (selectedIndicesWithValues.length > availableIndicesWithValues.length) return false;

    for (const sel of selectedIndicesWithValues) {
        // Find corresponding available item
        const avail = availableIndicesWithValues.find((a) => a.indexColumn === sel.indexColumn);
        if (!avail) return false; // invalid indexColumn

        // All selected values must be allowed
        for (const v of sel.values) {
            if (!avail.values.includes(v)) return false;
        }
    }

    return true;
}

// Utility function to fix up user-selected index values based on available options and fixup strategy
export function fixupUserSelectedIndexValues(
    userSelectedIndexValues: InplaceVolumesIndexWithValues_api[] | null,
    uniqueIndexValues: InplaceVolumesIndexWithValues_api[],
    fixupSelection: FixupSelection,
): InplaceVolumesIndexWithValues_api[] {
    const fixedUpIndexValues: InplaceVolumesIndexWithValues_api[] = [];
    if (!userSelectedIndexValues) {
        for (const entry of uniqueIndexValues) {
            fixedUpIndexValues.push({
                indexColumn: entry.indexColumn,
                values: fixupUserSelection(
                    entry.values,
                    uniqueIndexValues.find((el) => el.indexColumn === entry.indexColumn)?.values ?? [],
                    fixupSelection,
                ),
            });
        }
        return fixedUpIndexValues;
    }

    for (const entry of userSelectedIndexValues) {
        if (!uniqueIndexValues.find((el) => el.indexColumn === entry.indexColumn)) {
            continue;
        }
        fixedUpIndexValues.push({
            indexColumn: entry.indexColumn,
            values: filterAndOrderSelectedIndexValues(
                fixupUserSelection(
                    entry.values,
                    uniqueIndexValues.find((el) => el.indexColumn === entry.indexColumn)?.values ?? [],
                    fixupSelection,
                ),
                uniqueIndexValues.find((el) => el.indexColumn === entry.indexColumn)?.values ?? [],
            ),
        });
    }

    if (userSelectedIndexValues.length !== uniqueIndexValues.length) {
        for (const entry of uniqueIndexValues) {
            if (fixedUpIndexValues.find((el) => el.indexColumn === entry.indexColumn)) {
                continue;
            }
            fixedUpIndexValues.push({
                indexColumn: entry.indexColumn,
                values: uniqueIndexValues.find((el) => el.indexColumn === entry.indexColumn)?.values ?? [],
            });
        }
    }
    return fixedUpIndexValues;
}
