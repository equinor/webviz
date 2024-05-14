import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ColorTileProps = {
    color: string;
    interactive?: boolean;
    grouped?: boolean;
};

export const ColorTile: React.FC<ColorTileProps> = (props) => {
    return (
        <div
            className={resolveClassNames("h-5 flex-grow box-border border border-white border-opacity-50", {
                "rounded w-5": !props.grouped,
                "hover:outline hover:outline-1 hover:border-white hover:brightness-110 cursor-pointer":
                    props.interactive,
            })}
            style={{ backgroundColor: props.color }}
        ></div>
    );
};
