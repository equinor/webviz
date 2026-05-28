import type React from "react";

import type { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Tile } from "./tile";

export type GroupProps = {
    colorPalette: ColorPalette;
    size?: "small" | "default" | "large";
    gap?: boolean;
};

export const Group: React.FC<GroupProps> = (props) => {
    return (
        <div
            className={resolveClassNames("flex w-full", {
                "gap-horizontal-xs": props.gap,
                "border-neutral rounded": !props.gap,
            })}
        >
            {props.colorPalette.getColors().map((color) => (
                <Tile key={color} color={color} grouped size={props.size} />
            ))}
        </div>
    );
};
