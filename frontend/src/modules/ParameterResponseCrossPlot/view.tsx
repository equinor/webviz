import React from "react";

import { Input, Warning } from "@mui/icons-material";
import type { Layout, PlotData, PlotMouseEvent } from "plotly.js";

import { KeyKind } from "@framework/DataChannelTypes";
import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";

import type { Size2D } from "@lib/utils/geometry";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { ContentWarning } from "@modules/_shared/components/ContentMessage/contentMessage";
import { makeSubplots } from "@modules/_shared/Figure";

import type { Interfaces } from "./interfaces";
import { PlotType } from "./typesAndEnums";

import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { RegularEnsemble } from "@framework/RegularEnsemble";

const MAX_NUM_PLOTS = 12;

const MaxNumberPlotsExceededMessage: React.FC = () => {
    return (
        <ContentWarning>
            <Warning fontSize="large" className="mb-2" />
            Too many plots to display. Due to performance limitations, the number of plots is limited to {MAX_NUM_PLOTS}
            .
        </ContentWarning>
    );
};

MaxNumberPlotsExceededMessage.displayName = "MaxNumberPlotsExceededMessage";

export const View = ({ viewContext, workbenchSession }: ModuleViewProps<Interfaces>) => {
    const [isPending, startTransition] = React.useTransition();
    const [content, setContent] = React.useState<React.ReactNode>(null);
    const [revNumberResponse, setRevNumberResponse] = React.useState<number>(0);
    const [prevPlotType, setPrevPlotType] = React.useState<PlotType | null>(null);
    const [prevParameterIdentString, setPrevParameterIdentString] = React.useState<string | null>(null);

    const [prevSize, setPrevSize] = React.useState<Size2D | null>(null);

    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const parameterIdentString = viewContext.useSettingsToViewInterfaceValue("parameterIdentString");
    console.log("parameterIdentString", parameterIdentString);
    const ensembleSet = workbenchSession.getEnsembleSet();

    const statusWriter = useViewStatusWriter(viewContext);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const receiverResponse = viewContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    statusWriter.setLoading(isPending || receiverResponse.isPending);

    if (
        receiverResponse.revisionNumber !== revNumberResponse ||
        plotType !== prevPlotType ||
        parameterIdentString !== prevParameterIdentString ||
        wrapperDivSize !== prevSize
    ) {
        setRevNumberResponse(receiverResponse.revisionNumber);
        setPrevParameterIdentString(parameterIdentString);
        setPrevPlotType(plotType);

        setPrevSize(wrapperDivSize);

        if (!receiverResponse.channel) {
            console.log("No channel");
            setContent(
                <ContentInfo>
                    <span>
                        Data channel required for use. Add a main module to the workbench and use the data channels icon
                        <Input />
                    </span>
                    <Tag label="Response" />
                </ContentInfo>,
            );
            return;
        }

        if (receiverResponse.channel.contents.length === 0) {
            console.log("No contents");
            setContent(
                <ContentInfo>
                    No data on <Tag label={receiverResponse.displayName} />
                </ContentInfo>,
            );
            return;
        }

        if (plotType === PlotType.ParameterResponseCrossPlot) {
            const numContents = receiverResponse.channel.contents.length;
            if (numContents > MAX_NUM_PLOTS) {
                setContent(<MaxNumberPlotsExceededMessage />);
                return;
            }
            const numCols = Math.floor(Math.sqrt(numContents));
            const numRows = Math.ceil(numContents / numCols);

            const figure = makeSubplots({
                numRows,
                numCols,
                width: wrapperDivSize.width,
                height: wrapperDivSize.height,
                sharedXAxes: false,
                sharedYAxes: false,

                horizontalSpacing: 0.2 / numCols,
                margin: {
                    t: 20,
                    r: 20,
                    b: 20,
                    l: 40,
                },
                showGrid: true,
            });
            figure.updateLayout({
                showlegend: false,
            });
            // Create a map with parameters for each ensemble
            if (!parameterIdentString) {
                return;
            }
            const parameterIdent = ParameterIdent.fromString(parameterIdentString ?? "");

            if (!parameterIdent) {
                setContent(<ContentInfo>Parameter not found. Please select a parameter to plot.</ContentInfo>);
                return;
            }

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
            // Loop through the contents and plot the correlations
            let cellIndex = 0;
            for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    if (cellIndex >= numContents) {
                        break;
                    }

                    const responseChannelData = receiverResponse.channel.contents[cellIndex];

                    const parameter = ensembleParametersMap.get(responseChannelData.metaData.ensembleIdentString);
                    if (!parameter) {
                        return;
                    }

                    const responseData: ResponseData = {
                        realizations: responseChannelData.dataArray.map((dataPoint) => dataPoint.key as number),
                        values: responseChannelData.dataArray.map((dataPoint) => dataPoint.value as number),
                        displayName: responseChannelData.displayName,
                    };
                    const traces = scatterPlotParameterResponse(responseData, parameter);
                    figure.addTraces(traces, rowIndex + 1, colIndex + 1);

                    const layoutPatch: Partial<Layout> = {
                        [`xaxis${cellIndex + 1}`]: {
                            zeroline: false,
                        },
                        [`yaxis${cellIndex + 1}`]: {
                            zeroline: false,
                        },
                    };
                    figure.updateLayout(layoutPatch);
                    const channelTitle = `${parameterIdent.name} / <b>${responseChannelData.metaData.displayString}`;
                    figure.updateSubplotTitle(`${channelTitle}`, rowIndex + 1, colIndex + 1);
                    cellIndex++;
                }
            }

            setContent(figure.makePlot());
            return;
        }
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {content}
        </div>
    );
};

View.displayName = "View";

type ResponseData = {
    realizations: number[];
    values: number[];
    displayName: string;
};
function scatterPlotParameterResponse(responses: ResponseData, parameter: Parameter, showTrendline = true) {
    const parameterDisplayName = parameter.name;
    const responseValueMap = new Map<number, number>();
    for (let i = 0; i < responses.realizations.length; i++) {
        const realization = responses.realizations[i] as number;
        const value = responses.values[i] as number;
        responseValueMap.set(realization, value);
    }

    const xValues: number[] = [];
    const yValues: number[] = [];
    const realizationValues: number[] = [];

    for (let i = 0; i < parameter.realizations.length; i++) {
        const realization = parameter.realizations[i];
        const parameterValue = parameter.values[i] as number;

        const responseValue = responseValueMap.get(realization);

        if (responseValue !== undefined) {
            xValues.push(responseValue);
            yValues.push(parameterValue);
            realizationValues.push(realization);
        }
    }

    const basePlotColor = "rgba(0, 112, 121, 1)";
    const markerPlotColor = "rgba(0, 112, 121, 0.5)";

    const scatterTrace: Partial<PlotData> = {
        x: xValues,
        y: yValues,
        mode: "markers",
        type: "scatter",
        marker: {
            symbol: "circle",
            size: 10,
            color: markerPlotColor,
            opacity: 0.5,
            line: {
                color: basePlotColor,
                width: 1,
            },
        },

        hovertemplate: `${responses.displayName} = <b>%{x}</b> <br> ${parameterDisplayName} = <b>%{y}</b> <br> Realization = <b>%{text}</b> <extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
        text: realizationValues.map((realization) => realization.toString()),
    };

    const traces: Partial<PlotData>[] = [scatterTrace];

    traces.push(scatterTrace);
    if (showTrendline) {
        // Calculate linear regression for the trendline
        const { slope, intercept } = linearRegression(xValues, yValues);

        // Create the trendline data
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        const trendlineX = [minX, maxX];
        const trendlineY = [intercept + slope * minX, intercept + slope * maxX];

        const trendlineTrace: Partial<PlotData> = {
            x: trendlineX,
            y: trendlineY,
            mode: "lines",
            type: "scatter",
            name: "Linear Trendline",
            line: {
                color: "black",
                dash: "dash",
                width: 2,
            },
        };
        traces.push(trendlineTrace);
    }
    return traces;
}
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
    const n = x.length;
    if (n === 0) {
        return { slope: 0, intercept: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    const numerator = sumXY - n * meanX * meanY;
    const denominator = sumX2 - n * meanX * meanX;

    let slope = 0;
    if (denominator !== 0) {
        slope = numerator / denominator;
    }

    const intercept = meanY - slope * meanX;

    return { slope, intercept };
}
