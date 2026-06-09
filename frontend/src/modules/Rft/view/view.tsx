import React from "react";

import { useAtom } from "jotai";
import type { Config, Layout } from "plotly.js";

import type { RftObservation_api } from "@api";
import type { ModuleViewProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { dataChannelDepthAtom } from "../settings/atoms/baseAtoms";
import type { RftEnsembleObservationsData } from "../typesAndEnums";

import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { makeRftPlotTitle } from "./utils/createTitle";
import { RftPlotBuilder } from "./utils/RftPlotBuilder";

const PLOT_CONFIG: Partial<Config> = { scrollZoom: true, edits: { shapePosition: true } };

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

    const [dataChannelDepth, setDataChannelDepth] = useAtom(dataChannelDepthAtom);

    const propagatedErrorMessages = usePropagateAllApiErrorsToStatusWriter(rftDataAccessorStatus.errors, statusWriter);
    const propagatedErrorMessage = propagatedErrorMessages[0] ?? null;
    const instanceTitle = makeRftPlotTitle(wellName, responseName, timestampUtcMs);

    statusWriter.setLoading(rftDataAccessorStatus.isFetching);

    const entries = rftDataAccessorStatus.dataAccessor?.getEntries() ?? [];
    const selectedEnsembles = entries.flatMap((entry) => {
        const ensemble = ensembleSet.findEnsemble(entry.ensembleIdent);
        return ensemble ? [ensemble] : [];
    });

    const dataChannelDepthRange = makeDepthRange(entries);
    const effectiveDataChannelDepth =
        dataChannelDepth ??
        (dataChannelDepthRange ? (dataChannelDepthRange[0] + dataChannelDepthRange[1]) / 2 : null);

    usePublishToDataChannels(viewContext, {
        entries,
        responseName,
        dataChannelDepth: effectiveDataChannelDepth,
        makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent) =>
            makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles),
        isFetching: rftDataAccessorStatus.isFetching,
    });

    const handleRelayout = React.useCallback(
        function handleRelayout(event: Record<string, unknown>) {
            // Plotly fires "relayout" for many reasons (resize, autosize, pan/zoom). Only react to a
            // deliberate drag of the depth line, i.e. an event that carries shape coordinates and nothing
            // else. Reacting to resize/autosize echoes would create a re-render <-> redraw feedback loop.
            const keys = Object.keys(event);
            const isShapeEdit = keys.length > 0 && keys.every((key) => key.startsWith("shapes["));
            if (!isShapeEdit) {
                return;
            }

            const y0 = event["shapes[0].y0"];
            const y1 = event["shapes[0].y1"];
            const newDepth =
                typeof y0 === "number" && typeof y1 === "number"
                    ? (y0 + y1) / 2
                    : typeof y0 === "number"
                      ? y0
                      : null;
            if (newDepth !== null && newDepth !== dataChannelDepth) {
                setDataChannelDepth(newDepth);
            }
        },
        [dataChannelDepth, setDataChannelDepth],
    );

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

        if (!rftDataAccessorStatus.dataAccessor || entries.length === 0) {
            return <ContentMessage type={ContentMessageType.INFO}>No RFT data loaded.</ContentMessage>;
        }

        const dataAccessor = rftDataAccessorStatus.dataAccessor;
        const plotBuilder = new RftPlotBuilder(dataAccessor, selectedEnsembles, colorSet);

        const observationRows = visualizationSettings.showObservations
            ? extractObservationRows(rftObservationsStatus.observationsData, wellName, timestampUtcMs, responseName)
            : [];
        const valueRange = makeValueRange(entries, observationRows);

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

        const layout = plotBuilder.makeLayout(wrapperDivSize, responseName, valueRange);
        layout.shapes = makeDataChannelDepthShapes(effectiveDataChannelDepth);

        return <Plot data={plotData} layout={layout} config={PLOT_CONFIG} onRelayout={handleRelayout} />;
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
}

function makeDataChannelDepthShapes(dataChannelDepth: number | null): Partial<Layout>["shapes"] {
    if (dataChannelDepth === null) {
        return [];
    }

    return [
        {
            type: "line",
            xref: "paper",
            x0: 0,
            x1: 1,
            yref: "y",
            y0: dataChannelDepth,
            y1: dataChannelDepth,
            line: { color: "rgba(33, 102, 172, 0.9)", width: 3, dash: "dot" },
            label: {
                text: `Data channel depth: ${dataChannelDepth.toFixed(1)}`,
                textposition: "top right",
                font: { size: 10, color: "rgba(33, 102, 172, 0.9)" },
            },
        },
    ];
}

function makeDepthRange(entries: { depths: number[] }[]): [number, number] | null {
    let minDepth = Number.POSITIVE_INFINITY;
    let maxDepth = Number.NEGATIVE_INFINITY;

    for (const entry of entries) {
        for (const depth of entry.depths) {
            minDepth = Math.min(minDepth, depth);
            maxDepth = Math.max(maxDepth, depth);
        }
    }

    if (!Number.isFinite(minDepth) || !Number.isFinite(maxDepth)) {
        return null;
    }

    return [minDepth, maxDepth];
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
