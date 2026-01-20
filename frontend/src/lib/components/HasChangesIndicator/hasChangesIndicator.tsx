import { Circle } from "@mui/icons-material";

import { Tooltip } from "../Tooltip";

export type HasChangesIndicatorProps = {
    visible?: boolean;
    size?: "small" | "medium" | "large" | "inherit";
    tooltipText?: string;
};

export function HasChangesIndicator(props: HasChangesIndicatorProps): React.ReactNode {
    return (
        props.visible !== false && (
            <Tooltip title={props.tooltipText ?? "You have unsaved changes"}>
                <Circle fontSize={props.size ?? "small"} color="warning" />
            </Tooltip>
        )
    );
}
