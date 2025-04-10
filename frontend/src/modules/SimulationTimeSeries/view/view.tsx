import React from "react";

import { useAtomValue, useSetAtom } from "jotai";
import type { PlotDatum, PlotMouseEvent } from "plotly.js";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { ModuleViewProps } from "@framework/Module";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError } from "@modules/_shared/components/ContentMessage";


import type { Interfaces } from "../interfaces";

import { userSelectedActiveTimestampUtcMsAtom } from "./atoms/baseAtoms";
import { realizationsQueryHasErrorAtom, statisticsQueryHasErrorAtom } from "./atoms/derivedAtoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { usePlotBuilder } from "./hooks/usePlotBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { EnsemblesContinuousParameterColoring } from "./utils/ensemblesContinuousParameterColoring";


export const View = ({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(viewContext);

    const colorByParameter = viewContext.useSettingsToViewInterfaceValue("colorByParameter");
    const parameterIdent = viewContext.useSettingsToViewInterfaceValue("parameterIdent");
    const selectedEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedRegularEnsembles");
    const selectedDeltaEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedDeltaEnsembles");
    const hasRealizationsQueryError = useAtomValue(realizationsQueryHasErrorAtom);
    const hasStatisticsQueryError = useAtomValue(statisticsQueryHasErrorAtom);

    const setActiveTimestampUtcMs = useSetAtom(userSelectedActiveTimestampUtcMsAtom);

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

    const ensemblesWithoutParameter: (RegularEnsemble | DeltaEnsemble)[] = [];
    let parameterDisplayName: string | null = null;
    if (ensemblesParameterColoring) {
        ensemblesWithoutParameter.push(
            ...selectedEnsembles.filter(
                (ensemble) => !ensemblesParameterColoring.hasParameterForEnsemble(ensemble.getIdent()),
            ),
        );
        parameterDisplayName = ensemblesParameterColoring.getParameterDisplayName();
        ensemblesWithoutParameter.push(...selectedDeltaEnsembles);
    }

    useMakeViewStatusWriterMessages(viewContext, statusWriter, parameterDisplayName, ensemblesWithoutParameter);
    usePublishToDataChannels(viewContext);

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

    const plot = usePlotBuilder(viewContext, wrapperDivSize, colorSet, ensemblesParameterColoring, handleClickInChart);
    const hasNoQueryErrors = !hasRealizationsQueryError && !hasStatisticsQueryError;

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {hasNoQueryErrors ? plot : <ContentError>One or more queries have an error state.</ContentError>}
        </div>
    );
};
