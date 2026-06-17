import { Circle } from "@mui/icons-material";

import type { PixelSize } from "@lib/newComponents/_shared/utils/size";

import { Tooltip } from "../Tooltip";

export type HasChangesIndicatorProps = {
    /** When false, the indicator is hidden. @default true */
    visible?: boolean;
    /** Size of the indicator icon in pixels. */
    size?: PixelSize;
    /** Tooltip text shown on hover. @default "You have unsaved changes" */
    tooltip?: string;
};

export function HasChangesIndicator(props: HasChangesIndicatorProps): React.ReactNode {
    return (
        props.visible !== false && (
            <Tooltip content={props.tooltip ?? "You have unsaved changes"}>
                <Circle style={props.size !== undefined ? { fontSize: props.size } : undefined} color="warning" />
            </Tooltip>
        )
    );
}
