import React from "react";

import { Input, Warning } from "@mui/icons-material";
import type { Layout, PlotData } from "plotly.js";

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

import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
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
                        l: showLabels ? 220 : 20,
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
                                const parameterIdent = new ParameterIdent(parameter.name, parameter.groupName);
                                const parameterValues = parameter.values as number[];
                                const parameterRealizations = parameter.realizations;
                                const parameterObj: Parameter = {
                                    ident: parameterIdent,
                                    values: parameterValues,
                                    realizations: parameterRealizations,
                                };
                                parameters.push(parameterObj);
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
                        const responseData = receiverResponse.channel.contents[cellIndex];

                        const ensembleIdentString = responseData.metaData.ensembleIdentString;
                        const parameters = ensembleParametersMap.get(ensembleIdentString);
                        if (!parameters) {
                            cellIndex++;
                            continue;
                        }

                        const responses: Response[] = [];

                        responseData.dataArray.forEach((dataPoint) => {
                            const realization = dataPoint.key as number;
                            const responseValue = dataPoint.value as number;
                            const responseObj: Response = {
                                key: realization,
                                value: responseValue,
                            };
                            responses.push(responseObj);
                        });

                        const rankedParameters = rankParameters(parameters, responses);
                        const filteredRankedParameters = rankedParameters.filter(
                            (p) => p.absCorrelation !== null && Math.abs(p.absCorrelation) >= corrCutOff,
                        );

                        // const xRange = Math.max(...filteredRankedParameters.map((p) => p.correlation ?? 0));

                        const color = responseData.metaData.preferredColor;

                        const trace = plotRankedCorrelations(
                            filteredRankedParameters,
                            numParams,
                            color,
                        ) as Partial<PlotData>;

                        figure.addTrace(trace, rowIndex + 1, colIndex + 1);

                        const channelTitle = responseData.metaData.displayString;
                        figure.updateSubplotTitle(`<b>${channelTitle}</b>`, rowIndex + 1, colIndex + 1);

                        const layoutPatch: Partial<Layout> = {
                            [`xaxis${cellIndex + 1}`]: {
                                zeroline: true,
                                // range: [-xRange, xRange],
                            },
                            [`yaxis${cellIndex + 1}`]: {
                                autorange: "reversed",
                                visible: showLabels,
                                tickangle: -45,
                                tickfont: {
                                    size: 10,
                                },
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

type Parameter = {
    ident: ParameterIdent;
    values: number[];
    realizations: number[];
};
type Response = {
    key: number;
    value: number;
};

function pearsonCorrelation(x: number[], y: number[]): number | null {
    const n = x.length;
    if (n < 2) return null; // Not enough data

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
        return null; // Handle zero variance
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? null : numerator / denominator;
}
type RankedParameter = {
    ident: ParameterIdent;
    correlation: number | null;
    absCorrelation: number | null;
};

function rankParameters(parameters: Parameter[], responses: Response[]): RankedParameter[] {
    const responseMap = new Map(responses.map((r) => [r.key, r.value]));

    const correlations = parameters.map((param) => {
        const x: number[] = [];
        const y: number[] = [];

        for (let i = 0; i < param.realizations.length; i++) {
            const realization = param.realizations[i];
            const responseValue = responseMap.get(realization);
            //
            if (responseValue !== undefined) {
                x.push(param.values[i]);
                y.push(responseValue);
            }
        }

        const corr = pearsonCorrelation(x, y);

        return {
            ident: param.ident,
            correlation: corr,
            absCorrelation: corr !== null ? Math.abs(corr) : null,
        };
    });

    return correlations.filter((c) => c.correlation !== null).sort((a, b) => b.absCorrelation! - a.absCorrelation!);
}

function plotRankedCorrelations(ranked: RankedParameter[], numParams: number, color?: string): Partial<PlotData> {
    // Filter out any nulls to ensure safe plotting
    const filtered = ranked.filter((p) => p.correlation !== null && p.absCorrelation !== null).slice(0, numParams);

    const identStrings = filtered.map((p) => p.ident.toString());
    const names = filtered.map((p) => p.ident.name);
    const correlations = filtered.map((p) => p.correlation!); // safe after filter

    const trace: Partial<PlotData> = {
        x: correlations,
        y: names,
        customdata: identStrings,
        type: "bar",
        orientation: "h" as const,
        marker: {
            size: 20,
            color: "rgba(0.0, 112.0, 121.0, .5)",

            line: {
                color: "rgba(0.0, 112.0, 121.0, 1)",
                width: 1,
            },
        },
    };

    return trace;
}
// function handleParameterChange(newParameter: string | null) {
//     setUserSelectedRegularEnsembleIdent(newEnsembleIdent);
//     if (newEnsembleIdent) {
//         syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
//     }
// }
