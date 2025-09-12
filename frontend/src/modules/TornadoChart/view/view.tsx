import React from "react";

import { Input } from "@mui/icons-material";
import { useSetAtom } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { computeSensitivitiesForResponse } from "@modules/_shared/SensitivityProcessing/sensitivityProcessing";
import type { SensitivityResponseDataset } from "@modules/_shared/SensitivityProcessing/types";

import { createSensitivityColorMap } from "../../_shared/sensitivityColors";
import type { Interfaces } from "../interfaces";
import { DisplayComponentType } from "../typesAndEnums";

import { selectedSensitivityAtom } from "./atoms/baseAtoms";
import SensitivityTable from "./components/sensitivityTable";
import { useResponseChannel } from "./hooks/useResponseChannel";
import { useSensitivityChart } from "./hooks/useSensitivityChart";
import { SensitivityDataScaler } from "./utils/sensitivityDataScaler";

export const View = ({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const setSelectedSensitivity = useSetAtom(selectedSensitivityAtom);
    const hideZeroY = viewContext.useSettingsToViewInterfaceValue("hideZeroY");
    const displayComponentType = viewContext.useSettingsToViewInterfaceValue("displayComponentType");
    const referenceSensitivityName = viewContext.useSettingsToViewInterfaceValue("referenceSensitivityName");
    const barSortOrder = viewContext.useSettingsToViewInterfaceValue("barSortOrder");
    const xAxisBarScaling = viewContext.useSettingsToViewInterfaceValue("xAxisBarScaling");
    const colorBy = viewContext.useSettingsToViewInterfaceValue("colorBy");
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const colorSet = workbenchSettings.useColorSet();

    const responseChannelData = useResponseChannel(viewContext, workbenchSession);

    const sensitivities = responseChannelData.channelEnsemble?.getSensitivities();

    const sensitivitiesColorMap = createSensitivityColorMap(
        sensitivities?.getSensitivityNames().sort() ?? [],
        colorSet,
    );

    let computedSensitivityResponseDataset: SensitivityResponseDataset | null = null;
    if (referenceSensitivityName && sensitivities && responseChannelData.ensembleResponse) {
        computedSensitivityResponseDataset = computeSensitivitiesForResponse(
            sensitivities,
            responseChannelData.ensembleResponse,
            referenceSensitivityName,
            barSortOrder,
            hideZeroY,
        );
    }
    const sensitivityDataScaler = new SensitivityDataScaler(
        xAxisBarScaling,
        computedSensitivityResponseDataset ? computedSensitivityResponseDataset.referenceAverage : 0,
    );
    const sensitivityChartBuilder = useSensitivityChart(
        viewContext,
        wrapperDivSize.width,
        wrapperDivSize.height,
        sensitivitiesColorMap,
        computedSensitivityResponseDataset,
        sensitivityDataScaler,
        colorBy,
    );

    let instanceTitle = "Tornado chart";
    if (computedSensitivityResponseDataset) {
        if (displayComponentType === DisplayComponentType.TornadoChart) {
            instanceTitle = `Tornado chart for ${computedSensitivityResponseDataset.responseName}`;
        } else if (displayComponentType === DisplayComponentType.Table) {
            instanceTitle = `Sensitivity table for ${computedSensitivityResponseDataset.responseName}`;
        }
    }
    viewContext.setInstanceTitle(instanceTitle);

    if (!responseChannelData.hasChannel) {
        return (
            <div className="w-full h-full" ref={wrapperDivRef}>
                <ContentInfo>
                    <span>
                        Data channel required for use. Add a main module to the workbench and use the data channels icon{" "}
                        <Input />
                    </span>
                    <Tag label="Response" />
                </ContentInfo>
            </div>
        );
    }

    if (!responseChannelData.hasChannelContents) {
        return (
            <div className="w-full h-full" ref={wrapperDivRef}>
                <ContentInfo>No data received on channel {responseChannelData.displayName ?? "Unknown"}</ContentInfo>
            </div>
        );
    }

    if (!computedSensitivityResponseDataset) {
        return (
            <div className="w-full h-full" ref={wrapperDivRef}>
                <ContentInfo>No sensitivities available</ContentInfo>
            </div>
        );
    }

    if (displayComponentType === DisplayComponentType.TornadoChart) {
        if (!sensitivityChartBuilder) {
            return (
                <div className="w-full h-full" ref={wrapperDivRef}>
                    <ContentInfo>No chart data available</ContentInfo>
                </div>
            );
        }
        return (
            <div className="w-full h-full" ref={wrapperDivRef}>
                <Plot layout={sensitivityChartBuilder.makePlotLayout()} data={sensitivityChartBuilder.makePlotData()} />
            </div>
        );
    }

    if (displayComponentType === DisplayComponentType.Table) {
        return (
            <div className="w-full h-full" ref={wrapperDivRef}>
                <div className="text-sm">
                    <SensitivityTable
                        sensitivityResponseDataset={computedSensitivityResponseDataset}
                        sensitivityDataScaler={sensitivityDataScaler}
                        onSelectedSensitivity={setSelectedSensitivity}
                    />
                </div>
            </div>
        );
    }

    return <div className="w-full h-full" ref={wrapperDivRef} />;
};
