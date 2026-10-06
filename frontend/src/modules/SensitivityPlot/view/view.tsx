import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useColorSet } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentWarning } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import {
    computeSensitivitiesForResponse,
    type SensitivityResponseDataset,
} from "@modules/_shared/SensitivityProcessing";

import { createSensitivityColorMap } from "../../_shared/sensitivityColors";
import type { Interfaces } from "../interfaces";
import { DisplayComponentType } from "../typesAndEnums";

import SensitivityTable from "./components/sensitivityTable";
import { useResponseChannel } from "./hooks/useResponseChannel";
import { buildSensitivityChartFigure, type SensitivityChartOptions } from "./utils/buildSensitivityChartFigure";
import { SensitivityDataScaler } from "./utils/sensitivityDataScaler";

const CELL_HEADING_HEIGHT_PX = 20;

type ComputedResponse = {
    idString: string;
    title: string;
    sensitivityResponseDataset: SensitivityResponseDataset;
    sensitivityDataScaler: SensitivityDataScaler;
};

export const View = ({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const hideZeroY = viewContext.useSettingsToViewInterfaceValue("hideZeroY");
    const displayComponentType = viewContext.useSettingsToViewInterfaceValue("displayComponentType");
    const referenceSensitivityName = viewContext.useSettingsToViewInterfaceValue("referenceSensitivityName");
    const sensitivitySortBy = viewContext.useSettingsToViewInterfaceValue("sensitivitySortBy");
    const sensitivityScaling = viewContext.useSettingsToViewInterfaceValue("sensitivityScaling");
    const chartOptions: SensitivityChartOptions = {
        showLabels: viewContext.useSettingsToViewInterfaceValue("showLabels"),
        showSensitivityMeanPoints: viewContext.useSettingsToViewInterfaceValue("showSensitivityMeanPoints"),
        showRealizationPoints: viewContext.useSettingsToViewInterfaceValue("showRealizationPoints"),
        colorBy: viewContext.useSettingsToViewInterfaceValue("colorBy"),
    };
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const colorSet = useColorSet(workbenchSettings);

    const responseChannelData = useResponseChannel(viewContext, workbenchSession);

    const sensitivitiesColorMap = createSensitivityColorMap(
        responseChannelData.responses[0]?.channelEnsemble.getSensitivities()?.getSensitivityNames().sort() ?? [],
        colorSet,
    );

    const computedResponses: ComputedResponse[] = [];
    for (const response of responseChannelData.responses) {
        const sensitivities = response.channelEnsemble.getSensitivities();
        if (!referenceSensitivityName || !sensitivities) {
            continue;
        }
        const sensitivityResponseDataset = computeSensitivitiesForResponse(
            sensitivities,
            response.ensemblePerRealResponse,
            referenceSensitivityName,
            sensitivitySortBy,
            hideZeroY,
        );
        computedResponses.push({
            idString: response.idString,
            title: response.title,
            sensitivityResponseDataset,
            sensitivityDataScaler: new SensitivityDataScaler(
                sensitivityScaling,
                sensitivityResponseDataset.referenceAverage,
            ),
        });
    }

    let instanceTitle = "Sensitivity chart";
    if (computedResponses.length === 1) {
        const responseName = computedResponses[0].sensitivityResponseDataset.responseName;
        if (displayComponentType === DisplayComponentType.SENSITIVITY_CHART) {
            instanceTitle = `Sensitivity chart for ${responseName}`;
        } else if (displayComponentType === DisplayComponentType.SENSITIVITY_TABLE) {
            instanceTitle = `Sensitivity table for ${responseName}`;
        }
    } else if (computedResponses.length > 1) {
        if (displayComponentType === DisplayComponentType.SENSITIVITY_CHART) {
            instanceTitle = "Sensitivity charts";
        } else if (displayComponentType === DisplayComponentType.SENSITIVITY_TABLE) {
            instanceTitle = "Sensitivity tables";
        }
    }
    viewContext.setInstanceTitle(instanceTitle);

    function makePlot(response: ComputedResponse, width: number, height: number): React.ReactNode {
        const chartFigure = buildSensitivityChartFigure(
            width,
            height,
            sensitivitiesColorMap,
            response.sensitivityResponseDataset,
            response.sensitivityDataScaler,
            chartOptions,
        );
        return <Plot layout={chartFigure.makePlotLayout()} data={chartFigure.makePlotData()} />;
    }

    function makeChartContent(): React.ReactNode {
        if (computedResponses.length === 1) {
            return makePlot(computedResponses[0], wrapperDivSize.width, wrapperDivSize.height);
        }

        const numCols = Math.floor(Math.sqrt(computedResponses.length));
        const numRows = Math.ceil(computedResponses.length / numCols);
        const cellWidth = Math.floor(wrapperDivSize.width / numCols);
        const plotHeight = Math.max(0, Math.floor(wrapperDivSize.height / numRows) - CELL_HEADING_HEIGHT_PX);

        return (
            <div
                className="grid h-full w-full"
                style={{
                    gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
                }}
            >
                {computedResponses.map((response) => (
                    <div key={response.idString} className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                        <div
                            className="text-body-sm font-bolder truncate text-center"
                            style={{ height: CELL_HEADING_HEIGHT_PX }}
                            title={response.title}
                        >
                            {response.title}
                        </div>
                        {makePlot(response, cellWidth, plotHeight)}
                    </div>
                ))}
            </div>
        );
    }

    function makeViewContent(): React.ReactNode {
        if (responseChannelData.warningContent) {
            return responseChannelData.warningContent;
        }
        if (computedResponses.length === 0) {
            return <ContentWarning>No sensitivities available</ContentWarning>;
        }

        if (displayComponentType === DisplayComponentType.SENSITIVITY_CHART) {
            return makeChartContent();
        }

        if (displayComponentType === DisplayComponentType.SENSITIVITY_TABLE) {
            return (
                <div className="text-body-sm">
                    <SensitivityTable entries={computedResponses} />
                </div>
            );
        }

        return null;
    }

    return (
        <div className="h-full w-full" ref={wrapperDivRef}>
            {makeViewContent()}
        </div>
    );
};
