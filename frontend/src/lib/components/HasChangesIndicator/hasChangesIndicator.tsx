import { Circle } from "@lib/mui-icons";

import { Tooltip } from "../Tooltip";
import { PixelSize } from "@lib/newComponents/_shared/size";

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
                <Circle size={props.iconSize} fontSize={props.size} color="warning" />
            </Tooltip>
        )
    );
}
