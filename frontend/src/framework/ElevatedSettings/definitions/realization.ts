import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";

export const REALIZATION_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting<
    number | null,
    readonly number[]
>({
    key: "realization",
    defaultValue: 0,
    initialConstraints: [],
    // No `constraintMode` - defaults to union, so the selector offers every realization any
    // consumer knows about rather than only the ones common to all of them.
    isValueValid: (value, constraints) => {
        return value === null || constraints.includes(value);
    },
});
