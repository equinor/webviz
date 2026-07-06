import type React from "react";

import { Circle } from "@mui/icons-material";

import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import type { PixelSize } from "@lib/components/_shared/utils/size";

import { Tooltip } from "../Tooltip";

export type HasChangesIndicatorProps = {
    /** When false, the indicator is hidden. @default true */
    visible?: boolean;
    /** Size of the indicator icon in pixels. */
    size?: PixelSize;
    /** Tooltip text shown on hover. @default "You have unsaved changes" */
    tooltip?: string;
};

const DEFAULT_PROPS = {
    visible: true,
    tooltip: "You have unsaved changes",
} satisfies Partial<HasChangesIndicatorProps>;

export function HasChangesIndicator(props: HasChangesIndicatorProps): React.ReactNode {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);

    if (!defaultedProps.visible) return null;

    return (
        <Tooltip content={defaultedProps.tooltip}>
            <Circle
                style={defaultedProps.size !== undefined ? { fontSize: defaultedProps.size } : undefined}
                color="warning"
            />
        </Tooltip>
    );
}
