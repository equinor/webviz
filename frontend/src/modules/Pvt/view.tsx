import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { Interfaces } from "./interfaces";
import { PvtDataAccessor } from "./utils/PvtDataAccessor";
import { PvtPlotBuilder } from "./utils/PvtPlotBuilder";

export function View({ viewContext, workbenchSettings, workbenchSession }: ModuleViewProps<Interfaces>) {
    const colorSet = workbenchSettings.useColorSet();
    const statusWriter = useViewStatusWriter(viewContext);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const selectedEnsembleIdents = viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdents");
    const selectedPvtNums = viewContext.useSettingsToViewInterfaceValue("selectedPvtNums");
    const selectedPhase = viewContext.useSettingsToViewInterfaceValue("selectedPhase");
    const selectedColorBy = viewContext.useSettingsToViewInterfaceValue("selectedColorBy");
    const selectedPlots = viewContext.useSettingsToViewInterfaceValue("selectedDependentVariables");
    const pvtDataQueries = viewContext.useSettingsToViewInterfaceValue("pvtDataQueries");

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    statusWriter.setLoading(pvtDataQueries.isFetching);

    if (pvtDataQueries.allQueriesFailed) {
        for (const error of pvtDataQueries.errors) {
            const helper = ApiErrorHelper.fromError(error);
            if (helper?.hasError()) {
                statusWriter.addError(helper.makeStatusMessage());
            }
        }
    } else if (pvtDataQueries.someQueriesFailed) {
        statusWriter.addWarning("Could not load PVT data for some realizations.");
        for (const error of pvtDataQueries.errors) {
            const helper = ApiErrorHelper.fromError(error);
            if (helper?.hasError()) {
                statusWriter.addError(helper.makeFullErrorMessage());
            }
        }
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

        const selectedEnsembles: Ensemble[] = [];
        for (const ensembleIdent of selectedEnsembleIdents) {
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                selectedEnsembles.push(ensemble);
            }
        }

        function makeEnsembleDisplayName(ensembleIdent: EnsembleIdent): string {
            return makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles);
        }

        const pvtPlotBuilder = new PvtPlotBuilder(
            new PvtDataAccessor(pvtDataQueries.tableCollections),
            makeEnsembleDisplayName
        );
        pvtPlotBuilder.makeLayout(selectedPhase, selectedPlots, wrapperDivSize);
        pvtPlotBuilder.makeTraces(selectedPlots, selectedPvtNums, selectedPhase, selectedColorBy, colorSet);

        return pvtPlotBuilder.makePlot();
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
}
