import React from "react";

import type { SvgIconProps } from "@mui/material/SvgIcon";

import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import { ColorTile } from "@lib/components/ColorTile";
import type { ColorTileProps } from "@lib/components/ColorTile";

export type ColorTileWithBadgeProps = ColorTileProps & {
    /** When true, renders the badge icon over the top-right corner of the tile. */
    showBadge: boolean;
    /** Additional class names applied to the badge icon element, typically used to set its background color. @default "bg-surface" */
    badgeClassName?: string;
    /** The MUI icon component rendered as the badge. */
    badgeIcon: React.ComponentType<SvgIconProps>;
};

const DEFAULT_PROPS = {
    badgeClassName: "bg-surface",
} satisfies Partial<ColorTileWithBadgeProps>;

export const ColorTileWithBadge = React.forwardRef<HTMLDivElement, ColorTileWithBadgeProps>(
    function ColorTileWithBadge(props, ref) {
        const defaultedProps = withDefaults(props, DEFAULT_PROPS);
        return (
            <div ref={ref} className="mr-xs relative inline-flex items-center bg-inherit">
                <ColorTile.Tile {...defaultedProps} />
                {defaultedProps.showBadge && (
                    <defaultedProps.badgeIcon
                        className={`${defaultedProps.badgeClassName} text-neutral-strong absolute -top-1 -right-1.5 rounded-full p-px`}
                        fontSize="inherit"
                    />
                )}
            </div>
        );
    },
);
