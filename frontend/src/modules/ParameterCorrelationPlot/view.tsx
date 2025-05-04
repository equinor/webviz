import React from "react";

import { Input, Warning } from "@mui/icons-material";
import type { Layout, PlotData } from "plotly.js";

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
    const [prevNumParams, setPrevNumParams] = React.useState<number>(10);
    const [prevCorrCutOff, setPrevCorrCutOff] = React.useState<number>(0.0);
    const [prevShowLabels, setPrevShowLabels] = React.useState<boolean | null>(null);
    const [prevSize, setPrevSize] = React.useState<Size2D | null>(null);

    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const numParams = viewContext.useSettingsToViewInterfaceValue("numParams");
    const corrCutOff = viewContext.useSettingsToViewInterfaceValue("corrCutOff");
    const showLabels = viewContext.useSettingsToViewInterfaceValue("showLabels");
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
        numParams !== prevNumParams ||
        corrCutOff !== prevCorrCutOff ||
        showLabels !== prevShowLabels ||
        wrapperDivSize !== prevSize
    ) {
        setRevNumberResponse(receiverResponse.revisionNumber);

        setPrevPlotType(plotType);
        setPrevNumParams(numParams);
        setPrevCorrCutOff(corrCutOff);
        setPrevShowLabels(showLabels);

        setPrevSize(wrapperDivSize);

        startTransition(function makeContent() {
            if (!receiverResponse.channel) {
                setContent(
                    <ContentInfo>
                        <span>
                            Data channel required for use. Add a main module to the workbench and use the data channels
                            icon
                            <Input />
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

            if (plotType === PlotType.ParameterCorrelation) {
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
                const ensembleParametersMap = new Map<string, Parameter[]>();
                receiverResponse.channel.contents.forEach((content) => {
                    const ensembleIdentString = content.metaData.ensembleIdentString;
                    const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);
                    if (ensemble && ensemble instanceof RegularEnsemble) {
                        const parameterArr = ensemble.getParameters().getParameterArr();
                        const parameters: Parameter[] = [];
                        if (parameterArr) {
                            parameterArr.forEach((parameter) => {
                                if (parameter.isConstant || parameter.type !== ParameterType.CONTINUOUS) {
                                    return;
                                }
                                parameters.push(parameter);
                            });
                            ensembleParametersMap.set(ensembleIdentString, parameters);
                        }
                    }
                });

                // Loop through the contents and plot the correlations
                let cellIndex = 0;
                for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                    for (let colIndex = 0; colIndex < numCols; colIndex++) {
                        if (cellIndex >= numContents) {
                            break;
                        }
                        const responseChannelData = receiverResponse.channel.contents[cellIndex];

                        const ensembleIdentString = responseChannelData.metaData.ensembleIdentString;
                        const parameters = ensembleParametersMap.get(ensembleIdentString);
                        if (!parameters) {
                            cellIndex++;
                            continue;
                        }

                        const responseData: ResponseData = {
                            realizations: responseChannelData.dataArray.map((dataPoint) => dataPoint.key as number),
                            values: responseChannelData.dataArray.map((dataPoint) => dataPoint.value as number),
                            displayName: responseChannelData.displayName,
                        };

                        const rankedParameters = rankParameters(parameters, responseData, numParams, corrCutOff);
                        const color = responseChannelData.metaData.preferredColor;

                        const trace = plotRankedCorrelations(rankedParameters, showLabels, color) as Partial<PlotData>;

                        figure.addTrace(trace, rowIndex + 1, colIndex + 1);

                        const channelTitle = responseChannelData.metaData.displayString;
                        figure.updateSubplotTitle(`<b>${channelTitle}</b>`, rowIndex + 1, colIndex + 1);

                        const layoutPatch: Partial<Layout> = {
                            [`xaxis${cellIndex + 1}`]: {
                                zeroline: true,
                            },
                            [`yaxis${cellIndex + 1}`]: {
                                autorange: "reversed",
                                visible: false,
                            },
                        };

                        figure.updateLayout(layoutPatch);
                        cellIndex++;
                    }
                }
                setContent(figure.makePlot());
                return;
            }
        });
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {content}
        </div>
    );
};

View.displayName = "View";

function pearsonCorrelation(x: number[], y: number[]): number | null {
    // to be improved
    const n = x.length;
    if (n < 2) return null; //  Cant corrlate with less than 2 points

    const avgX = x.reduce((a, b) => a + b, 0) / n;
    const avgY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - avgX;
        const dy = y[i] - avgY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) {
        return null; // No variation in one of the variables
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? null : numerator / denominator;
}
type RankedParameter = {
    ident: ParameterIdent;
    correlation: number | null;
    absCorrelation: number | null;
};
type ResponseData = {
    realizations: number[];
    values: number[];
    displayName: string;
};
function rankParameters(
    parameters: Parameter[],
    responses: ResponseData,
    numParams: number,
    absCutoff: number,
): RankedParameter[] {
    const responseValueMap = new Map<number, number>();

    for (let i = 0; i < responses.realizations.length; i++) {
        const realization = responses.realizations[i];
        const value = responses.values[i] as number;
        responseValueMap.set(realization, value);
    }

    const correlations = parameters.map((param) => {
        const x: number[] = [];
        const y: number[] = [];

        for (let i = 0; i < param.realizations.length; i++) {
            const realization = param.realizations[i];
            const parameterValue = param.values[i] as number;

            const responseValue = responseValueMap.get(realization);

            if (responseValue !== undefined) {
                x.push(parameterValue);
                y.push(responseValue);
            }
        }

        const corr = pearsonCorrelation(x, y);

        return {
            ident: ParameterIdent.fromNameAndGroup(param.name, param.groupName),
            correlation: corr,
            absCorrelation: corr !== null ? Math.abs(corr) : null,
        };
    });

    return correlations
        .filter((c) => c.absCorrelation !== null) // Filter out null correlations
        .filter((c) => Math.abs(c.absCorrelation!) >= absCutoff) // Filter by absolute cutoff
        .sort((a, b) => b.absCorrelation! - a.absCorrelation!) // Sort by absolute correlation
        .slice(0, numParams); // Limit to numParams
}

function plotRankedCorrelations(
    rankedParameters: RankedParameter[],
    showLabel: boolean,
    color?: string,
): Partial<PlotData> {
    const identStrings = rankedParameters.map((p) => p.ident.toString());
    const names = rankedParameters.map((p) => p.ident.name);
    const correlations = rankedParameters.map((p) => p.correlation!);

    let trace: Partial<PlotData> = {
        x: correlations,
        y: names,
        customdata: identStrings,
        type: "bar",
        orientation: "h",
        marker: {
            color: "rgba(0.0, 112.0, 121.0, .5)",
            line: {
                color: "rgba(0.0, 112.0, 121.0, 1)",
                width: 1,
            },
        },
        hovertemplate: "Parameter = <b>%{y}</b><br>Correlation = <b>%{x}</b><extra></extra>",
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };
    if (showLabel) {
        trace = {
            ...trace,
            text: names,
            textposition: "inside",
            insidetextanchor: "middle",
            textfont: {
                color: "white",
            },
        };
    }
    return trace;
}
