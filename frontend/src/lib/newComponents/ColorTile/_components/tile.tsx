import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TileProps = {
    color: string;
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
            className={resolveClassNames(
                "box-border aspect-square rounded",
                SIZE_TO_CLASSNAMES[props.size || "default"],
                {
                    "border-neutral-subtle border": !props.grouped,
                    "not-first-of-type:rounded-l-none not-last-of-type:rounded-r-none": props.grouped,
                },
            )}
            style={{ backgroundColor: props.color }}
        />
    );
};
