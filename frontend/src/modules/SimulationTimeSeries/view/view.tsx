import React from "react";

import { useAtomValue, useSetAtom } from "jotai";
import type { PlotDatum, PlotHoverEvent, PlotMouseEvent } from "plotly.js";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { HoverTopic, useHoverValue, usePublishHoverValue } from "@framework/HoverService";
import type { ModuleViewProps } from "@framework/Module";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useColorSet, useContinuousColorScale } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError, ContentWarning } from "@modules/_shared/components/ContentMessage";
import { Plot } from "@modules/_shared/components/Plot";

import type { Interfaces } from "../interfaces";
import type { VectorHexColorMap } from "../typesAndEnums";
import { GroupBy } from "../typesAndEnums";

import { queryIsFetchingAtom, realizationsQueryHasErrorAtom, statisticsQueryHasErrorAtom } from "./atoms/derivedAtoms";
import { activeTimestampUtcMsAtom } from "./atoms/persistableFixableAtoms";
import { useDownloadData } from "./hooks/useDownloadData";
import { useMakeResampleFrequencyWarningMessage } from "./hooks/useMakeResampleFrequencyWarningMessage";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { usePlotBuilder } from "./hooks/usePlotBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { EnsemblesParameterColoring } from "./utils/ensemblesContinuousParameterColoring";
import { SubplotOwner } from "./utils/PlotBuilder";

export const View = ({ viewContext, workbenchSettings, hoverService }: ModuleViewProps<Interfaces>) => {
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
    const isAnyQueryLoading = useAtomValue(queryIsFetchingAtom);

    const showTimestampMarker = viewContext.useSettingsToViewInterfaceValue("showTimestampMarker");
    const setActiveTimestampUtcMs = useSetAtom(activeTimestampUtcMsAtom);

    const moduleInstanceId = viewContext.getInstanceIdString();
    const hoveredTimestampUtcMs = useHoverValue(HoverTopic.TIMESTAMP, hoverService, moduleInstanceId);
    const isHoverExternal = hoverService.getLastHoveredModule() !== moduleInstanceId;
    const setHoveredTimestamp = usePublishHoverValue(HoverTopic.TIMESTAMP, hoverService, moduleInstanceId);

    // Color palettes
    const colorSet = useColorSet(workbenchSettings);
    const parameterColorScale = useContinuousColorScale(workbenchSettings, {
        gradientType: ColorScaleGradientType.Diverging,
    });
    const vectorHexColorMap = React.useMemo(() => {
        const colorMap: VectorHexColorMap = {};
        vectorSpecifications.forEach((vectorSpec, index) => {
            if (vectorSpec.vectorName in colorMap) {
                return;
            }
            // If the vector name is not already in map, assign a color
            const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
            colorMap[vectorSpec.vectorName] = color;
        });
        return colorMap;
    }, [vectorSpecifications, colorSet]);
    const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;

    // Create parameter color scale helper
    const ensemblesParameterColoring = React.useMemo(
        () =>
            colorByParameter && parameterIdent
                ? new EnsemblesParameterColoring(selectedEnsembles, parameterIdent, parameterColorScale)
                : null,
        [colorByParameter, parameterIdent, selectedEnsembles, parameterColorScale],
    );

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

    useMakeViewStatusWriterMessages(statusWriter, parameterDisplayName, ensemblesWithoutParameter);
    usePublishToDataChannels(viewContext, subplotOwner, vectorHexColorMap);

    const resampleFrequencyWarningMessage = useMakeResampleFrequencyWarningMessage();

    const handleClickInChart = React.useCallback(
        function handleClickInChart(e: PlotMouseEvent) {
            if (!showTimestampMarker) {
                return;
            }
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
        [setActiveTimestampUtcMs, showTimestampMarker],
    );

    const handleHoverInChart = React.useCallback(
        function handleHoverInChart(e: PlotHoverEvent) {
            const hoveredPoint: PlotDatum | undefined = e.points[0];
            if (!hoveredPoint) {
                return;
            }
            const timestampUtcMs = hoveredPoint.data.x[hoveredPoint.pointIndex];
            if (typeof timestampUtcMs === "number") {
                setHoveredTimestamp(timestampUtcMs);
            }
        },
        [setHoveredTimestamp],
    );

    const handleUnhoverInChart = React.useCallback(
        function handleUnhoverInChart() {
            setHoveredTimestamp(null);
        },
        [setHoveredTimestamp],
    );

    const { assembleCsvAndDownload } = useDownloadData(viewContext);
    const plotBuilder = usePlotBuilder(
        viewContext,
        wrapperDivSize,
        vectorHexColorMap,
        subplotOwner,
        ensemblesParameterColoring,
    );

    // Traces are kept separate from the time markers, so hovering does not rebuild or re-compare trace data
    const plotData = React.useMemo(() => plotBuilder?.makePlotData(), [plotBuilder]);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom).value;
    const plotLayout = React.useMemo(
        () =>
            plotBuilder?.makePlotLayout({
                activeTimestampUtcMs: showTimestampMarker ? activeTimestampUtcMs : null,
                hoveredTimestampUtcMs,
                isHoverExternal,
            }),
        [plotBuilder, showTimestampMarker, activeTimestampUtcMs, hoveredTimestampUtcMs, isHoverExternal],
    );

    const hasQueryErrors = hasRealizationsQueryError || hasStatisticsQueryError;

    const viewContent = React.useMemo(
        function createViewContent(): React.ReactNode {
            if (resampleFrequencyWarningMessage !== null) {
                return <ContentWarning>{resampleFrequencyWarningMessage}</ContentWarning>;
            }
            if (hasQueryErrors) {
                return <ContentError>One or more queries have an error state. See the log for details.</ContentError>;
            }
            if (!plotBuilder) {
                return (
                    <ContentError>
                        An unhandled error occurred. Plot could not be constructed with the current settings.
                    </ContentError>
                );
            }

            return (
                <Plot
                    plotUpdateReady={!isAnyQueryLoading}
                    onClick={handleClickInChart}
                    onHover={handleHoverInChart}
                    onUnhover={handleUnhoverInChart}
                    onDownloadClick={assembleCsvAndDownload}
                    data={plotData}
                    layout={plotLayout}
                />
            );
        },
        [
            plotBuilder,
            plotData,
            plotLayout,
            hasQueryErrors,
            isAnyQueryLoading,
            resampleFrequencyWarningMessage,
            assembleCsvAndDownload,
            handleClickInChart,
            handleHoverInChart,
            handleUnhoverInChart,
        ],
    );

    // "overflow-hidden" in order to avoid flickering when zooming in browser (chrome)
    return (
        <div className="h-full w-full overflow-hidden" ref={wrapperDivRef}>
            {viewContent}
        </div>
    );
};
