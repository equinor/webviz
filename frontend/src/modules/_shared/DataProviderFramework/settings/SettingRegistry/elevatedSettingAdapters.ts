import type { WellboreElevatedSettingOption } from "@framework/ElevatedSettings/definitions/wellbore";
import { WELLBORE_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/wellbore";
import { IntersectionType } from "@framework/types/intersection";

import type { IntersectionSettingOption, IntersectionSettingValue } from "../implementations/IntersectionSetting";
import { intersectionValueToRepresentation } from "../implementations/IntersectionSetting";

import type { DpfElevatedSettingAdapter } from "./_SettingRegistry";
import { makeDpfElevatedSettingAdapter } from "./_SettingRegistry";

// Non-trivial DpfElevatedSettingAdapter factories live here, one per elevated setting, so that
// _registerAllSettings.ts can stay a flat list of registrations instead of growing adapter logic
// inline. Adapters that are a plain identity mapping (elevated value/constraints already match the
// DPF setting's external value/constraints) can stay inline in _registerAllSettings.ts.

export function makeIntersectionWellboreElevatedSettingAdapter(
    defaultExtensionLength: number,
): DpfElevatedSettingAdapter<
    IntersectionSettingValue | null,
    IntersectionSettingOption[],
    string | null,
    readonly WellboreElevatedSettingOption[]
> {
    // The elevated wellbore setting only knows about a uuid; find the matching wellbore option among
    // this setting instance's own constraints to recover its name (and fill in an extension length,
    // which the elevated setting has no concept of).
    function mapElevatedWellboreToIntersectionValue(
        elevatedValue: string | null,
        valueConstraints: IntersectionSettingOption[],
    ): IntersectionSettingValue | null {
        if (elevatedValue === null) {
            return null;
        }

        const option = valueConstraints.find(
            (candidate) => candidate.type === IntersectionType.WELLBORE && candidate.uuid === elevatedValue,
        );
        if (!option) {
            return null;
        }

        return {
            type: IntersectionType.WELLBORE,
            name: option.name,
            uuid: option.uuid,
            extensionLength: defaultExtensionLength,
        };
    }

    return makeDpfElevatedSettingAdapter<
        string | null,
        readonly WellboreElevatedSettingOption[],
        IntersectionSettingValue | null,
        IntersectionSettingOption[]
    >(WELLBORE_ELEVATED_SETTING, {
        mapValueConstraintsToElevatedConstraints: (valueConstraints) => {
            const mappedConstraints = valueConstraints
                .filter((option) => option.type === IntersectionType.WELLBORE)
                .map((option) => ({ uuid: option.uuid, name: option.name }));
            console.debug("makeIntersectionWellboreElevatedSettingAdapter", { valueConstraints, mappedConstraints });
            return mappedConstraints;
        },
        mapElevatedValueToExternalValue: mapElevatedWellboreToIntersectionValue,
        mapElevatedValueToRepresentation: (elevatedValue, valueConstraints) =>
            intersectionValueToRepresentation(mapElevatedWellboreToIntersectionValue(elevatedValue, valueConstraints)),
    });
}
