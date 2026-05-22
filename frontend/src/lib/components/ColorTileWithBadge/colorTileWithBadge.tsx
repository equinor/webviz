import type React from "react";

import type { SvgIconProps } from "@mui/material/SvgIcon";

import { ColorTile } from "@lib/newComponents/ColorTile";
import type { ColorTileProps } from "@lib/newComponents/ColorTile";

export type ColorTileWithBadgeProps = ColorTileProps & {
    showBadge: boolean;
    badgeClassName?: string;
    badgeIcon: React.ComponentType<SvgIconProps>;
};

export const ColorTileWithBadge: React.FC<ColorTileWithBadgeProps> = (props) => {
    return (
        <div className="relative mr-4 inline-flex items-center bg-inherit">
            {/* The colored tile */}
            <ColorTile.Tile {...props} />

            {/* The badge icon, positioned top-right */}
            {props.showBadge && (
                <props.badgeIcon
                    className={`${props.badgeClassName ?? "bg-white"} text-neutral-strong absolute -top-1 -right-1.5 rounded-full p-px`}
                    fontSize="inherit"
                    style={{
                        fontSize: "1rem",
                        stroke: "var(--eds-color-bg-neutral-canvas)",
                        strokeWidth: "3px",
                        paintOrder: "stroke fill",
                    }}
                />
            )}
        </div>
    );
};
