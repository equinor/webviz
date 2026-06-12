import type React from "react";

import type { SvgIconProps } from "@mui/material/SvgIcon";

import { ColorTile } from "@lib/newComponents/ColorTile";
import type { ColorTileProps } from "@lib/newComponents/ColorTile";

export type ColorTileWithBadgeProps = ColorTileProps & {
    showBadge: boolean;
    badgeClassName?: string;
    badgeIcon: React.ComponentType<SvgIconProps>;
};

export function ColorTileWithBadge(props: ColorTileWithBadgeProps): React.ReactNode {
    return (
        <div className="mr-xs relative inline-flex items-center bg-inherit">
            {/* The colored tile */}
            <ColorTile.Tile {...props} />

            {/* The badge icon, positioned top-right */}
            {props.showBadge && (
                <props.badgeIcon
                    className={`${props.badgeClassName ?? "bg-surface"} text-neutral-strong absolute -top-1 -right-1.5 rounded-full p-px`}
                    fontSize="inherit"
                />
            )}
        </div>
    );
}
