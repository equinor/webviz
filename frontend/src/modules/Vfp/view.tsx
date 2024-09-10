import React from "react";
import Plot from "react-plotly.js";

import { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";

import { Interfaces } from "./interfaces";
import { VfpDataAccessor } from "./utils/VfpDataAccessor";
import { VfpPlotBuilder } from "./utils/VfpPlotBuilder";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";


export function View({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>) {
    const colorScale = workbenchSettings.useContinuousColorScale({gradientType: ColorScaleGradientType.Sequential})

    const vfpDataQuery = viewContext.useSettingsToViewInterfaceValue("vfpDataQuery");
    const selectedThpIndices = viewContext.useSettingsToViewInterfaceValue("selectedThpIndices");
    const selectedWfrIndices = viewContext.useSettingsToViewInterfaceValue("selectedWfrIndices");
    const selectedGfrIndices = viewContext.useSettingsToViewInterfaceValue("selectedGfrIndices");
    const selectedAlqIndices = viewContext.useSettingsToViewInterfaceValue("selectedAlqIndices");
    const selectedPressureOption = viewContext.useSettingsToViewInterfaceValue("selectedPressureOption")
    const selectedColorBy = viewContext.useSettingsToViewInterfaceValue("selectedColorBy")

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(viewContext);
    const statusError = usePropagateApiErrorToStatusWriter(vfpDataQuery, statusWriter);

    let content = null;

    if (vfpDataQuery.isFetching) {
        content = <ContentMessage type={ContentMessageType.INFO}>
                <CircularProgress />
            </ContentMessage>
    } else if (statusError !== null) {
        content = <div className="w-full h-full flex justify-center items-center">{statusError}</div>;
    } else if (vfpDataQuery.isError  || vfpDataQuery.data === undefined) {
        content = <div className="w-full h-full flex justify-center items-center">Could not load VFP data</div>;
    } else {
        const vfpTable = vfpDataQuery.data
        const vfpPlotBuilder = new VfpPlotBuilder(new VfpDataAccessor(vfpTable), colorScale);

        const layout = vfpPlotBuilder.makeLayout(wrapperDivSize, selectedPressureOption);
        const data = vfpPlotBuilder.makeTraces(
            selectedThpIndices,
            selectedWfrIndices,
            selectedGfrIndices,
            selectedAlqIndices,
            selectedPressureOption,
            selectedColorBy,
        );

        content = <Plot layout={layout} data={data} />;
    }
    return (
        <div ref={wrapperDivRef} className="w-full h-full">
            {content}
        </div>
    );
}
