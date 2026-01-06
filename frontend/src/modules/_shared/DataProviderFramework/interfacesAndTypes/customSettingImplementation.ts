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

// Component props for static settings (no valueConstraints)
export type StaticSettingComponentProps<TInternalValue> = SettingComponentPropsBase<TInternalValue>;

// Component props for dynamic settings (with valueConstraints)
export type DynamicSettingComponentProps<TInternalValue, TValueConstraints> = SettingComponentPropsBase<TInternalValue> & {
    valueConstraints: TValueConstraints;
};

// For backward compatibility - delegates to the correct type based on TValueConstraints
export type SettingComponentProps<TInternalValue, TValueConstraints = never> = [TValueConstraints] extends [never]
    ? StaticSettingComponentProps<TInternalValue>
    : DynamicSettingComponentProps<TInternalValue, TValueConstraints>;

export type ValueConstraintsIntersectionReducerDefinition<TValueConstraints, TStartingValue> = {
    startingValue: TStartingValue;
    reducer: (
        accumulator: TValueConstraints | TStartingValue,
        currentValueConstraints: TValueConstraints,
        currentIndex: number,
    ) => TValueConstraints;
    isValid: (valueConstraints: TValueConstraints) => boolean;
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
 * Implementation for static settings (no valueConstraints).
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
    mapInternalToExternalValue: (internalValue: TInternalValue, valueConstraints: any) => TExternalValue;
};

/**
 * Implementation for dynamic settings (with valueConstraints).
 * Dynamic settings adapt their behavior based on available values (valueConstraints).
 */
export type DynamicSettingImplementation<TInternalValue, TExternalValue, TValueConstraints> =
    CustomSettingImplementationBase<TInternalValue> & {
        getIsStatic?: () => boolean;
        valueConstraintsIntersectionReducerDefinition: ValueConstraintsIntersectionReducerDefinition<TValueConstraints, any>;
        makeComponent(): (props: DynamicSettingComponentProps<TInternalValue, TValueConstraints>) => React.ReactNode;
        fixupValue?: (currentValue: TInternalValue, valueConstraints: TValueConstraints) => TInternalValue;
        isValueValid?: (value: TInternalValue, valueConstraints: TValueConstraints) => boolean;
        mapInternalToExternalValue: (internalValue: TInternalValue, valueConstraints: TValueConstraints) => TExternalValue;
    };

/**
 * Main type for custom setting implementations.
 * Automatically delegates to StaticSettingImplementation or DynamicSettingImplementation
 * based on whether TValueConstraints is provided.
 */
export type CustomSettingImplementation<TInternalValue, TExternalValue = TInternalValue, TValueConstraints = never> = [
    TValueConstraints,
] extends [never]
    ? StaticSettingImplementation<TInternalValue, TExternalValue>
    : DynamicSettingImplementation<TInternalValue, TExternalValue, TValueConstraints>;
