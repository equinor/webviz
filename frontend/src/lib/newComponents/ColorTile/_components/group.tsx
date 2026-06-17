import type React from "react";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import type { LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Tile } from "./tile";

export type GroupProps = LayoutClassProps & {
    /** The color palette whose colors are rendered as individual tiles. */
    colorPalette: ColorPalette;
    /** Controls the height of each tile. @default "default" */
    size?: "small" | "default" | "large";
    /** When true, adds a gap between tiles instead of rendering them as a fused strip. */
    gap?: boolean;
};

export const Group: React.FC<GroupProps> = (props) => {
    const { layoutClassName, gap, colorPalette } = props;
    const size = useComponentSize(props);
    return (
        <div
            className={resolveClassNames(layoutClassName, "flex", {
                "gap-x-xs": gap,
                "border-neutral rounded": !gap,
            })}
        >
            {colorPalette.getColors().map((color) => (
                <Tile key={color} color={color} grouped size={size} />
            ))}
        </div>
    );
};
