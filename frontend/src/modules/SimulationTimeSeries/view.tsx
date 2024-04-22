import React from "react";
import Plot from "react-plotly.js";

import { Ensemble } from "@framework/Ensemble";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { useAtom, useAtomValue } from "jotai";
import { PlotDatum, PlotMouseEvent } from "plotly.js";

import { userSelectedActiveTimestampUtcMsAtom } from "./atoms/baseAtoms";
import { parameterIdentAtom, selectedEnsemblesAtom } from "./atoms/derivedSettingsAtoms";
import {
    colorByParameterAtom,
    realizationsQueryHasErrorAtom,
    statisticsQueryHasErrorAtom,
} from "./atoms/derivedViewAtoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { useSubplotBuilder } from "./hooks/useSubplotBuilder";
import { EnsemblesContinuousParameterColoring } from "./utils/ensemblesContinuousParameterColoring";

export const View = ({ viewContext, workbenchSettings }: ModuleViewProps<Record<string, never>>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(viewContext);

    const colorByParameter = useAtomValue(colorByParameterAtom);
    const parameterIdent = useAtomValue(parameterIdentAtom);
    const selectedEnsembles = useAtomValue(selectedEnsemblesAtom);
    const hasRealizationsQueryError = useAtomValue(realizationsQueryHasErrorAtom);
    const hasStatisticsQueryError = useAtomValue(statisticsQueryHasErrorAtom);

    const [, setActiveTimestampUtcMs] = useAtom(userSelectedActiveTimestampUtcMsAtom);

    // Color palettes
    const colorSet = workbenchSettings.useColorSet();
    const parameterColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Diverging,
    const ensembleSet = workbenchSession.getEnsembleSet();
    const ensemble = vectorSpec ? ensembleSet.findEnsemble(vectorSpec.ensembleIdent) : null;

    function dataGenerator() {
        const data: { key: number; value: number }[] = [];
        if (vectorQuery.data) {
            vectorQuery.data.forEach((vectorRealizationData) => {
                data.push({
                    key: vectorRealizationData.realization,
                    value: vectorRealizationData.values[0],
                });
            });
        }
        return {
            data,
            metaData: {
                ensembleIdentString: vectorSpec?.ensembleIdent.toString() ?? "",
            },
        };
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.REALIZATION_VALUE,
        dependencies: [vectorQuery.data, ensemble, vectorSpec],
        enabled: vectorSpec !== null,
        contents: [
            { contentIdString: vectorSpec?.vectorName ?? "", displayName: vectorSpec?.vectorName ?? "", dataGenerator },
        ],
    });

    // Create parameter color scale helper
    const ensemblesParameterColoring =
        colorByParameter && parameterIdent
            ? new EnsemblesContinuousParameterColoring(selectedEnsembles, parameterIdent, parameterColorScale)
            : null;

    const ensemblesWithoutParameter: Ensemble[] = [];
    let parameterDisplayName: string | null = null;
    if (ensemblesParameterColoring) {
        ensemblesWithoutParameter.push(
            ...selectedEnsembles.filter(
                (ensemble) => !ensemblesParameterColoring.hasParameterForEnsemble(ensemble.getIdent())
            )
        );
        parameterDisplayName = ensemblesParameterColoring.getParameterDisplayName();
    }

    useMakeViewStatusWriterMessages(statusWriter, parameterDisplayName, ensemblesWithoutParameter);

    const [plotData, plotLayout] = useSubplotBuilder(wrapperDivSize, colorSet, ensemblesParameterColoring);

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

    if (showHistorical && historicalQuery.data) {
        const lineShape = historicalQuery.data.is_rate ? "vh" : "linear";
        const trace: MyPlotData = {
            x: historicalQuery.data.timestamps_utc_ms,
            y: historicalQuery.data.values,
            name: "History",
            legendrank: -1,
            type: "scatter",
            mode: "lines",
            line: { color: "black", width: 2, shape: lineShape },
        };
        tracesDataArr.push(trace);
    }

    const hasGotAnyRequestedData = !!(
        (showRealizations && vectorQuery.data) ||
        (showStatistics && statisticsQuery.data) ||
        (showHistorical && historicalQuery.data)
    );

    let plotTitle = "N/A";
    if (vectorSpec && hasGotAnyRequestedData) {
        const unitString = determineUnitString(vectorQuery.data, statisticsQuery.data, historicalQuery.data);
        plotTitle = `${vectorSpec.vectorName} [${unitString}]`;
    }

    React.useEffect(
        function updateInstanceTitle() {
            if (ensemble && vectorSpec && hasGotAnyRequestedData) {
                const ensembleDisplayName = ensemble.getDisplayName();
                viewContext.setInstanceTitle(`${ensembleDisplayName} - ${vectorSpec.vectorName}`);
            }
        },
        [hasGotAnyRequestedData, ensemble, vectorSpec, viewContext]
    );

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        title: plotTitle,
        margin: { t: 30, r: 0, l: 40, b: 40 },
        xaxis: { type: "date" },
    };

    if (subscribedHoverTimestamp) {
        layout["shapes"] = [
            {
                type: "line",
                xref: "x",
                yref: "paper",
                x0: subscribedHoverTimestamp.timestampUtcMs,
                y0: 0,
                x1: subscribedHoverTimestamp.timestampUtcMs,
                y1: 1,
                line: { color: "red", width: 1, dash: "dot" },
            },
        ];
    }

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
