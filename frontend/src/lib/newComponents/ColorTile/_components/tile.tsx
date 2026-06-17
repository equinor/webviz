import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TileProps = {
    /** The CSS color value applied as the tile's background. */
    color: string;
    /** When true, the tile stretches to fill its container and removes its border, for use inside a group. @default false */
    grouped?: boolean;
    /** Controls the height of the tile. @default "default" */
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
            className={resolveClassNames("box-border rounded", SIZE_TO_CLASSNAMES[props.size || "default"], {
                "border-neutral-subtle aspect-square border": !props.grouped,
                "grow not-first-of-type:rounded-l-none not-last-of-type:rounded-r-none": props.grouped,
            })}
            style={{ backgroundColor: props.color }}
        />
    );
};
