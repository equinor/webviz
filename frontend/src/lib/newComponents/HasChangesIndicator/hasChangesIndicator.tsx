import { Circle } from "@mui/icons-material";

import type { PixelSize } from "@lib/newComponents/_shared/utils/size";

import { Tooltip } from "../Tooltip";

export type HasChangesIndicatorProps = {
    visible?: boolean;
    size?: PixelSize;
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
