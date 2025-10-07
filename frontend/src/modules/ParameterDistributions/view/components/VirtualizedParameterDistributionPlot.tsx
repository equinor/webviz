import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";

import { Plot } from "@modules/_shared/components/Plot";

import { ParameterDistributionPlotType } from "../../typesAndEnums";
import type { EnsembleSetParameterArray } from "../utils/ensembleSetParamaterArray";
import { generateLayoutForParameter, generateTracesForParameter } from "../utils/plotUtils";
import type { TraceGenerationOptions } from "../utils/plotUtils";

type ParameterDistributionPlotProps = {
    dataArr: EnsembleSetParameterArray[];
    plotType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
    width: number;
    height: number;
};

// Individual plot component for a single parameter
function SingleParameterPlot({
    parameterData,
    plotType,
    showIndividualRealizationValues,
    showPercentilesAndMeanLines,
    width,
    height,
}: {
    parameterData: EnsembleSetParameterArray;
    plotType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
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
    });
    return (
        <div>
            <Plot data={traces} layout={layout} config={{ displayModeBar: false }} />
        </div>
    );
}

export function VirtualizedParameterDistributionPlot(props: ParameterDistributionPlotProps): React.ReactElement {
    const PLOT_LOADING_PLACEHOLDER_SIZE = 100;
    const MINIMUM_PIXEL_SIZE = 300;
    const FIXED_PLOT_HEIGHT = 350;
    const PLOT_MARGIN = 10;
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

    // Calculate grid dimensions
    const numSubplots = props.dataArr.length;
    const maxColumns = Math.max(1, Math.floor(props.width / MINIMUM_PIXEL_SIZE));
    const numColumns = Math.min(Math.ceil(Math.sqrt(numSubplots)), maxColumns);
    const numRows = Math.ceil(numSubplots / numColumns);
    const plotWidth = Math.floor(props.width / numColumns) - PLOT_MARGIN;
    const plotHeight = Math.max(FIXED_PLOT_HEIGHT, props.height / numRows) - PLOT_MARGIN;

    // Intersection Observer for virtualization
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const newVisibleIndices = new Set(visibleIndices);

                entries.forEach((entry) => {
                    const index = parseInt(entry.target.getAttribute("data-index") || "0");
                    if (entry.isIntersecting) {
                        newVisibleIndices.add(index);
                    } else {
                        newVisibleIndices.delete(index);
                    }
                });

                setVisibleIndices(newVisibleIndices);
            },
            {
                root: containerRef.current,
                rootMargin: `${PLOT_LOADING_PLACEHOLDER_SIZE}px`,
                threshold: 0,
            },
        );

        // Observe all plot containers
        const plotContainers = containerRef.current.querySelectorAll("[data-index]");
        plotContainers.forEach((container) => observer.observe(container));

        return () => observer.disconnect();
    }, [visibleIndices]);

    // Render grid with virtualized plots
    const renderGrid = useCallback(() => {
        const items = [];

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
                        // border: "1px solid #ddd",
                        // borderRadius: "4px",
                        // backgroundColor: isVisible ? "transparent" : "#f5f5f5",
                    }}
                >
                    {isVisible ? (
                        <SingleParameterPlot
                            parameterData={props.dataArr[i]}
                            plotType={props.plotType}
                            showIndividualRealizationValues={props.showIndividualRealizationValues}
                            showPercentilesAndMeanLines={props.showPercentilesAndMeanLines}
                            width={plotWidth} // Account for border
                            height={plotHeight - 8}
                        />
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                // color: "#666",
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

    // Initialize visible plots (first few in viewport)
    useEffect(() => {
        const initialVisible = new Set<number>();
        const plotsPerView = Math.ceil(props.height / plotHeight) * numColumns;

        for (let i = 0; i < Math.min(plotsPerView + numColumns, numSubplots); i++) {
            initialVisible.add(i);
        }

        setVisibleIndices(initialVisible);
    }, [props.height, plotHeight, numColumns, numSubplots]);

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
                {renderGrid()}
            </div>
        </div>
    );
}
