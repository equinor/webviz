import { InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { fixupUserSelection } from "@lib/utils/fixupUserSelection";

export function fixupUserSelectedIdentifierValues(
    userSelectedIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[] | null,
    uniqueIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[],
    selectAllOnFixup: boolean
): InplaceVolumetricsIdentifierWithValues_api[] {
    const fixedUpIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[] = [];
    if (!userSelectedIdentifierValues) {
        for (const entry of uniqueIdentifierValues) {
            fixedUpIdentifierValues.push({
                identifier: entry.identifier,
                values: fixupUserSelection(
                    entry.values,
                    uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? [],
                    selectAllOnFixup
                ),
            });
        }
        return fixedUpIdentifierValues;
    }

    for (const entry of userSelectedIdentifierValues) {
        if (!uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)) {
            continue;
        }
        fixedUpIdentifierValues.push({
            identifier: entry.identifier,
            values: fixupUserSelection(
                entry.values,
                uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? [],
                selectAllOnFixup
            ),
        });
    }

    if (userSelectedIdentifierValues.length !== uniqueIdentifierValues.length) {
        for (const entry of uniqueIdentifierValues) {
            if (fixedUpIdentifierValues.find((el) => el.identifier === entry.identifier)) {
                continue;
            }
            fixedUpIdentifierValues.push({
                identifier: entry.identifier,
                values: uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? [],
            });
        }
    }
    return fixedUpIdentifierValues;
}
