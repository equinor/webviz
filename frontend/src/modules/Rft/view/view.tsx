import React from "react";

import type { RftObservation_api } from "@api";
import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import type { RftEnsembleObservationsData } from "../typesAndEnums";

import { makeRftPlotTitle } from "./utils/createTitle";
import { RftPlotBuilder } from "./utils/RftPlotBuilder";

export function View({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<Interfaces>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const statusWriter = useViewStatusWriter(viewContext);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const colorSet = useColorSet(workbenchSettings);

    const wellName = viewContext.useSettingsToViewInterfaceValue("wellName");
    const responseName = viewContext.useSettingsToViewInterfaceValue("responseName");
    const timestampUtcMs = viewContext.useSettingsToViewInterfaceValue("timestampUtcMs");
    const visualizationSettings = viewContext.useSettingsToViewInterfaceValue("visualizationSettings");
    const rftDataAccessorStatus = viewContext.useSettingsToViewInterfaceValue("rftDataAccessorStatus");
    const rftObservationsStatus = viewContext.useSettingsToViewInterfaceValue("rftObservationsStatus");

    const propagatedErrorMessages = usePropagateAllApiErrorsToStatusWriter(rftDataAccessorStatus.errors, statusWriter);
    const propagatedErrorMessage = propagatedErrorMessages[0] ?? null;
    const instanceTitle = makeRftPlotTitle(wellName, responseName, timestampUtcMs);

    statusWriter.setLoading(rftDataAccessorStatus.isFetching);

    React.useEffect(
        function updateInstanceTitle() {
            viewContext.setInstanceTitle(instanceTitle);
        },
        [instanceTitle, viewContext],
    );

    function makeContent() {
        if (!wellName || !responseName || timestampUtcMs === null) {
            return <ContentMessage type={ContentMessageType.INFO}>No RFT selection.</ContentMessage>;
        }

        if (rftDataAccessorStatus.isFetching) {
            return (
                <ContentMessage type={ContentMessageType.INFO}>
                    <CircularProgress />
                </ContentMessage>
            );
        }

        if (rftDataAccessorStatus.isError) {
            return (
                <ContentMessage type={ContentMessageType.ERROR}>
                    {propagatedErrorMessage ?? "Could not load RFT data."}
                </ContentMessage>
            );
        }

        if (!rftDataAccessorStatus.dataAccessor || rftDataAccessorStatus.dataAccessor.getEntries().length === 0) {
            return <ContentMessage type={ContentMessageType.INFO}>No RFT data loaded.</ContentMessage>;
        }

        const dataAccessor = rftDataAccessorStatus.dataAccessor;
        const selectedEnsembles = dataAccessor.getEntries().flatMap((entry) => {
            const ensemble = ensembleSet.findEnsemble(entry.ensembleIdent);
            return ensemble ? [ensemble] : [];
        });
        const plotBuilder = new RftPlotBuilder(dataAccessor, selectedEnsembles, colorSet);

        const observationRows = visualizationSettings.showObservations
            ? extractObservationRows(rftObservationsStatus.observationsData, wellName, timestampUtcMs, responseName)
            : [];
        const valueRange = makeValueRange(dataAccessor.getEntries(), observationRows);

        const shownLegendEnsembles = new Set<string>();
        const plotData = [
            ...plotBuilder.makeLegendTraces(shownLegendEnsembles),
            ...(visualizationSettings.showStatisticalFan
                ? plotBuilder.makeStatisticFanTraces(shownLegendEnsembles)
                : []),
            ...(visualizationSettings.showStatisticalLines
                ? plotBuilder.makeStatisticLineTraces(
                      responseName,
                      visualizationSettings.selectedStatistics,
                      shownLegendEnsembles,
                  )
                : []),
            ...(visualizationSettings.showIndividualRealizations
                ? plotBuilder.makeIndividualRealizationTraces(responseName, shownLegendEnsembles)
                : []),
            ...(visualizationSettings.showObservations
                ? plotBuilder.makeObservationTraces(observationRows, responseName)
                : []),
        ];

        return (
            <Plot
                data={plotData}
                layout={plotBuilder.makeLayout(wrapperDivSize, responseName, valueRange)}
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

function extractObservationRows(
    observationsData: RftEnsembleObservationsData[],
    wellName: string,
    timestampUtcMs: number,
    responseName: string,
): RftObservation_api[] {
    const dateString = timestampUtcMsToCompactIsoString(timestampUtcMs).split("T")[0];

    for (const ensembleObservations of observationsData) {
        const matchingGroup = ensembleObservations.observations.find(
            (group) => group.well_name === wellName && group.date.split("T")[0] === dateString,
        );
        if (matchingGroup) {
            return matchingGroup.observations.filter(
                (observation) => observation.property.toUpperCase() === responseName.toUpperCase(),
            );
        }
    }

    return [];
}

function makeValueRange(
    entries: { values: number[] }[],
    observationRows: RftObservation_api[],
): [number, number] | null {
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;

    for (const entry of entries) {
        for (const value of entry.values) {
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
        }
    }
    for (const observation of observationRows) {
        minValue = Math.min(minValue, observation.value - observation.error);
        maxValue = Math.max(maxValue, observation.value + observation.error);
    }

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
        return null;
    }

    return [minValue, maxValue];
}
