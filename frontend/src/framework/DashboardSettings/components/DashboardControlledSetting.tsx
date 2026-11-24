import type { DashboardSettingDefinition } from "../DashboardSettingDefinition";

export type DashboardControlledSettingProps<TValue> = {
    // The dashboard value, formatted by the dashboard setting definition
    value: TValue;
    // Whether the dashboard value is valid in the context of the setting it controls
    isValueValidHere: boolean;
    // Whether the setting is currently controlled by the dashboard setting
    isControlled: boolean;
    // The dashboard setting controlling the value - provides the default formatting of it
    controlledBy: DashboardSettingDefinition<TValue, any>;
    // Opt-out of the dashboard setting's formatting with custom formatting function
    valueToString?: (value: TValue) => string;
    // The setting's regular component, shown when the setting is not dashboard controlled
    children: React.ReactNode;
};

/**
 * Shows the dashboard value as text (or a message when it is not valid here) while a setting is controlled
 * by a dashboard setting - and the setting's regular component otherwise.
 */
export function DashboardControlledSetting<TValue>(props: DashboardControlledSettingProps<TValue>): React.ReactNode {
    if (!props.isControlled) {
        return props.children;
    }

    if (!props.isValueValidHere) {
        return <i className="text-warning-subtle text-body-sm">Dashboard value not valid here</i>;
    }

    return (
        <span className="text-body-sm">
            {props.valueToString ? props.valueToString(props.value) : props.controlledBy.valueToString(props.value)}
        </span>
    );
}
