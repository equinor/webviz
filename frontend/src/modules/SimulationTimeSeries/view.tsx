import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { useAtom, useAtomValue } from "jotai";
import { PlotDatum, PlotMouseEvent } from "plotly.js";

import {
    realizationsQueryHasErrorAtom,
    statisticsQueryHasErrorAtom,
    userSelectedActiveTimestampUtcMsAtom,
} from "./atoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { useSubplotBuilder } from "./hooks/useSubplotBuilder";

export const View = ({ moduleContext, workbenchSettings }: ModuleFCProps<Record<string, never>>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(moduleContext);

    const hasRealizationsQueryError = useAtomValue(realizationsQueryHasErrorAtom);
    const hasStatisticsQueryError = useAtomValue(statisticsQueryHasErrorAtom);
    const [, setActiveTimestampUtcMs] = useAtom(userSelectedActiveTimestampUtcMsAtom);

    // Color palettes
    const colorSet = workbenchSettings.useColorSet();
    const parameterColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Diverging,
    });

    useMakeViewStatusWriterMessages(statusWriter, parameterColorScale);

    const [plotData, plotLayout] = useSubplotBuilder(wrapperDivSize, colorSet, parameterColorScale);

    function handleClickInChart(e: PlotMouseEvent) {
        const clickedPoint: PlotDatum = e.points[0];
        if (!clickedPoint) {
            return;
        }

        if (clickedPoint.pointIndex >= 0 && clickedPoint.pointIndex < clickedPoint.data.x.length) {
            const timestampUtcMs = clickedPoint.data.x[clickedPoint.pointIndex];
            if (typeof timestampUtcMs === "number") {
                setActiveTimestampUtcMs(timestampUtcMs);
            }
        }
    }

    const doRenderContentError = hasRealizationsQueryError || hasStatisticsQueryError;

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {doRenderContentError ? (
                <ContentError>One or more queries have an error state.</ContentError>
            ) : (
                <Plot
                    key={plotData.length} // Note: Temporary to trigger re-render and remove legends when plotData is empty
                    data={plotData}
                    layout={plotLayout}
                    config={{ scrollZoom: true }}
                    onClick={handleClickInChart}
                />
            )}
        </div>
    );
};
