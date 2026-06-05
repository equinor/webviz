import type React from "react";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import type { LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Tile } from "./tile";

export type GroupProps = LayoutClassProps & {
    colorPalette: ColorPalette;
    size?: "small" | "default" | "large";
    gap?: boolean;
};

export const Group: React.FC<GroupProps> = (props) => {
    const { layoutClassName, gap, colorPalette } = props;
    const size = useComponentSize(props);
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
