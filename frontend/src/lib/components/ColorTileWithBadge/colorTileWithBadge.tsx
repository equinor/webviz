import type React from "react";

import type { SvgIconProps } from "@mui/material/SvgIcon";

import { ColorTile } from "@lib/components/ColorTile";
import type { ColorTileProps } from "@lib/components/ColorTile/colorTile";

export type ColorTileWithBadgeProps = ColorTileProps & {
    showBadge: boolean;
    badgeClassName?: string;
    badgeIcon: React.ComponentType<SvgIconProps>;
};

export const ColorTileWithBadge: React.FC<ColorTileWithBadgeProps> = (props) => {
    return (
        <div className="relative bg-inherit inline-flex items-center mr-4">
            {/* The colored tile */}
            <ColorTile {...props} />

            {/* The badge icon, positioned top-right */}
            {props.showBadge && (
                <props.badgeIcon
                    className={`${props.badgeClassName ?? "bg-white"} text-black absolute -top-1 -right-1.5 rounded-full p-px`}
                    fontSize="inherit"
                    style={{
                        fontSize: "1rem",
                    }}
                />
            )}
        </div>
    );
};
