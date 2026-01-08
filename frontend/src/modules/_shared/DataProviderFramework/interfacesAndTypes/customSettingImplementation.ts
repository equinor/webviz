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
export type DynamicSettingComponentProps<TInternalValue, TValueConstraints> =
    SettingComponentPropsBase<TInternalValue> & {
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
    serializeValue: (value: TInternalValue) => string;
    /**
     * Deserializes a string value back into the internal value type.
     * This method must either return a valid TInternalValue or throw an error.
     * Any errors thrown will be caught and handled by the SettingManager.
     *
     * Implementation guidelines:
     * - Validate the serialized string format and throw if invalid
     * - Validate the structure of the parsed value and throw if invalid
     * - Return the correctly typed internal value if valid
     *
     * @param serializedValue - The serialized string to deserialize
     * @returns The deserialized internal value
     * @throws Error if the serialized value is invalid or has incorrect structure
     */
    deserializeValue: (serializedValue: string) => TInternalValue;
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
        valueConstraintsIntersectionReducerDefinition: ValueConstraintsIntersectionReducerDefinition<
            TValueConstraints,
            any
        >;
        makeComponent(): (props: DynamicSettingComponentProps<TInternalValue, TValueConstraints>) => React.ReactNode;
        fixupValue?: (currentValue: TInternalValue, valueConstraints: TValueConstraints) => TInternalValue;
        isValueValid?: (value: TInternalValue, valueConstraints: TValueConstraints) => boolean;
        mapInternalToExternalValue: (
            internalValue: TInternalValue,
            valueConstraints: TValueConstraints,
        ) => TExternalValue;
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
