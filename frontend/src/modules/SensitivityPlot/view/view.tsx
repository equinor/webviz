import React from "react";

import { Input } from "@mui/icons-material";

import type { ModuleViewProps } from "@framework/Module";
import { useColorSet } from "@framework/WorkbenchSettings";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { computeSensitivitiesForResponse } from "@modules/_shared/SensitivityProcessing/sensitivityProcessing";
import type { SensitivityResponseDataset } from "@modules/_shared/SensitivityProcessing/types";

import { createSensitivityColorMap } from "../../_shared/sensitivityColors";
import type { Interfaces } from "../interfaces";
import { DisplayComponentType } from "../typesAndEnums";

import SensitivityTable from "./components/sensitivityTable";
import { useResponseChannel } from "./hooks/useResponseChannel";
import { useSensitivityChart } from "./hooks/useSensitivityChart";
import { SensitivityDataScaler } from "./utils/sensitivityDataScaler";

export const View = ({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const hideZeroY = viewContext.useSettingsToViewInterfaceValue("hideZeroY");
    const displayComponentType = viewContext.useSettingsToViewInterfaceValue("displayComponentType");
    const referenceSensitivityName = viewContext.useSettingsToViewInterfaceValue("referenceSensitivityName");
    const sensitivitySortBy = viewContext.useSettingsToViewInterfaceValue("sensitivitySortBy");
    const sensitivityScaling = viewContext.useSettingsToViewInterfaceValue("sensitivityScaling");
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const colorSet = useColorSet(workbenchSettings);

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
            sensitivitySortBy,
            hideZeroY,
        );
    }
    const sensitivityDataScaler = new SensitivityDataScaler(
        sensitivityScaling,
        computedSensitivityResponseDataset ? computedSensitivityResponseDataset.referenceAverage : 0,
    );
    const sensitivityChartBuilder = useSensitivityChart(
        viewContext,
        wrapperDivSize.width,
        wrapperDivSize.height,
        sensitivitiesColorMap,
        computedSensitivityResponseDataset,
        sensitivityDataScaler,
    );

    let instanceTitle = "Sensitivity chart";
    if (computedSensitivityResponseDataset) {
        if (displayComponentType === DisplayComponentType.SENSITIVITY_CHART) {
            instanceTitle = `Sensitivity chart for ${computedSensitivityResponseDataset.responseName}`;
        } else if (displayComponentType === DisplayComponentType.SENSITIVITY_TABLE) {
            instanceTitle = `Sensitivity table for ${computedSensitivityResponseDataset.responseName}`;
        }
    }
    viewContext.setInstanceTitle(instanceTitle);

    function makeViewContent(): React.ReactNode {
        if (!responseChannelData.hasChannel) {
            return (
                <ContentInfo>
                    <span>
                        Data channel required for use. Add a main module to the workbench and use the data channels icon{" "}
                        <Input />
                    </span>
                    <Tag label="Response" />
                </ContentInfo>
            );
        }

        if (!responseChannelData.hasChannelContents) {
            return (
                <ContentInfo>No data received on channel {responseChannelData.displayName ?? "Unknown"}</ContentInfo>
            );
        }

        if (!computedSensitivityResponseDataset) {
            return <ContentInfo>No sensitivities available</ContentInfo>;
        }

        if (displayComponentType === DisplayComponentType.SENSITIVITY_CHART) {
            if (!sensitivityChartBuilder) {
                return <ContentInfo>No chart data available</ContentInfo>;
            }
            return (
                <Plot layout={sensitivityChartBuilder.makePlotLayout()} data={sensitivityChartBuilder.makePlotData()} />
            );
        }

        if (displayComponentType === DisplayComponentType.SENSITIVITY_TABLE) {
            return (
                <div className="text-sm">
                    <SensitivityTable
                        sensitivityResponseDataset={computedSensitivityResponseDataset}
                        sensitivityDataScaler={sensitivityDataScaler}
                    />
                </div>
            );
        }

        return null;
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeViewContent()}
        </div>
    );
};
