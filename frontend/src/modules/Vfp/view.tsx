import React from "react";
import Plot from "react-plotly.js";

import { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { Interface, State } from "./state";
import { VfpParam } from "./types";
import { VfpDataAccessor } from "./utils/VfpDataAccessor";
import { VfpPlotBuilder } from "./utils/VfpPlotBuilder";

export function View({ viewContext, workbenchSettings }: ModuleViewProps<State, Interface>) {
    const colorSet = workbenchSettings.useColorSet();

    const vfpTableName = viewContext.useSettingsToViewInterfaceValue("vfpTableName");
    const vfpTable = viewContext.useSettingsToViewInterfaceValue("vfpTable");
    const selectedThpIndices = viewContext.useSettingsToViewInterfaceValue("selectedThpIndices");
    const selectedWfrIndices = viewContext.useSettingsToViewInterfaceValue("selectedWfrIndices");
    const selectedGfrIndices = viewContext.useSettingsToViewInterfaceValue("selectedGfrIndices");
    const selectedAlqIndices = viewContext.useSettingsToViewInterfaceValue("selectedAlqIndices");

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    let content = null;
    if (vfpTable === undefined) {
        content = <div className="w-full h-full flex justify-center items-center">VFP table not available.</div>;
    } else {
        const vfpPlotBuilder = new VfpPlotBuilder(new VfpDataAccessor(vfpTable));

        const layout = vfpPlotBuilder.makeLayout(wrapperDivSize);
        const data = vfpPlotBuilder.makeTraces(
            selectedThpIndices,
            selectedWfrIndices,
            selectedGfrIndices,
            selectedAlqIndices,
            VfpParam.THP,
            colorSet
        );
        content = <Plot layout={layout} data={data} />;
    }
    return (
        <div ref={wrapperDivRef} className="w-full h-full">
            {content}
        </div>
    );
}
