import React from "react";

import {
    CartesianGrid,
    Legend,
    Tooltip,
    XAxis,
    YAxis,
    ResponsiveContainer,
    type TooltipProps,
    type LegendProps,
} from "recharts";

import { useElementSize } from "@lib/hooks/useElementSize";

export { ResponsiveContainer, CartesianGrid, Legend, Tooltip, XAxis, YAxis };
export type { TooltipProps, LegendProps };

export type RechartsPlotProps = {
    /**
     * Children should be recharts chart components (LineChart, BarChart, ComposedChart, etc.)
     */
    children: React.ReactNode;
    className?: string;
};

/**
 * Thin wrapper around recharts ResponsiveContainer that integrates with the webviz
 * module layout. Provides sensible defaults for sizing and a consistent outer div
 * that can be measured by useElementSize.
 *
 * Usage:
 * ```tsx
 * <RechartsPlot>
 *   <LineChart data={data}>
 *     <XAxis dataKey="date" />
 *     <YAxis />
 *     <Line dataKey="value" />
 *   </LineChart>
 * </RechartsPlot>
 * ```
 */
export function RechartsPlot({ children, className }: RechartsPlotProps): React.ReactNode {
    return (
        <div className={`w-full h-full ${className ?? ""}`}>
            <ResponsiveContainer width="100%" height="100%">
                {children as React.ReactElement}
            </ResponsiveContainer>
        </div>
    );
}

/**
 * Hook variant: returns a ref and explicit width/height for cases where
 * ResponsiveContainer is not sufficient (e.g. linked brushes across charts
 * that need identical pixel widths).
 */
export function useRechartsSize() {
    const ref = React.useRef<HTMLDivElement>(null);
    const size = useElementSize(ref);
    return { ref, width: size.width, height: size.height };
}
