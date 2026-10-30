import { HubOutlined, Tune } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DashboardSettingIndicatorProps = {
    dashboardSettingLabel: string;
    // Whether the dashboard value is available in the context of the setting it controls. @default true
    isValueValidHere?: boolean;
};

/**
 * Shown after the label of a module's own setting (DPF or regular) while it is controlled by a dashboard
 * setting, so a controlled value is marked the same way everywhere.
 */
export function DashboardSettingIndicator(props: DashboardSettingIndicatorProps): React.ReactNode {
    const isValueValidHere = props.isValueValidHere ?? true;

    const tooltip = isValueValidHere
        ? `Controlled by the dashboard setting "${props.dashboardSettingLabel}"`
        : `Controlled by the dashboard setting "${props.dashboardSettingLabel}", whose value is not available here`;

    return (
        <Tooltip content={tooltip} side="right">
            {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
            <span
                aria-label={tooltip}
                className={resolveClassNames("inline-flex items-center", {
                    "text-accent-subtle": isValueValidHere,
                    "text-warning-subtle": !isValueValidHere,
                })}
            >
                <Tune fontSize="inherit" />
            </span>
        </Tooltip>
    );
}
