import React from "react";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import type { LayoutClassProps } from "@lib/components/_shared/utils/wrapperProps";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Tile } from "./tile";

export type GroupProps = LayoutClassProps & {
    /** The color palette whose colors are rendered as individual tiles. */
    colorPalette: ColorPalette;
    /** Controls the height of each tile. @default "default" */
    size?: "small" | "default" | "large";
    /** When true, adds a gap between tiles instead of rendering them as a fused strip. @default false */
    gap?: boolean;
};

export const Group = React.forwardRef<HTMLDivElement, GroupProps>(function Group(props, ref) {
    const size = useComponentSize(props);
    return (
        <div
            ref={ref}
            style={props.layoutStyle}
            className={resolveClassNames(props.layoutClassName, "flex", {
                "gap-x-xs": props.gap,
                "border-neutral rounded": !props.gap,
            })}
        >
            {props.colorPalette.getColors().map((color) => (
                <Tile key={color} color={color} grouped size={size} />
            ))}
        </div>
    );
});
