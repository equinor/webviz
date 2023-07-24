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
            className={resolveClassNames(
                "w-5 h-5 cursor-pointer hover:brightness-110 box-border hover:outline hover:outline-1 hover:border-white",
                !props.grouped ? "rounded" : ""
            )}
            style={{ backgroundColor: props.color }}
        ></div>
    );
};
