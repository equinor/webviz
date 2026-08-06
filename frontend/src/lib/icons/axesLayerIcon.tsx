import React from "react";

import { createSvgIcon } from "@mui/material";
import type { SvgIconProps } from "@mui/material";

type AxesLayerIconProps = SvgIconProps & {
    size?: number;
};

const AxesLayerIconBase = createSvgIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
        <line x1="8" y1="15" x2="16" y2="15" />
        <polygon points="16,12 21,15 16,18" fill="currentColor" stroke="none" />
        <line x1="8" y1="15" x2="8" y2="8" />
        <polygon points="5,8 8,3 11,8" fill="currentColor" stroke="none" />
        <line x1="8" y1="15" x2="5.5" y2="17.5" />
        <polygon points="7.7,19.6 2,21 3.4,15.3" fill="currentColor" stroke="none" />
    </svg>,
    "AxesLayer"
);

export const AxesLayerIcon = React.forwardRef<SVGSVGElement, AxesLayerIconProps>(({ size, style, ...props }, ref) => (
    <AxesLayerIconBase ref={ref} fontSize="inherit" style={size !== undefined ? { fontSize: size, ...style } : style} {...props} />
));
AxesLayerIcon.displayName = "AxesLayerIcon";
