import type React from "react";

import type { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Tile } from "./tile";
import { LayoutClassProps } from "@lib/newComponents/_shared/wrapperProps";

export type GroupProps = LayoutClassProps & {
    colorPalette: ColorPalette;
    size?: "small" | "default" | "large";
    gap?: boolean;
};

export const Group: React.FC<GroupProps> = (props) => {
    const { layoutClassName, size = "default", gap, colorPalette } = props;
    return (
        <div
            className={resolveClassNames(layoutClassName, "flex", {
                "gap-horizontal-xs": gap,
                "border-neutral rounded": !gap,
            })}
        >
            {colorPalette.getColors().map((color) => (
                <Tile key={color} color={color} grouped size={size} />
            ))}
        </div>
    );
};
