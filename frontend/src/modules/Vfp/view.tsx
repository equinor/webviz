import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { Interface, State } from "./state";
import { VfpProdTable_api } from "@api";
import { VfpPlotBuilder } from "./utils/VfpPlotBuilder";

export function View({ viewContext }: ModuleViewProps<State, Interface>) {

    const vfpTableName = viewContext.useSettingsToViewInterfaceValue("vfpTableName");
    const vfpTable: VfpProdTable_api = viewContext.useSettingsToViewInterfaceValue("vfpTable")
    const selectedThpIndices = viewContext.useSettingsToViewInterfaceValue("selectedThpIndices")
    const selectedWfrIndices = viewContext.useSettingsToViewInterfaceValue("selectedWfrIndices")
    const selectedGfrIndices = viewContext.useSettingsToViewInterfaceValue("selectedGfrIndices")
    const selectedAlqIndices = viewContext.useSettingsToViewInterfaceValue("selectedAlqIndices")

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const vfpPlotBuilder = new VfpPlotBuilder(vfpTable);

    vfpPlotBuilder.makeLayout(wrapperDivSize)
    //vfpPlotBuilder.makeTraces(selectedThpIndices, selectedWfrIndices, selectedGfrIndices, selectedAlqIndices)

    return vfpPlotBuilder.makePlot()
}