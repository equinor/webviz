import React from "react";

import { useAtomValue, useSetAtom } from "jotai";
import type { PlotDatum, PlotMouseEvent } from "plotly.js";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { ModuleViewProps } from "@framework/Module";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useColorSet, useContinuousColorScale } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { Plot } from "@modules/_shared/components/Plot";

import type { Interfaces } from "../interfaces";
import type { VectorHexColorMap } from "../typesAndEnums";
import { GroupBy } from "../typesAndEnums";

import { userSelectedActiveTimestampUtcMsAtom } from "./atoms/baseAtoms";
import { queryIsFetchingAtom, realizationsQueryHasErrorAtom, statisticsQueryHasErrorAtom } from "./atoms/derivedAtoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { usePlotBuilder } from "./hooks/usePlotBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { EnsemblesContinuousParameterColoring } from "./utils/ensemblesContinuousParameterColoring";
import { SubplotOwner } from "./utils/PlotBuilder";

export const View = ({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(viewContext);

    const colorByParameter = viewContext.useSettingsToViewInterfaceValue("colorByParameter");
    const parameterIdent = viewContext.useSettingsToViewInterfaceValue("parameterIdent");
    const selectedEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedRegularEnsembles");
    const selectedDeltaEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedDeltaEnsembles");
    const vectorSpecifications = viewContext.useSettingsToViewInterfaceValue("vectorSpecifications");
    const groupBy = viewContext.useSettingsToViewInterfaceValue("groupBy");
    const hasRealizationsQueryError = useAtomValue(realizationsQueryHasErrorAtom);
    const hasStatisticsQueryError = useAtomValue(statisticsQueryHasErrorAtom);
    const anyLoading = useAtomValue(queryIsFetchingAtom);

    const setActiveTimestampUtcMs = useSetAtom(userSelectedActiveTimestampUtcMsAtom);

    // Color palettes
    const colorSet = useColorSet(workbenchSettings);
    const parameterColorScale = useContinuousColorScale(workbenchSettings, {
        gradientType: ColorScaleGradientType.Diverging,
    });
    const vectorHexColorMap: VectorHexColorMap = {};
    vectorSpecifications.forEach((vectorSpec, index) => {
        if (vectorSpec.vectorName in vectorHexColorMap) {
            return;
        }
        // If the vector name is not already in map, assign a color
        const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
        vectorHexColorMap[vectorSpec.vectorName] = color;
    });
    const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;

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
    usePublishToDataChannels(viewContext, subplotOwner, vectorHexColorMap);

    const handleClickInChart = React.useCallback(
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
        },
        [setActiveTimestampUtcMs],
    );

    const plotBuilder = usePlotBuilder(
        viewContext,
        wrapperDivSize,
        vectorHexColorMap,
        subplotOwner,
        ensemblesParameterColoring,
    );
    const hasNoQueryErrors = !hasRealizationsQueryError && !hasStatisticsQueryError;

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {hasNoQueryErrors ? (
                <Plot
                    plotUpdateReady={!anyLoading}
                    onClick={handleClickInChart}
                    data={plotBuilder.makePlotData()}
                    layout={plotBuilder.makePlotLayout()}
                />
            ) : (
                <ContentError>One or more queries have an error state.</ContentError>
            )}
        </div>
    );
};
