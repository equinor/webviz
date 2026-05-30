import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";

import { makeRelPermPlotTitle } from "./utils/createTitle";
import { RelPermPlotBuilder } from "./utils/RelPermPlotBuilder";

export function View({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<Interfaces>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const statusWriter = useViewStatusWriter(viewContext);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const colorSet = useColorSet(workbenchSettings);

    const tableName = viewContext.useSettingsToViewInterfaceValue("tableName");
    const saturationAxisName = viewContext.useSettingsToViewInterfaceValue("saturationAxisName");
    const curveNames = viewContext.useSettingsToViewInterfaceValue("curveNames");
    const satnums = viewContext.useSettingsToViewInterfaceValue("satnums");
    const curveType = viewContext.useSettingsToViewInterfaceValue("curveType");
    const visualizationSettings = viewContext.useSettingsToViewInterfaceValue("visualizationSettings");
    const relPermDataAccessorStatus = viewContext.useSettingsToViewInterfaceValue("relPermDataAccessorStatus");
    const propagatedErrorMessages = usePropagateAllApiErrorsToStatusWriter(
        relPermDataAccessorStatus.errors,
        statusWriter,
    );
    const propagatedErrorMessage = propagatedErrorMessages[0] ?? null;
    const instanceTitle = makeRelPermPlotTitle(curveType, curveNames, visualizationSettings.groupBy);

    statusWriter.setLoading(relPermDataAccessorStatus.isFetching);

    React.useEffect(
        function updateInstanceTitle() {
            viewContext.setInstanceTitle(instanceTitle);
        },
        [instanceTitle, viewContext],
    );

    function makeContent() {
        if (!tableName) {
            return <ContentMessage type={ContentMessageType.INFO}>No relperm table selected.</ContentMessage>;
        }

        if (!saturationAxisName || curveNames.length === 0 || satnums.length === 0) {
            return <ContentMessage type={ContentMessageType.INFO}>No relperm curve selection.</ContentMessage>;
        }

        if (relPermDataAccessorStatus.isFetching) {
            return (
                <ContentMessage type={ContentMessageType.INFO}>
                    <CircularProgress />
                </ContentMessage>
            );
        }

        if (relPermDataAccessorStatus.isError) {
            return (
                <ContentMessage type={ContentMessageType.ERROR}>
                    {propagatedErrorMessage ?? "Could not load relperm data."}
                </ContentMessage>
            );
        }

        if (
            !relPermDataAccessorStatus.dataAccessor ||
            relPermDataAccessorStatus.dataAccessor.getEntries().length === 0
        ) {
            return <ContentMessage type={ContentMessageType.INFO}>No relperm data loaded.</ContentMessage>;
        }

        const selectedEnsembles = relPermDataAccessorStatus.dataAccessor.getEntries().flatMap((entry) => {
            const ensemble = ensembleSet.findEnsemble(entry.ensembleIdent);
            return ensemble ? [ensemble] : [];
        });
        const plotBuilder = new RelPermPlotBuilder(relPermDataAccessorStatus.dataAccessor, selectedEnsembles, colorSet);
        const shownLegendColorByValues = new Set<string>();
        const plotData = [
            ...plotBuilder.makeLegendTraces(visualizationSettings.colorBy, shownLegendColorByValues),
            ...(visualizationSettings.showStatisticalFan
                ? plotBuilder.makeStatisticFanTraces(
                      visualizationSettings.colorBy,
                      visualizationSettings.groupBy,
                      shownLegendColorByValues,
                  )
                : []),
            ...(visualizationSettings.showStatisticalLines
                ? plotBuilder.makeStatisticLineTraces(
                      visualizationSettings.colorBy,
                      visualizationSettings.groupBy,
                      visualizationSettings.selectedStatistics,
                      shownLegendColorByValues,
                  )
                : []),
            ...(visualizationSettings.showIndividualRealizations
                ? plotBuilder.makeIndividualRealizationTraces(
                      visualizationSettings.colorBy,
                      visualizationSettings.groupBy,
                      shownLegendColorByValues,
                  )
                : []),
        ];

        if (plotData.length === 0) {
            return <ContentMessage type={ContentMessageType.INFO}>No relperm plot layers selected.</ContentMessage>;
        }

        return (
            <Plot
                data={plotData}
                layout={plotBuilder.makeLayout(
                    wrapperDivSize,
                    curveType,
                    saturationAxisName,
                    visualizationSettings.groupBy,
                    visualizationSettings.yAxisScale,
                )}
                config={{ scrollZoom: true }}
            />
        );
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
}
