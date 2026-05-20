import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TileProps = {
    color: string;
    interactive?: boolean;
    grouped?: boolean;
    size?: "small" | "default" | "large";
};

const SIZE_TO_CLASSNAMES: Record<NonNullable<TileProps["size"]>, string> = {
    small: "h-4",
    default: "h-5",
    large: "h-6",
};

export const Tile: React.FC<TileProps> = (props) => {
    return (
        <div
            className={resolveClassNames("box-border aspect-square", SIZE_TO_CLASSNAMES[props.size || "default"], {
                "border-neutral-subtle rounded-sm border": !props.grouped,
                "cursor-pointer hover:border hover:outline hover:brightness-110": props.interactive,
            })}
            style={{ backgroundColor: props.color }}
        />
    );
};
