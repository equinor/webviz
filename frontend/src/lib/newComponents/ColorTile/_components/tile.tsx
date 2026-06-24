import React from "react";

import { withDefaults } from "@lib/newComponents/_shared/utils/defaultProps";
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

const DEFAULT_PROPS = {
    grouped: false,
    size: "default",
} satisfies Partial<TileProps>;

export const Tile = React.forwardRef<HTMLDivElement, TileProps>(function Tile(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    return (
        <div
            ref={ref}
            className={resolveClassNames("box-border rounded", SIZE_TO_CLASSNAMES[defaultedProps.size], {
                "border-neutral-subtle aspect-square border": !defaultedProps.grouped,
                "grow not-first-of-type:rounded-l-none not-last-of-type:rounded-r-none": defaultedProps.grouped,
            })}
            style={{ backgroundColor: defaultedProps.color }}
        />
    );
});
