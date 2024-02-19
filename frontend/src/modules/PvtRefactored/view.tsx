import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";

import { usePvtDataQueries } from "./queryHooks";
import { Interface, State } from "./state";
import { PvtDataAccessor } from "./utils/PvtDataAccessor";
import { PvtPlotBuilder } from "./utils/PvtPlotBuilder";

//-----------------------------------------------------------------------------------------------------------

export function View({ viewContext, workbenchSettings }: ModuleViewProps<State, Interface>) {
    const colorSet = workbenchSettings.useColorSet();

    const statusWriter = useViewStatusWriter(viewContext);

    const selectedEnsembleIdents = viewContext.useInterfaceValue("selectedEnsembleIdents");
    const selectedRealizations = viewContext.useInterfaceValue("selectedRealizations");
    const selectedPvtNums = viewContext.useInterfaceValue("selectedPvtNums");
    const selectedPhase = viewContext.useInterfaceValue("selectedPhase");
    const selectedColorBy = viewContext.useInterfaceValue("selectedColorBy");
    const selectedPlots = viewContext.useInterfaceValue("selectedPlots");

    const pvtDataQueries = usePvtDataQueries(selectedEnsembleIdents, selectedRealizations);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    statusWriter.setLoading(pvtDataQueries.isFetching);

    if (pvtDataQueries.allQueriesFailed) {
        statusWriter.addError("Failed to load data.");
    } else if (pvtDataQueries.someQueriesFailed) {
        statusWriter.addWarning("Could not load PVT data for some realizations.");
    }

    function makeContent() {
        if (pvtDataQueries.isFetching) {
            return (
                <ContentMessage type={ContentMessageType.INFO}>
                    <CircularProgress />
                </ContentMessage>
            );
        }
        if (pvtDataQueries.tableCollections.length === 0) {
            return <ContentMessage type={ContentMessageType.INFO}>No data loaded yet.</ContentMessage>;
        }

        if (pvtDataQueries.allQueriesFailed) {
            return <ContentMessage type={ContentMessageType.ERROR}>Failed to load data.</ContentMessage>;
        }

        if (selectedPlots.length === 0) {
            return <ContentMessage type={ContentMessageType.INFO}>No plots selected.</ContentMessage>;
        }

        const pvtPlotBuilder = new PvtPlotBuilder(new PvtDataAccessor(pvtDataQueries.tableCollections));
        pvtPlotBuilder.makeLayout(selectedPlots, wrapperDivSize);
        pvtPlotBuilder.makeTraces(selectedPlots, selectedPvtNums, selectedPhase, selectedColorBy, colorSet);

        return pvtPlotBuilder.makePlot();
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
}
