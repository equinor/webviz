import React from "react";

import { useAtom } from "jotai";
import type { Config } from "plotly.js";

import type { ModuleViewProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import type { Interfaces } from "../interfaces";
import { dataChannelDepthAtom } from "../settings/atoms/baseAtoms";

import { DepthLineOverlay } from "./components/DepthLineOverlay";
import { usePlotOverlay } from "./hooks/usePlotOverlay";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { useRftPlotBuilder } from "./hooks/useRftPlotBuilder";
import { makeRftPlotTitle } from "./utils/createTitle";
import { makeDepthRange } from "./utils/plotData";

const PLOT_CONFIG: Partial<Config> = { scrollZoom: true };

export function View({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<Interfaces>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementBoundingRect(wrapperDivRef);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const colorSet = useColorSet(workbenchSettings);

    const wellName = viewContext.useSettingsToViewInterfaceValue("wellName");
    const responseName = viewContext.useSettingsToViewInterfaceValue("responseName");
    const timestampUtcMs = viewContext.useSettingsToViewInterfaceValue("timestampUtcMs");
    const visualizationSettings = viewContext.useSettingsToViewInterfaceValue("visualizationSettings");
    const showDepthLine = viewContext.useSettingsToViewInterfaceValue("showDepthLine");
    const dataAccessor = viewContext.useSettingsToViewInterfaceValue("dataAccessor");
    const observationsData = viewContext.useSettingsToViewInterfaceValue("observationsData");
    const isFetching = viewContext.useSettingsToViewInterfaceValue("isFetching");

    const statusWriter = useViewStatusWriter(viewContext);
    statusWriter.setLoading(isFetching);

    const [dataChannelDepth, setDataChannelDepth] = useAtom(dataChannelDepthAtom);
    const depthLineOverlay = usePlotOverlay();

    const instanceTitle = makeRftPlotTitle(wellName, responseName, timestampUtcMs);

    const entries = React.useMemo(() => dataAccessor?.getEntries() ?? [], [dataAccessor]);
    const selectedEnsembles = React.useMemo(
        () =>
            entries.flatMap((entry) => {
                const ensemble = ensembleSet.findEnsemble(entry.ensembleIdent);
                return ensemble ? [ensemble] : [];
            }),
        [entries, ensembleSet],
    );

    const depthRange = makeDepthRange(entries);
    // Derive the applied depth from the persisted user value. The atom holds the user's intent and is
    // left untouched, but the value actually used for the line and the data channel is clamped into the
    // current data's depth range. This keeps the line on-plot (and the published value meaningful) when
    // the underlying data changes, e.g. switching to a well whose depth range excludes the stored depth.
    const effectiveDepth = depthRange
        ? Math.min(Math.max(dataChannelDepth ?? (depthRange[0] + depthRange[1]) / 2, depthRange[0]), depthRange[1])
        : dataChannelDepth;

    const plotContent = useRftPlotBuilder({
        dataAccessor,
        selectedEnsembles,
        colorSet,
        wellName,
        responseName,
        timestampUtcMs,
        visualizationSettings,
        observationsData,
        size: wrapperDivSize,
    });

    usePublishToDataChannels(viewContext, {
        entries,
        responseName,
        dataChannelDepth: effectiveDepth,
        timestampUtcMs,
        makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent) =>
            makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles),
        makeEnsembleColor: (ensembleIdent: RegularEnsembleIdent) => {
            const ensemble = selectedEnsembles.find(
                (candidate) => candidate.getIdent().toString() === ensembleIdent.toString(),
            );
            return ensemble?.getColor() ?? colorSet.getFirstColor();
        },
        metaDependencies: [selectedEnsembles, colorSet],
        isFetching,
    });

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

        if (isFetching) {
            return (
                <ContentMessage type={ContentMessageType.INFO}>
                    <CircularProgress />
                </ContentMessage>
            );
        }

        if (!plotContent) {
            return <ContentMessage type={ContentMessageType.INFO}>No RFT data loaded.</ContentMessage>;
        }

        return (
            <Plot
                data={plotContent.plotData}
                layout={plotContent.layout}
                config={PLOT_CONFIG}
                onInitialized={depthLineOverlay.handlePlotRendered}
                onUpdate={depthLineOverlay.handlePlotRendered}
            />
        );
    }

    return (
        <div className="w-full h-full relative overflow-hidden" ref={wrapperDivRef}>
            <div style={{ height: wrapperDivSize.height }}>{makeContent()}</div>
            {showDepthLine && (
                <DepthLineOverlay
                    graphDiv={depthLineOverlay.graphDiv}
                    depth={effectiveDepth}
                    depthRange={depthRange}
                    onChange={setDataChannelDepth}
                    revision={depthLineOverlay.revision}
                />
            )}
        </div>
    );
}
