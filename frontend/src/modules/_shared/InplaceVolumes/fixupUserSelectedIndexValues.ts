import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { FixupSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelection } from "@lib/utils/fixupUserSelection";

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
