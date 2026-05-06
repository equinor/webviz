import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ColorTileProps = {
    color: string;
    interactive?: boolean;
    grouped?: boolean;
    size?: "small" | "default" | "large";
};

const SIZE_TO_CLASSNAMES: Record<NonNullable<ColorTileProps["size"]>, string> = {
    small: "h-4",
    default: "h-5",
    large: "h-6",
};

export const ColorTile: React.FC<ColorTileProps> = (props) => {
    return (
        <div
            className={resolveClassNames(
                "border-neutral-subtle box-border aspect-square grow border",
                SIZE_TO_CLASSNAMES[props.size || "default"],
                {
                    "rounded-sm": !props.grouped,
                    "cursor-pointer hover:border hover:outline hover:brightness-110": props.interactive,
                },
            )}
            style={{ backgroundColor: props.color }}
        />
    );
};
