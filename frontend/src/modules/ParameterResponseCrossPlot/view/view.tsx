import React from "react";

import { Input, Warning } from "@mui/icons-material";

import { KeyKind } from "@framework/DataChannelTypes";
import type { Parameter } from "@framework/EnsembleParameters";
import { ParameterIdent } from "@framework/EnsembleParameters";
import type { ModuleViewProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { Size2D } from "@lib/utils/geometry";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { ContentWarning } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import type { scatterPlotParameterResponseData } from "./scatterPlotParameterResponseFigure";
import { ScatterPlotParameterResponseFigure } from "./scatterPlotParameterResponseFigure";

const MAX_NUM_PLOTS = 12;

function MaxNumberPlotsExceededMessage() {
    return (
        <ContentWarning>
            <Warning fontSize="large" className="mb-2" />
            Too many plots to display. Due to performance limitations, the number of plots is limited to {MAX_NUM_PLOTS}
            .
        </ContentWarning>
    );
}

export function View({ viewContext, workbenchSession }: ModuleViewProps<Interfaces>) {
    const [content, setContent] = React.useState<React.ReactNode>(null);
    const [revNumberResponse, setRevNumberResponse] = React.useState<number>(0);
    const [prevPlotType, setPrevPlotType] = React.useState<PlotType | null>(null);
    const [prevParameterIdentString, setPrevParameterIdentString] = React.useState<string | null>(null);
    const [prevSize, setPrevSize] = React.useState<Size2D | null>(null);
    const [prevShowTrendline, setPrevShowTrendline] = React.useState<boolean>(false);

    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const parameterIdentString = viewContext.useSettingsToViewInterfaceValue("parameterIdentString");
    const showTrendline = viewContext.useSettingsToViewInterfaceValue("showTrendline");

    const ensembleSet = workbenchSession.getEnsembleSet();
    const statusWriter = useViewStatusWriter(viewContext);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const receiverResponse = viewContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    statusWriter.setLoading(receiverResponse.isPending);

    if (
        receiverResponse.revisionNumber !== revNumberResponse ||
        plotType !== prevPlotType ||
        parameterIdentString !== prevParameterIdentString ||
        prevShowTrendline !== showTrendline ||
        wrapperDivSize !== prevSize
    ) {
        setRevNumberResponse(receiverResponse.revisionNumber);
        setPrevParameterIdentString(parameterIdentString);
        setPrevPlotType(plotType);
        setPrevShowTrendline(showTrendline);

        setPrevSize(wrapperDivSize);

        if (!receiverResponse.channel) {
            setContent(
                <ContentInfo>
                    <span>
                        Data channel required for use. Add a main module to the workbench and use the data channels icon{" "}
                        <Input fontSize="small" />
                    </span>
                    <Tag label="Response" />
                </ContentInfo>,
            );
            return;
        }

        if (receiverResponse.channel.contents.length === 0) {
            setContent(
                <ContentInfo>
                    No data on <Tag label={receiverResponse.displayName} />
                </ContentInfo>,
            );
            return;
        }

        const numContents = receiverResponse.channel.contents.length;
        if (numContents > MAX_NUM_PLOTS) {
            setContent(<MaxNumberPlotsExceededMessage />);
            return;
        }
        if (!parameterIdentString) {
            setContent(<ContentInfo>Parameter not found. Please select a parameter to plot.</ContentInfo>);
            return;
        }
        const parameterIdent = ParameterIdent.fromString(parameterIdentString);

        if (plotType === PlotType.ParameterResponseCrossPlot) {
            // Create a lookup map for ensemble parameters
            const ensembleParametersMap = new Map<string, Parameter>();
            receiverResponse.channel.contents.forEach((content) => {
                const ensembleIdentString = content.metaData.ensembleIdentString;
                const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);
                if (ensemble && ensemble instanceof RegularEnsemble) {
                    const parameter = ensemble.getParameters().findParameter(parameterIdent);
                    if (!parameter) {
                        return;
                    }
                    ensembleParametersMap.set(ensembleIdentString, parameter);
                }
            });

            if (ensembleParametersMap.size === 0) {
                setContent(<ContentInfo>Parameter not found. Click here and select a parameter to plot.</ContentInfo>);
                return;
            }

            const numCols = Math.floor(Math.sqrt(numContents));
            const numRows = Math.ceil(numContents / numCols);

            const figure = new ScatterPlotParameterResponseFigure(wrapperDivSize, numCols, numRows, showTrendline);

            let cellIndex = 0;
            for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    if (cellIndex >= numContents) {
                        break;
                    }

                    const responseChannelData = receiverResponse.channel.contents[cellIndex];

                    const parameterData = ensembleParametersMap.get(responseChannelData.metaData.ensembleIdentString);
                    if (!parameterData) {
                        return;
                    }

                    const responseValueMap = new Map<number, number>(
                        responseChannelData.dataArray.map((dataPoint) => [
                            dataPoint.key as number,
                            dataPoint.value as number,
                        ]),
                    );

                    const responseValues: number[] = [];
                    const parameterValues: number[] = [];
                    const realizationValues: number[] = [];

                    parameterData.realizations.forEach((realization, index) => {
                        const parameterValue = parameterData.values[index];
                        const responseValue = responseValueMap.get(realization);

                        if (responseValue !== undefined && typeof parameterValue === "number") {
                            responseValues.push(responseValue);
                            parameterValues.push(parameterValue);
                            realizationValues.push(realization);
                        }
                    });

                    const responseName = responseChannelData.displayName;
                    const parameterName = parameterData.name;

                    const scatterPlotData: scatterPlotParameterResponseData = {
                        responseValues,
                        parameterValues,
                        realizationValues,
                        parameterName,
                        responseName,
                    };

                    const channelTitle = `${parameterIdent.name} / <b>${responseChannelData.metaData.displayString}`;

                    figure.addSubplot(scatterPlotData, rowIndex + 1, colIndex + 1, cellIndex + 1, channelTitle);

                    cellIndex++;
                }
            }

            setContent(<Plot data={figure.buildData()} layout={figure.buildLayout()} />);
            return;
        }
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {content}
        </div>
    );
}
