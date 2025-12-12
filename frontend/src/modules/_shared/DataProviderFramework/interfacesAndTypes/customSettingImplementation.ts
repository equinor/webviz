import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";

import type { GlobalSettings } from "../framework/DataProviderManager/DataProviderManager";

export type OverriddenValueRepresentationArgs<TValue> = {
    value: TValue;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

// Base component props shared by both static and dynamic settings
type SettingComponentPropsBase<TInternalValue> = {
    onValueChange: (newValue: TInternalValue | ((prevValue: TInternalValue) => TInternalValue)) => void;
    value: TInternalValue;
    isValueValid: boolean;
    overriddenValue: TInternalValue | null;
    isOverridden: boolean;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    globalSettings: GlobalSettings;
};

// Component props for static settings (no valueRange)
export type StaticSettingComponentProps<TInternalValue> = SettingComponentPropsBase<TInternalValue>;

// Component props for dynamic settings (with valueRange)
export type DynamicSettingComponentProps<TInternalValue, TValueRange> = SettingComponentPropsBase<TInternalValue> & {
    valueRange: TValueRange;
};

// For backward compatibility - delegates to the correct type based on TValueRange
export type SettingComponentProps<TInternalValue, TValueRange = never> = [TValueRange] extends [never]
    ? StaticSettingComponentProps<TInternalValue>
    : DynamicSettingComponentProps<TInternalValue, TValueRange>;

export type ValueRangeIntersectionReducerDefinition<TValueRange, TStartingValue> = {
    startingValue: TStartingValue;
    reducer: (
        accumulator: TValueRange | TStartingValue,
        currentValueRange: TValueRange,
        currentIndex: number,
    ) => TValueRange;
    isValid: (valueRange: TValueRange) => boolean;
};

// Base interface shared by both static and dynamic settings
type CustomSettingImplementationBase<TInternalValue> = {
    defaultValue?: TInternalValue;
    serializeValue?: (value: TInternalValue) => string;
    deserializeValue?: (serializedValue: string) => TInternalValue;
    /**
     * Type guard to validate that a deserialized value has the correct structure.
     * This is used to catch malformed persisted values before they cause runtime errors.
     * Return true if the value has the expected structure, false otherwise.
     * Note: This should check the structure/type, not the validity of values within the structure.
     *
     * Implementation note: You can use the createStructureValidator helper to create
     * a validator from a JTD schema, or write a custom validation function.
     */
    isValueValidStructure: (value: unknown) => value is TInternalValue;
    overriddenValueRepresentation?: (args: OverriddenValueRepresentationArgs<TInternalValue>) => React.ReactNode;
};

/**
 * Implementation for static settings (no valueRange).
 * Static settings have fixed behavior and don't depend on external data.
 */
export type StaticSettingImplementation<
    TInternalValue,
    TExternalValue = TInternalValue,
> = CustomSettingImplementationBase<TInternalValue> & {
    getIsStatic: () => boolean;
    makeComponent(): (props: StaticSettingComponentProps<TInternalValue>) => React.ReactNode;
    fixupValue?: (currentValue: TInternalValue) => TInternalValue;
    isValueValid?: (value: TInternalValue) => boolean;
    mapInternalToExternalValue: (internalValue: TInternalValue, valueRange: any) => TExternalValue;
};

/**
 * Implementation for dynamic settings (with valueRange).
 * Dynamic settings adapt their behavior based on available values (valueRange).
 */
export type DynamicSettingImplementation<TInternalValue, TExternalValue, TValueRange> =
    CustomSettingImplementationBase<TInternalValue> & {
        getIsStatic?: () => boolean;
        valueRangeIntersectionReducerDefinition: ValueRangeIntersectionReducerDefinition<TValueRange, any>;
        makeComponent(): (props: DynamicSettingComponentProps<TInternalValue, TValueRange>) => React.ReactNode;
        fixupValue?: (currentValue: TInternalValue, valueRange: TValueRange) => TInternalValue;
        isValueValid?: (value: TInternalValue, valueRange: TValueRange) => boolean;
        mapInternalToExternalValue: (internalValue: TInternalValue, valueRange: TValueRange) => TExternalValue;
    };

/**
 * Main type for custom setting implementations.
 * Automatically delegates to StaticSettingImplementation or DynamicSettingImplementation
 * based on whether TValueRange is provided.
 */
export type CustomSettingImplementation<TInternalValue, TExternalValue = TInternalValue, TValueRange = never> = [
    TValueRange,
] extends [never]
    ? StaticSettingImplementation<TInternalValue, TExternalValue>
    : DynamicSettingImplementation<TInternalValue, TExternalValue, TValueRange>;
