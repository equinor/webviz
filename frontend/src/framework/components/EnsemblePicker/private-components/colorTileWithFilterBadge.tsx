import type React from "react";

import { FilterAlt } from "@mui/icons-material";

import { ColorTile } from "@lib/components/ColorTile";
import type { ColorTileProps } from "@lib/components/ColorTile/colorTile";

export type ColorTileWithFilterBadgeProps = ColorTileProps & {
    showBadge: boolean;
    badgeClassName?: string;
};

export const ColorTileWithFilterBadge: React.FC<ColorTileWithFilterBadgeProps> = (props) => {
    return (
        <div className="relative bg-inherit inline-flex items-center mr-4">
            {/* The colored tile */}
            <ColorTile {...props} />

            {/* The filter icon, positioned top-right, with inherited background color via css variable */}
            {props.showBadge && (
                <FilterAlt
                    className={`${props.badgeClassName ?? "bg-white"} absolute -top-1 -right-1.5 rounded-full p-[0.5px]`}
                    fontSize="inherit"
                    style={{
                        fontSize: "1rem",
                    }}
                />
            )}
        </div>
    );
};
