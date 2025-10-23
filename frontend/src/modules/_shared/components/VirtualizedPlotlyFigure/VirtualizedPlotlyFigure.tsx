import type React from "react";
import { useState, useEffect, useMemo, useRef } from "react";

import { Plot } from "../Plot";

export type PlotItem = {
    /**
     * Unique identifier for the plot item
     */
    id: string | number;
    /**
     * Plotly data traces (either provided directly or via lazy getter function)
     * Using getData allows for deferred calculation of expensive plot data until the plot is visible
     */
    data?: Plotly.Data[];
    /**
     * Lazy getter for plot data (alternative to data property)
     * This function will be called only when the plot becomes visible
     */
    getData?: () => Plotly.Data[];
    layout: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    /**
     * Label to display when plot is not visible (optional)
     * If not provided, the plot title or ID will be used
     */
    placeholderLabel?: string;
};

export type VirtualizedPlotlyFigureProps = {
    /**
     * Array of plot items to render in a virtualized grid
     */
    plotItems: PlotItem[];
    width: number;
    height: number;
    minPlotSize?: number;
    fixedPlotHeight?: number;
    plotMargin?: number;
    /**
     * Loading placeholder size
     */
    loadingPlaceholderSize?: number;
    /**
     * Custom render function for each plot item when visible
     * If provided, this will be used instead of the default Plot component
     */
    renderPlot?: (item: PlotItem, width: number, height: number) => React.ReactElement;
    /**
     * Custom render function for placeholder when plot is not visible
     */
    renderPlaceholder?: (item: PlotItem) => React.ReactElement;
    /**
     * Content to show when no plot items are available
     */
    emptyContent?: React.ReactNode;
};

/**
 * A virtualized grid component for rendering multiple Plotly figures.
 * Only renders plots that are visible in the viewport, improving performance for large numbers of plots.
 */

export function VirtualizedPlotlyFigure(props: VirtualizedPlotlyFigureProps): React.ReactElement {
    const {
        plotItems,
        width,
        height,
        minPlotSize = 300,
        fixedPlotHeight = 350,
        plotMargin = 10,
        loadingPlaceholderSize = 100,
        renderPlot,
        renderPlaceholder,
        emptyContent,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

    // Calculate grid dimensions
    const numPlots = plotItems.length;
    const maxColumns = Math.max(1, Math.floor(width / minPlotSize));
    const plotIds = useMemo(() => plotItems.map((item) => item.id).join(","), [plotItems]);
    // Handle edge case where numPlots < 1 to prevent NaN/Infinity values
    // Note: We can't early return with emptyContent here due to React hooks rules -
    // all hooks (useEffect, useMemo) must be called in the same order on every render.
    // So we need to ensure safe values for calculations and defer the emptyContent check until after hooks.
    const safeNumPlots = Math.max(1, numPlots);
    const numColumns = Math.min(Math.ceil(Math.sqrt(safeNumPlots)), maxColumns);
    const numRows = Math.ceil(safeNumPlots / numColumns);
    const plotWidth = Math.floor(width / numColumns) - plotMargin;
    const plotHeight = Math.max(fixedPlotHeight, height / numRows) - plotMargin;

    // Intersection Observer for virtualization
    useEffect(() => {
        if (!containerRef.current || numPlots < 1) return;

        const observer = new IntersectionObserver(
            (entries) => {
                setVisibleIndices((prevVisibleIndices) => {
                    const newVisibleIndices = new Set(prevVisibleIndices);

                    entries.forEach((entry) => {
                        const index = parseInt(entry.target.getAttribute("data-index") || "0");
                        if (entry.isIntersecting) {
                            newVisibleIndices.add(index);
                        } else {
                            newVisibleIndices.delete(index);
                        }
                    });

                    return newVisibleIndices;
                });
            },
            {
                root: containerRef.current,
                rootMargin: `${loadingPlaceholderSize}px`,
                threshold: 0,
            },
        );

        let frameId: number;
        const handle = requestAnimationFrame(() => {
            frameId = requestAnimationFrame(() => {
                if (containerRef.current) {
                    const plotContainers = containerRef.current.querySelectorAll("[data-index]");
                    plotContainers.forEach((container) => observer.observe(container));
                }
            });
        });

        return () => {
            observer.disconnect();
            cancelAnimationFrame(handle);
            if (frameId) {
                cancelAnimationFrame(frameId);
            }
        };
    }, [numPlots, loadingPlaceholderSize, width, height, minPlotSize, fixedPlotHeight, plotMargin, plotIds]);
    // Default plot renderer
    const defaultRenderPlot = (item: PlotItem, itemWidth: number, itemHeight: number): React.ReactElement => {
        const plotData = item.getData ? item.getData() : item.data || [];

        return (
            <Plot
                data={plotData}
                layout={{
                    ...item.layout,
                    width: itemWidth,
                    height: itemHeight,
                }}
                config={item.config || { displayModeBar: false }}
            />
        );
    };

    // Default placeholder renderer
    const defaultRenderPlaceholder = (item: PlotItem): React.ReactElement => {
        const label = item.placeholderLabel || item.layout.title?.toString() || `Plot ${item.id}`;

        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    fontSize: "14px",
                }}
            >
                {label}
            </div>
        );
    };

    const plotRenderer = renderPlot || defaultRenderPlot;
    const placeholderRenderer = renderPlaceholder || defaultRenderPlaceholder;

    // Render grid with virtualized plots
    const gridItems = useMemo(() => {
        const items: React.ReactElement[] = [];

        for (let i = 0; i < numPlots; i++) {
            const row = Math.floor(i / numColumns);
            const col = i % numColumns;
            const isVisible = visibleIndices.has(i);

            const plotItem = plotItems[i];

            items.push(
                <div
                    key={plotItem.id}
                    data-index={i}
                    style={{
                        position: "absolute",
                        left: col * plotWidth,
                        top: row * plotHeight,
                        width: plotWidth,
                        height: plotHeight,
                    }}
                >
                    {isVisible ? plotRenderer(plotItem, plotWidth, plotHeight - 8) : placeholderRenderer(plotItem)}
                </div>,
            );
        }

        return items;
    }, [numPlots, numColumns, plotWidth, plotHeight, visibleIndices, plotItems, plotRenderer, placeholderRenderer]);

    // If no plots, show empty content
    if (numPlots === 0) {
        return <>{emptyContent || <div>No plots available</div>}</>;
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: width,
                height: height,
                overflow: "auto",
                position: "relative",
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: numColumns * plotWidth,
                    height: numRows * plotHeight,
                }}
            >
                {gridItems}
            </div>
        </div>
    );
}
