import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";

import type { GlobalSettings } from "../framework/DataProviderManager/DataProviderManager";
import type { ValueRangeIntersectionReducerDefinition } from "../settings/settingsDefinitions";

export type OverriddenValueRepresentationArgs<TValue> = {
    value: TValue;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export type SettingComponentProps<TInternalValue, TValueRange> = {
    onValueChange: (newValue: TInternalValue) => void;
    value: TInternalValue;
    isValueValid: boolean;
    overriddenValue: TInternalValue | null;
    isOverridden: boolean;
    valueRange: TValueRange;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    globalSettings: GlobalSettings;
};

export interface CustomSettingImplementation<TInternalValue, TExternalValue, TValueRange> {
    defaultValue?: TInternalValue;
    /**
     * A static setting does not have any available values and is not dependent on any other settings.
     *
     * @returns true if the setting is static, false otherwise.
     */
    getIsStatic?: () => boolean;
    makeComponent(): (props: SettingComponentProps<TInternalValue, TValueRange>) => React.ReactNode;
    fixupValue: (currentValue: TInternalValue, valueRange: TValueRange) => TInternalValue;
    isValueValid: (value: TInternalValue, valueRange: TValueRange) => boolean;
    valueRangeIntersectionReducerDefinition: ValueRangeIntersectionReducerDefinition<TValueRange>;
    serializeValue?: (value: TInternalValue) => string;
    deserializeValue?: (serializedValue: string) => TInternalValue;
    mapInternalToExternalValue?: (internalValue: TInternalValue) => TExternalValue;
    overriddenValueRepresentation?: (args: OverriddenValueRepresentationArgs<TInternalValue>) => React.ReactNode;
}
