import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";

export type WellboreElevatedSettingOption = {
    uuid: string;
    name: string;
};

export const WELLBORE_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting<
    string | null,
    readonly WellboreElevatedSettingOption[]
>({
    key: "wellbore",
    defaultValue: null,
    initialConstraints: [],
    // Not `constraintMode` - `WellboreElevatedSettingOption` is an object identified by `uuid`, so
    // the default union/intersection combiners (which compare by reference via Set/`includes`)
    // wouldn't dedupe two consumers' equal-but-distinct option objects for the same wellbore.
    combineConstraints: (accumulator, current) => {
        const merged = [...accumulator];
        for (const option of current) {
            if (!merged.some((existing) => existing.uuid === option.uuid)) {
                merged.push(option);
            }
        }
        return merged;
    },
    isValueValid: (value, constraints) => {
        return value === null || constraints.some((option) => option.uuid === value);
    },
    fixupValue: (value, constraints) => {
        return value ?? (constraints.at(0)?.uuid ?? null);
    },
});
