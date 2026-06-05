import { Circle } from "@mui/icons-material";
import type { PixelSize } from "@lib/newComponents/_shared/utils/size";

import { Tooltip } from "../Tooltip";

export type HasChangesIndicatorProps = {
    visible?: boolean;
    iconSize?: PixelSize;
    size?: "small" | "medium" | "large" | "inherit";
    tooltipText?: string;
};

export function HasChangesIndicator(props: HasChangesIndicatorProps): React.ReactNode {
    return (
        props.visible !== false && (
            <Tooltip title={props.tooltipText ?? "You have unsaved changes"}>
                <Circle style={props.iconSize !== undefined ? { fontSize: props.iconSize } : undefined} fontSize={props.size} color="warning" />
            </Tooltip>
        )
    );
}
