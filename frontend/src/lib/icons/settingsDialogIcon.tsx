import React from "react";
import { createSvgIcon } from "@mui/material";
import type { SvgIconProps } from "@mui/material";

type SettingsDialogIconProps = SvgIconProps & {
    size?: number;
};

const SettingsDialogIconBase = createSvgIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="18" rx="2" />
        <path fill="currentColor" stroke="none" d="M2,5 L2,4 A2,2 0 0 1 4,2 L20,2 A2,2 0 0 1 22,4 L22,5 Z" />
        <path
            fill="currentColor"
            stroke="none"
            fillRule="evenodd"
            d="M14.86,10.85 L16.35,11.34 L16.35,13.67 L14.86,14.15 L15.18,15.68 L13.17,16.85 L12,15.8 L10.84,16.85 L8.82,15.68 L9.14,14.15 L7.65,13.67 L7.65,11.34 L9.14,10.85 L8.82,9.32 L10.84,8.15 L12,9.2 L13.17,8.15 L15.18,9.32 Z M13.6,12.5 A1.6,1.6 0 0 0 10.4,12.5 A1.6,1.6 0 0 0 13.6,12.5 Z"
        />
    </svg>,
    "SettingsDialog"
);

export const SettingsDialogIcon = React.forwardRef<SVGSVGElement, SettingsDialogIconProps>(({ size, style, ...props }, ref) => (
    <SettingsDialogIconBase ref={ref} fontSize="inherit" style={size !== undefined ? { fontSize: size, ...style } : style} {...props} />
));
SettingsDialogIcon.displayName = "SettingsDialogIcon";
