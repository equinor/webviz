import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import type { Interfaces } from "./interfaces";
import { PvtPlotBuilder } from "./utils/PvtPlotBuilder";

export function View({ viewContext, workbenchSettings, workbenchSession }: ModuleViewProps<Interfaces>) {
    const colorSet = useColorSet(workbenchSettings);
    const statusWriter = useViewStatusWriter(viewContext);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const selectedEnsembleIdents = viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdents");
    const selectedPvtNums = viewContext.useSettingsToViewInterfaceValue("selectedPvtNums");
    const selectedPhase = viewContext.useSettingsToViewInterfaceValue("selectedPhase");
    const selectedColorBy = viewContext.useSettingsToViewInterfaceValue("selectedColorBy");
    const selectedPlots = viewContext.useSettingsToViewInterfaceValue("selectedDependentVariables");
    const { pvtDataAccessor, isFetching, allQueriesFailed } =
        viewContext.useSettingsToViewInterfaceValue("pvtDataAccessorWithStatus");

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    statusWriter.setLoading(isFetching);

    function makeContent() {
        if (isFetching) {
            return (
                <ContentMessage type={ContentMessageType.INFO}>
                    <CircularProgress />
                </ContentMessage>
            );
        }

        if (allQueriesFailed) {
            return <ContentMessage type={ContentMessageType.ERROR}>Failed to load data.</ContentMessage>;
        }

        if (!pvtDataAccessor) {
            return <ContentMessage type={ContentMessageType.INFO}>No data loaded yet.</ContentMessage>;
        }

        if (selectedPlots.length === 0) {
            return <ContentMessage type={ContentMessageType.INFO}>No plots selected.</ContentMessage>;
        }

        const selectedEnsembles: RegularEnsemble[] = [];
        for (const ensembleIdent of selectedEnsembleIdents) {
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                selectedEnsembles.push(ensemble);
            }
        }

        function makeEnsembleDisplayName(ensembleIdent: RegularEnsembleIdent): string {
            return makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles);
        }

        const pvtPlotBuilder = new PvtPlotBuilder(pvtDataAccessor, makeEnsembleDisplayName);
        pvtPlotBuilder.makeLayout(selectedPhase, selectedPlots, wrapperDivSize);
        pvtPlotBuilder.makeTraces(selectedPlots, selectedPvtNums, selectedPhase, selectedColorBy, colorSet);

        return <Plot layout={pvtPlotBuilder.makePlotLayout()} data={pvtPlotBuilder.makePlotData()} />;
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
}
