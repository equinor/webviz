import React from "react";
import Plot from "react-plotly.js";

import { Ensemble } from "@framework/Ensemble";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
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
