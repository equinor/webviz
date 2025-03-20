import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";

import { MakeAvailableValuesTypeBasedOnCategory } from "./utils";

import { GlobalSettings } from "../framework/DataLayerManager/DataLayerManager";
import { SettingCategory } from "../settings/settingsDefinitions";

export type OverriddenValueRepresentationArgs<TValue> = {
    value: TValue;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export type SettingComponentProps<TValue, TCategory extends SettingCategory> = {
    onValueChange: (newValue: TValue) => void;
    value: TValue;
    isValueValid: boolean;
    overriddenValue: TValue | null;
    isOverridden: boolean;
    availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory> | null;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    globalSettings: GlobalSettings;
};

export interface CustomSettingImplementation<TValue, TCategory extends SettingCategory> {
    defaultValue?: TValue;
    /**
     * A static setting does not have any available values and is not dependent on any other settings.
     *
     * @returns true if the setting is static, false otherwise.
     */
    getIsStatic?: () => boolean;
    makeComponent(): (props: SettingComponentProps<TValue, TCategory>) => React.ReactNode;
    fixupValue?: (
        currentValue: TValue,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>
    ) => TValue;
    isValueValid?: (
        value: TValue,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>
    ) => boolean;
    serializeValue?: (value: TValue) => string;
    deserializeValue?: (serializedValue: string) => TValue;
    overriddenValueRepresentation?: (args: OverriddenValueRepresentationArgs<TValue>) => React.ReactNode;
}
