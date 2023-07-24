import React from "react";

import { resolveClassNames } from "../_utils/resolveClassNames";

export type ColorTileProps = {
    color: string;
    interactive?: boolean;
    onChange?: (color: string) => void;
    grouped?: boolean;
};

export const ColorTile: React.FC<ColorTileProps> = (props) => {
    return (
        <div
            className={resolveClassNames("w-5 h-5 box-border", {
                rounded: !props.grouped,
                "hover:outline hover:outline-1 hover:border-white hover:brightness-110 cursor-pointer":
                    props.interactive,
            })}
            style={{ backgroundColor: props.color }}
        ></div>
    );
};
