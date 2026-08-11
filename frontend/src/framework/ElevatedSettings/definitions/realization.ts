import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";

export const REALIZATION_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting<
    number | null,
    readonly number[]
>({
    key: "realization",
    defaultValue: 0,
    initialConstraints: [],
    combineConstraints: (accumulator, current) => {
        return accumulator.filter((value) => current.includes(value));
    },
    isValueValid: (value, constraints) => {
        return value === null || constraints.includes(value);
    },
});
