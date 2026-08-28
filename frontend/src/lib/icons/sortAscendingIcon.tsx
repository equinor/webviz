import React from "react";

import { createSvgIcon } from "@mui/material";
import type { SvgIconProps } from "@mui/material";

type SortAscendingIconProps = SvgIconProps & {
    size?: number;
};

const SortAscendingIconBase = createSvgIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
        <g transform="rotate(180 12 12)">
            <path fill="currentColor" stroke="none" d="M9 3 5 6.99h3V14h2V6.99h3L9 3z" />
            <path fill="currentColor" stroke="none" d="M17 17V10h-4v7h-3l5 5 5-5h-3z" />
        </g>
    </svg>,
    "SortAscending",
);

export const SortAscendingIcon = React.forwardRef<SVGSVGElement, SortAscendingIconProps>(
    ({ size, style, ...props }, ref) => (
        <SortAscendingIconBase
            ref={ref}
            fontSize="inherit"
            style={size !== undefined ? { fontSize: size, ...style } : style}
            {...props}
        />
    ),
);
SortAscendingIcon.displayName = "SortAscendingIcon";
