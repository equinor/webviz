import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";

export const GRID_MODEL_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting<
    string | null,
    readonly string[]
>({
    key: "gridModel",
    defaultValue: null,
    initialConstraints: [],
    isValueValid: (value, constraints) => {
        return value === null || constraints.includes(value);
    },
});
