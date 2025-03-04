import type { InplaceVolumetricsIdentifierWithValues_api } from "@api";
import type { FixupSelection} from "@lib/utils/fixupUserSelection";
import { fixupUserSelection } from "@lib/utils/fixupUserSelection";

export function fixupUserSelectedIdentifierValues(
    userSelectedIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[] | null,
    uniqueIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[],
    fixupSelection: FixupSelection
): InplaceVolumetricsIdentifierWithValues_api[] {
    const fixedUpIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[] = [];
    if (!userSelectedIdentifierValues) {
        for (const entry of uniqueIdentifierValues) {
            fixedUpIdentifierValues.push({
                identifier: entry.identifier,
                values: fixupUserSelection(
                    entry.values,
                    uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? [],
                    fixupSelection
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
                fixupSelection
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
