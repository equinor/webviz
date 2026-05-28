import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ColorTileProps = {
    color: string;
    grouped?: boolean;
};

export const ColorTile: React.FC<ColorTileProps> = (props) => {
    return (
        <div
            className={resolveClassNames("border-gray/50 box-border h-5 grow border", {
                "w-5 rounded": !props.grouped,
            })}
            style={{ backgroundColor: props.color }}
        />
    );
};
