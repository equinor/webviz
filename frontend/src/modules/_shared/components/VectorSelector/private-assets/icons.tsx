import React from "react";

import { createSvgIcon } from "@mui/material";
import type { SvgIconProps } from "@mui/material";

type VectorIconProps = SvgIconProps & {
    size?: number;
};

function makeIcon(svgContent: React.ReactNode, displayName: string) {
    const Base = createSvgIcon(svgContent, displayName);
    const Icon = React.forwardRef<SVGSVGElement, VectorIconProps>(({ size, style, ...props }, ref) => (
        <Base ref={ref} fontSize="inherit" style={size !== undefined ? { fontSize: size, ...style } : style} {...props} />
    ));
    Icon.displayName = displayName;
    return Icon;
}

export const AquiferIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.4,1.6L6,3.3c0.9,0.9,0.9,2.4,0,3.3s-2.4,0.9-3.3,0s-0.9-2.4,0-3.3c0,0,0,0,0,0L4.4,1.6z" />
        <path d="M12,1.6l1.6,1.6c0.9,0.9,0.9,2.4,0,3.3s-2.4,0.9-3.3,0c-0.9-0.9-0.9-2.4,0-3.3c0,0,0,0,0,0L12,1.6z" />
        <path d="M19.3,1.6L21,3.3c0.9,0.9,0.9,2.4,0,3.3s-2.4,0.9-3.3,0c-0.9-0.9-0.9-2.4,0-3.3c0,0,0,0,0,0L19.3,1.6z" />
        <line x1="1.5" y1="9.5" x2="22.2" y2="9.5" />
        <line x1="1.5" y1="15.1" x2="22.2" y2="15.1" />
        <circle fill="currentColor" stroke="none" cx={4.4} cy={11.4} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={11.9} cy={11.4} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={19.4} cy={11.4} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={4.4} cy={13.5} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={11.9} cy={13.5} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={19.4} cy={13.5} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={8.1} cy={11.3} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={8.1} cy={13.4} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={15.6} cy={11.3} r={0.5} />
        <circle fill="currentColor" stroke="none" cx={15.6} cy={13.4} r={0.5} />
        <path d="M4.4,17.3L6,18.9c0.9,0.9,0.9,2.4,0,3.3s-2.4,0.9-3.3,0s-0.9-2.4,0-3.3c0,0,0,0,0,0L4.4,17.3z" />
        <path d="M12,17.3l1.6,1.6c0.9,0.9,0.9,2.4,0,3.3s-2.4,0.9-3.3,0c-0.9-0.9-0.9-2.4,0-3.3c0,0,0,0,0,0L12,17.3z" />
        <path d="M19.3,17.3l1.6,1.6c0.9,0.9,0.9,2.4,0,3.3s-2.4,0.9-3.3,0c-0.9-0.9-0.9-2.4,0-3.3c0,0,0,0,0,0L19.3,17.3z" />
    </svg>,
    "AquiferIcon",
);

export const BlockIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>,
    "BlockIcon",
);

export const CalculatedIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="12" y1="16" x2="12" y2="16" />
        <line x1="12" y1="8" x2="12" y2="8" />
    </svg>,
    "CalculatedIcon",
);

export const FieldIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" strokeWidth={2} d="M21,16V8c0-0.7-0.4-1.4-1-1.7l-7-4c-0.6-0.4-1.4-0.4-2,0l-7,4C3.4,6.6,3,7.3,3,8v8c0,0.7,0.4,1.4,1,1.7l7,4c0.6,0.4,1.4,0.4,2,0l7-4C20.6,17.4,21,16.7,21,16z" />
        <polyline stroke="currentColor" strokeWidth={2} points="3.3,7 12,12 20.7,7 " />
        <line stroke="currentColor" strokeWidth={2} x1="12" y1="22.1" x2="12" y2="12" />
        <polyline stroke="currentColor" points="3.3,12 12,17 20.7,12 " />
        <line stroke="currentColor" x1="7.7" y1="9.5" x2="16.4" y2="4.4" />
        <line stroke="currentColor" x1="7.7" y1="19.6" x2="7.7" y2="9.5" />
        <line stroke="currentColor" x1="16.4" y1="19.9" x2="16.4" y2="9.8" />
        <line stroke="currentColor" x1="7.6" y1="4.4" x2="16.4" y2="9.5" />
    </svg>,
    "FieldIcon",
);

export const GroupIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>,
    "GroupIcon",
);

export const MiscIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
    </svg>,
    "MiscIcon",
);

export const NetworkIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>,
    "NetworkIcon",
);

export const OthersIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
    </svg>,
    "OthersIcon",
);

export const RegionIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.8,16.7c0.9,0.5,1.4,1.2,1.4,1.9c0,1.8-3.7,3.3-8.2,3.3s-8.2-1.5-8.2-3.3c0-0.8,0.6-1.5,1.7-2" />
        <path d="M17.9,9c0,4.6-5.9,8.5-5.9,8.5S6.1,13.5,6.1,9c0-3.2,2.6-5.9,5.9-5.9S17.9,5.7,17.9,9z" />
        <circle cx="12" cy="9" r="2" />
    </svg>,
    "RegionIcon",
);

export const RegionRegionIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" strokeWidth={2} d="M14.6,17.8c0.7,0.4,1,0.9,1,1.4c0,1.3-2.7,2.4-6,2.4s-6-1.1-6-2.4c0-0.6,0.4-1.1,1.2-1.5" />
        <path stroke="currentColor" strokeWidth={2} d="M15.5,8.7c0,4.6-5.9,8.5-5.9,8.5s-5.9-4-5.9-8.5c0-3.2,2.6-5.9,5.9-5.9S15.5,5.4,15.5,8.7z" />
        <circle stroke="currentColor" strokeWidth={2} cx="9.6" cy="9" r="2" />
        <path stroke="currentColor" d="M16.3,3.3c0.3-0.1,0.7-0.1,1-0.1c2.9,0,5.1,2.3,5.1,5.1c0,4-5.1,7.4-5.1,7.4s-0.5-0.3-1.1-0.8" />
        <path stroke="currentColor" d="M17.4,7c0.8,0,1.5,0.7,1.5,1.5s-0.7,1.5-1.5,1.5" />
        <path stroke="currentColor" d="M21.1,15.8c0.5,0.3,0.8,0.7,0.8,1c0,1-2,1.8-4.5,1.8" />
    </svg>,
    "RegionRegionIcon",
);

export const SegmentIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" stroke="none" d="M12,2.4c-5.3,0-9.6,4.3-9.6,9.6s4.3,9.6,9.6,9.6s9.6-4.3,9.6-9.6c0,0-9.6,0-9.6,0V2.4z" />
        <g opacity={0.97} fill="none" stroke="currentColor" strokeWidth={0.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.3,0.6c0.3,0,0.7,0,1,0.1" />
            <path strokeDasharray="1.7582,1.7582" d="M17,1c3.1,1,5.5,3.6,6.2,6.8" />
            <path d="M23.4,8.7c0,0.3,0.1,0.7,0.1,1" />
            <line x1="14.3" y1="0.6" x2="14.3" y2="1.6" />
            <line strokeDasharray="2.3703,2.3703" x1="14.3" y1="3.9" x2="14.3" y2="7.5" />
            <line x1="14.3" y1="8.7" x2="14.3" y2="9.7" />
            <line x1="14.3" y1="9.7" x2="15.3" y2="9.7" />
            <line strokeDasharray="2.3703,2.3703" x1="17.7" y1="9.7" x2="21.2" y2="9.7" />
            <line x1="22.4" y1="9.7" x2="23.4" y2="9.7" />
        </g>
    </svg>,
    "SegmentIcon",
);

export const WellIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <g fill="none" stroke="currentColor">
            <line x1="6.1" y1="20.7" x2="12" y2="8.9" />
            <line x1="12" y1="8.9" x2="17.8" y2="20.8" />
            <line x1="12" y1="8.9" x2="12" y2="22.6" />
            <line x1="7.7" y1="17.6" x2="16.2" y2="17.6" />
            <line x1="9.6" y1="13.7" x2="14.4" y2="13.7" />
            <line strokeWidth={2} x1="7.1" y1="6.2" x2="22.1" y2="14" />
            <line strokeWidth={0.25} x1="22" y1="14" x2="22" y2="19.4" />
        </g>
        <path fill="currentColor" stroke="none" d="M6.6,11.5l-2.9,2.1c-0.5,0.3-1.1,0-1-0.6L3,9.4l4.3-7.6c0,0,1.7-0.5,2.5,0c0.7,0.4,1.1,2.1,1.1,2.1L6.6,11.5z" />
        <rect fill="currentColor" stroke="none" x="20.7" y="17.6" width="2.6" height="3.5" />
    </svg>,
    "WellIcon",
);

export const WellCompletionIcon = makeIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <g fill="none" stroke="currentColor">
            <line x1="6.1" y1="20.7" x2="10" y2="8.9" />
            <line x1="13.9" y1="8.9" x2="17.8" y2="20.8" />
            <line x1="12" y1="5.8" x2="12" y2="22.6" />
            <line strokeWidth={0.75} x1="6.8" y1="18.5" x2="17.6" y2="20.2" />
            <line strokeWidth={0.75} x1="9.4" y1="10.7" x2="15" y2="12.3" />
            <line strokeWidth={0.75} x1="8.2" y1="14.5" x2="15" y2="12.3" />
            <line strokeWidth={0.75} x1="6.8" y1="18.5" x2="16.3" y2="16.1" />
        </g>
        <path fill="currentColor" stroke="none" d="M12.5,10.2h-1c-0.9,0-2.8-1.7-2.9-1.7V7.3c0-0.3,0.2-0.5,0.5-0.5H15c0.3,0,0.5,0.2,0.5,0.5v1.2C15.5,8.5,13.4,10.2,12.5,10.2z" />
        <path fill="currentColor" stroke="none" d="M16.5,16.1H7.4c-0.4,0-0.7-0.3-0.7-0.7v-0.2c0-0.4,0.3-0.7,0.7-0.7h9.1c0.4,0,0.7,0.3,0.7,0.7v0.2C17.2,15.8,16.9,16.1,16.5,16.1z" />
        <path fill="currentColor" stroke="none" d="M14.3,4.1c0,0.7-0.5,0.2-1,0.4c-0.6,0.3-0.7,0.6-1,0.5c-0.2,0,0.4-1.2,0.9-1.3C13.8,3.5,14.3,3.8,14.3,4.1z" />
        <path fill="currentColor" stroke="none" d="M16.4,1.5c-0.1,0.9-0.9,0.3-1.8,0.5c-1.2,0.3-1.3,0.8-1.8,0.7c-0.4-0.1,0.9-1.6,1.8-1.8C15.6,0.6,16.4,1.1,16.4,1.5z" />
        <path fill="currentColor" stroke="none" d="M9.9,3.4c0,0.7,0.5,0.2,1,0.4c0.6,0.3,0.7,0.6,1,0.5c0.2,0-0.4-1.2-0.9-1.3C10.3,2.9,9.8,3.2,9.9,3.4z" />
        <path fill="currentColor" stroke="none" d="M8.5,1.3c0,0.9,0.8,0.3,1.5,0.6c1,0.3,1.1,0.8,1.5,0.7c0.3-0.1-0.6-1.5-1.4-1.8C9.2,0.6,8.5,1,8.5,1.3z" />
    </svg>,
    "WellCompletionIcon",
);
