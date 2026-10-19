import React from "react";

import { isEqual } from "lodash-es";

import { ContentWarning } from "@modules/_shared/components/ContentMessage";
import { Plot } from "@modules/_shared/components/Plot";

import type { HistogramMode } from "../../typesAndEnums";
import { ParameterDistributionPlotType } from "../../typesAndEnums";
import type { EnsembleSetParameterArray } from "../utils/ensembleSetParameterArray";
import { generateLayoutForParameter, generateTracesForParameter } from "../utils/plotUtils";
import type { TraceGenerationOptions } from "../utils/plotUtils";

type ParameterDistributionPlotProps = {
    dataArr: EnsembleSetParameterArray[];
    plotType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
    histogramMode: HistogramMode;
    width: number;
    height: number;
};

// Individual plot component for a single parameter
function SingleParameterPlot({
    parameterData,
    plotType,
    showIndividualRealizationValues,
    showPercentilesAndMeanLines,
    histogramMode,
    width,
    height,
}: {
    parameterData: EnsembleSetParameterArray;
    plotType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
    histogramMode: HistogramMode;
    width: number;
    height: number;
}): React.ReactElement {
    const showRugTraces =
        plotType === ParameterDistributionPlotType.DISTRIBUTION_PLOT && showIndividualRealizationValues;

    const traceOptions: TraceGenerationOptions = {
        plotType,
        showIndividualRealizationValues,
        showPercentilesAndMeanLines,
    };

    const traces = generateTracesForParameter(parameterData, traceOptions);

    const layout = generateLayoutForParameter({
        width: width,
        height: height,
        title: parameterData.parameterIdent.name,
        xAxisIsLogarithmic: parameterData.isLogarithmic === true,
        showZeroLine: showRugTraces,
        barmode: histogramMode,
    });
    return (
        <div>
            <Plot data={traces} layout={layout} config={{ displayModeBar: false }} />
        </div>
    );
}

function computeVisibleIndices(
    containerHeight: number,
    numPlots: number,
    plotHeight: number,
    numColumns: number,
): Set<number> {
    const initialVisible = new Set<number>();

    if (numPlots > 0) {
        const plotsPerView = Math.ceil(containerHeight / Math.max(plotHeight, 1)) * numColumns;
        for (let i = 0; i < Math.min(plotsPerView + numColumns, numPlots); i++) {
            initialVisible.add(i);
        }
    }

    return initialVisible;
}

export function VirtualizedParameterDistributionPlot(props: ParameterDistributionPlotProps): React.ReactElement {
    const PLOT_LOADING_PLACEHOLDER_SIZE = 100;
    const MINIMUM_PIXEL_SIZE = 300;
    const FIXED_PLOT_HEIGHT = 350;
    const PLOT_MARGIN = 10;
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Calculate grid dimensions
    const numSubplots = props.dataArr.length;
    const maxColumns = Math.max(1, Math.floor(props.width / MINIMUM_PIXEL_SIZE));

    // Handle edge case where numSubplots < 1 to prevent NaN/Infinity values
    // Note: We can't early return with ContentWarning here due to React hooks rules -
    // all hooks (useEffect, useMemo) must be called in the same order on every render.
    // So we need to ensure safe values for calculations and defer the ContentWarning check until after hooks.
    const safeNumSubplots = Math.max(1, numSubplots);
    const numColumns = Math.min(Math.ceil(Math.sqrt(safeNumSubplots)), maxColumns);
    const numRows = Math.ceil(safeNumSubplots / numColumns);
    const plotWidth = Math.floor(props.width / numColumns) - PLOT_MARGIN;
    const plotHeight = Math.max(FIXED_PLOT_HEIGHT, props.height / numRows) - PLOT_MARGIN;

    // Using both a combination of state and a memoized value here, to make it so we can set the
    // visibility both via the IntersectionObserver below, and when props change externally
    const expectedVisibleIndices = React.useMemo(
        () => computeVisibleIndices(props.height, numSubplots, plotHeight, numColumns),
        [numColumns, numSubplots, plotHeight, props.height],
    );

    const [prevExpectedVisibleIndices, setPrevExpectedVisibleIndices] = React.useState(expectedVisibleIndices);
    const [visibleIndices, setVisibleIndices] = React.useState(expectedVisibleIndices);

    if (!isEqual(expectedVisibleIndices, prevExpectedVisibleIndices)) {
        setPrevExpectedVisibleIndices(expectedVisibleIndices);
        setVisibleIndices(expectedVisibleIndices);
    }

    // Intersection Observer for virtualization
    React.useEffect(() => {
        if (!containerRef.current || numSubplots < 1) return;

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
                rootMargin: `${PLOT_LOADING_PLACEHOLDER_SIZE}px`,
                threshold: 0,
            },
        );

        // Observe all plot containers after a brief delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            if (containerRef.current) {
                const plotContainers = containerRef.current.querySelectorAll("[data-index]");
                plotContainers.forEach((container) => observer.observe(container));
            }
        }, 0);

        return () => {
            observer.disconnect();
            clearTimeout(timeoutId);
        };
    }, [numSubplots, PLOT_LOADING_PLACEHOLDER_SIZE]);

    // Render grid with virtualized plots
    const gridItems = React.useMemo(() => {
        const items: React.ReactElement[] = [];

        for (let i = 0; i < numSubplots; i++) {
            const row = Math.floor(i / numColumns);
            const col = i % numColumns;
            const isVisible = visibleIndices.has(i);

            items.push(
                <div
                    key={i}
                    data-index={i}
                    style={{
                        position: "absolute",
                        left: col * plotWidth,
                        top: row * plotHeight,
                        width: plotWidth,
                        height: plotHeight,
                    }}
                >
                    {isVisible ? (
                        <SingleParameterPlot
                            parameterData={props.dataArr[i]}
                            plotType={props.plotType}
                            showIndividualRealizationValues={props.showIndividualRealizationValues}
                            showPercentilesAndMeanLines={props.showPercentilesAndMeanLines}
                            histogramMode={props.histogramMode}
                            width={plotWidth}
                            height={plotHeight - 8}
                        />
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                fontSize: "14px",
                            }}
                        >
                            {props.dataArr[i].parameterIdent.name}
                        </div>
                    )}
                </div>,
            );
        }

        return items;
    }, [numSubplots, numColumns, plotWidth, plotHeight, visibleIndices, props]);

    // If no parameters, show ContentWarning
    if (numSubplots === 0) {
        return <ContentWarning>No parameters selected. Please check your settings</ContentWarning>;
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: props.width,
                height: props.height,
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
