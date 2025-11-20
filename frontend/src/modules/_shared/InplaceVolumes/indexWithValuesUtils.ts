import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { FixupSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelection } from "@lib/utils/fixupUserSelection";

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
            values: fixupUserSelection(
                entry.values,
                uniqueIndexValues.find((el) => el.indexColumn === entry.indexColumn)?.values ?? [],
                fixupSelection,
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
