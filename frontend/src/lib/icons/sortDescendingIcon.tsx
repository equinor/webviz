import React from "react";

import { createSvgIcon } from "@mui/material";
import type { SvgIconProps } from "@mui/material";

type SortDescendingIconProps = SvgIconProps & {
    size?: number;
};

const SortDescendingIconBase = createSvgIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
        <path fill="currentColor" stroke="none" d="M9 3 5 6.99h3V14h2V6.99h3L9 3z" />
        <path fill="currentColor" stroke="none" d="M17 17V10h-4v7h-3l5 5 5-5h-3z" />
    </svg>,
    "SortDescending",
);

export const SortDescendingIcon = React.forwardRef<SVGSVGElement, SortDescendingIconProps>(
    ({ size, style, ...props }, ref) => (
        <SortDescendingIconBase
            ref={ref}
            fontSize="inherit"
            style={size !== undefined ? { fontSize: size, ...style } : style}
            {...props}
        />
    ),
);
SortDescendingIcon.displayName = "SortDescendingIcon";
