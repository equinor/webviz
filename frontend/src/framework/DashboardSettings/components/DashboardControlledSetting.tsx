export type DashboardControlledSettingProps = {
    isControlled: boolean;
    // Whether the dashboard value is valid in the context of the setting it controls
    isValueValidHere: boolean;
    // The dashboard value as a string (see `DashboardSettings/utils/valueToString`)
    valueRepresentation: string;
    // The setting's regular component, shown when the setting is not dashboard controlled
    children: React.ReactNode;
};

/**
 * Shows the dashboard value as text (or a message when it is not valid here) while a setting is controlled
 * by a dashboard setting - and the setting's regular component otherwise.
 */
export function DashboardControlledSetting(props: DashboardControlledSettingProps): React.ReactNode {
    if (!props.isControlled) {
        return props.children;
    }

    if (!props.isValueValidHere) {
        return <i className="text-warning-subtle text-body-sm">Dashboard value not valid here</i>;
    }

    return <span className="text-body-sm">{props.valueRepresentation}</span>;
}
