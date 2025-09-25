import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ColorTileProps = {
    color: string;
    interactive?: boolean;
    grouped?: boolean;
};

export const ColorTile: React.FC<ColorTileProps> = (props) => {
    return (
        <div
            className={resolveClassNames("h-5 grow box-border border border-gray/50", {
                "rounded-sm w-5": !props.grouped,
                "hover:outline  hover:border-white hover:brightness-110 cursor-pointer": props.interactive,
            })}
            style={{ backgroundColor: props.color }}
        ></div>
    );
};
