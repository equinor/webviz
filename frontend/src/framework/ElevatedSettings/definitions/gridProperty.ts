import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";

export const GRID_PROPERTY_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting<
    string | null,
    readonly string[]
>({
    key: "gridProperty",
    defaultValue: null,
    initialConstraints: [],
    isValueValid: (value, constraints) => {
        return value === null || constraints.includes(value);
    },
});
