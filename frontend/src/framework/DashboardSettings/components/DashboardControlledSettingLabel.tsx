import type { DashboardSettingDefinition } from "../DashboardSettingDefinition";

import { DashboardSettingIndicator } from "./DashboardSettingIndicator";

export type DashboardControlledSettingLabelProps = {
    // The label of the setting
    label: string;
    // The dashboard setting controlling the value when it is dashboard-controlled
    controlledBy: DashboardSettingDefinition<any, any>;
    // Whether the setting is controlled by a dashboard setting
    isControlled: boolean;
    // Whether the value is valid in the context of the setting.
    isValueValidHere: boolean;
};

/**
 * Label for a setting field: the plain label, with the dashboard setting indicator added while
 * the setting is controlled by a dashboard setting.
 */
export function DashboardControlledSettingLabel(props: DashboardControlledSettingLabelProps): React.ReactNode {
    if (!props.isControlled) {
        return props.label;
    }

    return (
        <span className="gap-x-2xs flex items-center">
            {props.label}
            <DashboardSettingIndicator
                dashboardSettingLabel={props.controlledBy.label}
                isValueValidHere={props.isValueValidHere}
            />
        </span>
    );
}
