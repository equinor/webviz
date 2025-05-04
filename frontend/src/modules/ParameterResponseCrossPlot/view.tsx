import React from "react";

import { Input, Warning } from "@mui/icons-material";
import type { Layout, PlotData, PlotMouseEvent } from "plotly.js";

import { KeyKind } from "@framework/DataChannelTypes";
import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
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
            return (
                <ContentInfo>
                    <span>
                        Data channel required for use. Add a main module to the workbench and use the data channels icon
                        <Input />
                    </span>
                    <Tag label="Response" />
                </ContentInfo>
            );
        }

        if (receiverResponse.channel.contents.length === 0) {
            console.log("No contents");
            return (
                <ContentInfo>
                    No data on <Tag label={receiverResponse.displayName} />
                </ContentInfo>
            );
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
                sharedXAxes: true,
                sharedYAxes: false,

                horizontalSpacing: 0.2 / numCols,
                margin: {
                    t: 20,
                    r: 20,
                    b: 20,
                    l: 20,
                },
                showGrid: true,
            });
            figure.updateLayout({ showlegend: false });
            // Create a map with parameters for each ensemble
            if (!parameterIdentString) {
                return;
            }
            const parameterIdent = ParameterIdent.fromString(parameterIdentString ?? "");
            console.log("parameterIdent", parameterIdent);
            if (!parameterIdent) {
                return;
            }

            const ensembleParametersMap = new Map<string, Parameter>();
            receiverResponse.channel.contents.forEach((content) => {
                const ensembleIdentString = content.metaData.ensembleIdentString;
                const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);
                if (ensemble && ensemble instanceof RegularEnsemble) {
                    const parameter = ensemble.getParameters().getParameter(parameterIdent);
                    ensembleParametersMap.set(ensembleIdentString, parameter);
                }
            });

            // Loop through the contents and plot the correlations
            let cellIndex = 0;
            for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    if (cellIndex >= numContents) {
                        break;
                    }
                    const responses: Response[] = [];
                    const responseData = receiverResponse.channel.contents[cellIndex];
                    responseData.dataArray.forEach((dataPoint) => {
                        const realization = dataPoint.key as number;
                        const responseValue = dataPoint.value as number;
                        const responseObj: Response = {
                            key: realization,
                            value: responseValue,
                        };
                        responses.push(responseObj);
                    });
                    const parameter = ensembleParametersMap.get(responseData.metaData.ensembleIdentString);
                    if (!parameter) {
                        return;
                    }

                    const traces = scatterPlotParameterResponse(responses, parameter);
                    figure.addTraces(traces, rowIndex + 1, colIndex + 1);
                    const layoutPatch: Partial<Layout> = {
                        [`xaxis${cellIndex + 1}`]: {
                            zeroline: false,
                            // range: [-xRange, xRange],
                        },
                        [`yaxis${cellIndex + 1}`]: {
                            zeroline: false,
                        },
                    };
                    figure.updateLayout(layoutPatch);
                    const channelTitle = `${parameterIdent.name} / <b>${responseData.metaData.displayString}`;
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

type Response = {
    key: number;
    value: number;
};

function scatterPlotParameterResponse(responses: Response[], parameter: Parameter) {
    const parameterRealizations = parameter.realizations;
    const parameterValues = parameter.values as number[];

    const xValues: number[] = [];
    const yValues: number[] = [];

    for (let i = 0; i < parameterRealizations.length; i++) {
        const realization = parameterRealizations[i];
        const response = responses.find((r) => r.key === realization);
        if (response) {
            xValues.push(parameterValues[i]);
            yValues.push(response.value);
        }
    }

    const scatterTrace: Partial<PlotData> = {
        x: xValues,
        y: yValues,
        mode: "markers",
        type: "scatter",
        marker: {
            symbol: "circle",
            size: 20,
            color: "rgba(0.0, 112.0, 121.0, 0.5)",
            opacity: 0.5,
            line: {
                color: "rgba(0.0, 112.0, 121.0, 1)",
                width: 1,
            },
        },
        line: { color: "rgba(0.0, 112.0, 121.0, 1)", width: 1 },
    };

    // Calculate linear regression for the trendline
    const { slope, intercept } = linearRegression(xValues, yValues);

    // Generate x values for the trendline (spanning the data range)
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const trendlineX = [minX, maxX];
    const trendlineY = [intercept + slope * minX, intercept + slope * maxX];

    const trendlineTrace: Partial<PlotData> = {
        x: trendlineX,
        y: trendlineY,
        mode: "lines",
        type: "scatter",
        name: "Trendline", // Optional name for the legend
        line: {
            color: "black", // Customize the trendline color
            // dash: "dash", // Optional line style
        },
    };

    return [scatterTrace, trendlineTrace];
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
