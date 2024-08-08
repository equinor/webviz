import React from "react";

import { ChannelReceiverChannelContent, KeyKind } from "@framework/DataChannelTypes";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { Size2D } from "@lib/utils/geometry";
import { makeSubplots } from "@modules/_shared/Figure";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { ContentWarning } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Warning } from "@mui/icons-material";

import { Layout, PlotData } from "plotly.js";

import { Interfaces } from "./interfaces";
import { PlotType } from "./typesAndEnums";
import { makeHistogramTrace } from "./utils/histogram";
import { makeHoverText, makeHoverTextWithColor, makeTitleFromChannelContent } from "./utils/stringUtils";
import { calcTextSize } from "./utils/textSize";

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

export const View = ({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const [isPending, startTransition] = React.useTransition();
    const [content, setContent] = React.useState<React.ReactNode>(null);
    const [revNumberX, setRevNumberX] = React.useState<number>(0);
    const [revNumberY, setRevNumberY] = React.useState<number>(0);
    const [revNumberColorMapping, setRevNumberColorMapping] = React.useState<number>(0);
    const [prevPlotType, setPrevPlotType] = React.useState<PlotType | null>(null);
    const [prevNumBins, setPrevNumBins] = React.useState<number | null>(null);
    const [prevOrientation, setPrevOrientation] = React.useState<"v" | "h" | null>(null);
    const [prevSize, setPrevSize] = React.useState<Size2D | null>(null);

    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const numBins = viewContext.useSettingsToViewInterfaceValue("numBins");
    const orientation = viewContext.useSettingsToViewInterfaceValue("orientation");

    const statusWriter = useViewStatusWriter(viewContext);

    const colorSet = workbenchSettings.useColorSet();
    const seqColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const receiverX = viewContext.useChannelReceiver({
        receiverIdString: "channelX",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });
    const receiverY = viewContext.useChannelReceiver({
        receiverIdString: "channelY",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });
    const receiverColorMapping = viewContext.useChannelReceiver({
        receiverIdString: "channelColorMapping",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    statusWriter.setLoading(isPending || receiverX.isPending || receiverY.isPending || receiverColorMapping.isPending);

    if (
        receiverX.revisionNumber !== revNumberX ||
        receiverY.revisionNumber !== revNumberY ||
        receiverColorMapping.revisionNumber !== revNumberColorMapping ||
        plotType !== prevPlotType ||
        numBins !== prevNumBins ||
        orientation !== prevOrientation ||
        wrapperDivSize !== prevSize
    ) {
        setRevNumberX(receiverX.revisionNumber);
        setRevNumberY(receiverY.revisionNumber);
        setRevNumberColorMapping(receiverColorMapping.revisionNumber);
        setPrevPlotType(plotType);
        setPrevNumBins(numBins);
        setPrevOrientation(orientation);
        setPrevSize(wrapperDivSize);

        startTransition(function makeContent() {
            if (!receiverX.channel) {
                setContent(
                    <ContentInfo>
                        Connect a channel to <Tag label={receiverX.displayName} />
                    </ContentInfo>
                );
                return;
            }

            if (receiverX.channel.contents.length === 0) {
                setContent(
                    <ContentInfo>
                        No data on <Tag label={receiverX.displayName} />
                    </ContentInfo>
                );
                return;
            }

            if (plotType === PlotType.Scatter || plotType === PlotType.ScatterWithColorMapping) {
                if (!receiverY.channel) {
                    setContent(
                        <ContentInfo>
                            Connect a channel to <Tag label={receiverY.displayName} />
                        </ContentInfo>
                    );
                    return;
                }

                if (receiverY.channel.contents.length === 0) {
                    setContent(
                        <ContentInfo>
                            No data on <Tag label={receiverY.displayName} />
                        </ContentInfo>
                    );
                    return;
                }
            }

            if (plotType === PlotType.ScatterWithColorMapping) {
                if (!receiverColorMapping.channel) {
                    setContent(
                        <ContentInfo>
                            Connect a channel to <Tag label={receiverColorMapping.displayName} />
                        </ContentInfo>
                    );
                    return;
                }

                if (receiverColorMapping.channel.contents.length === 0) {
                    setContent(
                        <ContentInfo>
                            No data on <Tag label={receiverColorMapping.displayName} />
                        </ContentInfo>
                    );
                    return;
                }
            }

            if (plotType === PlotType.Histogram) {
                const numContents = receiverX.channel.contents.length;
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
                    verticalSpacing: 100 / (wrapperDivSize.height - 50),
                    horizontalSpacing: 0.2 / numCols,
                    margin: {
                        t: 0,
                        r: 20,
                        b: 50,
                        l: 90,
                    },
                });

                let cellIndex = 0;
                for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                    for (let colIndex = 0; colIndex < numCols; colIndex++) {
                        if (cellIndex >= numContents) {
                            break;
                        }
                        const data = receiverX.channel.contents[cellIndex];
                        const xValues = data.dataArray.map((el: any) => el.value);

                        const trace = makeHistogramTrace({
                            xValues: xValues,
                            numBins,
                            color: colorSet.getFirstColor(),
                        });

                        figure.addTrace(trace, rowIndex + 1, colIndex + 1);

                        const patch: Partial<Layout> = {
                            [`xaxis${cellIndex + 1}`]: {
                                title: makeTitleFromChannelContent(data),
                            },
                            [`yaxis${cellIndex + 1}`]: {
                                title: "Percent",
                            },
                        };
                        figure.updateLayout(patch);
                        cellIndex++;
                    }
                }
                setContent(figure.makePlot());
                return;
            }

            if (plotType === PlotType.BarChart) {
                const numContents = receiverX.channel.contents.length;
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
                    verticalSpacing: 100 / (wrapperDivSize.height - 50),
                    horizontalSpacing: 0.2 / numCols,
                    margin: {
                        t: 0,
                        r: 20,
                        b: 50,
                        l: 90,
                    },
                });

                let cellIndex = 0;
                for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                    for (let colIndex = 0; colIndex < numCols; colIndex++) {
                        if (cellIndex >= numContents) {
                            break;
                        }
                        const data = receiverX.channel.contents[cellIndex];
                        const keyData = data.dataArray.map((el: any) => el.key);
                        const valueData = data.dataArray.map((el: any) => el.value);

                        const dataTitle = makeTitleFromChannelContent(data);
                        const kindOfKeyTitle = `${receiverX.channel.kindOfKey}` ?? "";

                        const trace: Partial<PlotData> = {
                            x: orientation === "h" ? valueData : keyData,
                            y: orientation === "h" ? keyData : valueData,
                            marker: {
                                size: 5,
                                color: colorSet.getFirstColor(),
                            },
                            showlegend: false,
                            type: "bar",
                            orientation,
                        };

                        const xAxisTitle = orientation === "h" ? dataTitle : kindOfKeyTitle;
                        const yAxisTitle = orientation === "h" ? kindOfKeyTitle : dataTitle;

                        figure.addTrace(trace, rowIndex + 1, colIndex + 1);
                        const patch: Partial<Layout> = {
                            [`xaxis${cellIndex + 1}`]: {
                                title: xAxisTitle,
                            },
                            [`yaxis${cellIndex + 1}`]: {
                                title: yAxisTitle,
                            },
                        };
                        figure.updateLayout(patch);
                        cellIndex++;
                    }
                }

                setContent(figure.makePlot());
                return;
            }

            if (
                (plotType === PlotType.Scatter && receiverY.channel) ||
                (plotType === PlotType.ScatterWithColorMapping && receiverY.channel && receiverColorMapping.channel)
            ) {
                const numPlots = receiverX.channel.contents.length * receiverY.channel.contents.length;
                if (numPlots > MAX_NUM_PLOTS) {
                    setContent(<MaxNumberPlotsExceededMessage />);
                    return;
                }
                const figure = makeSubplots({
                    numRows: receiverX.channel.contents.length,
                    numCols: receiverY.channel.contents.length,
                    width: wrapperDivSize.width,
                    height: wrapperDivSize.height,
                    sharedXAxes: true,
                    sharedYAxes: true,
                    verticalSpacing: 20 / (wrapperDivSize.height - 80),
                    horizontalSpacing: 20 / (wrapperDivSize.width - 80),
                    margin: {
                        t: 0,
                        r: 0,
                        b: 80,
                        l: 80,
                    },
                });

                const colorScale = seqColorScale.getPlotlyColorScale();
                let dataColor: ChannelReceiverChannelContent<KeyKind.REALIZATION[]> | null = null;

                if (plotType === PlotType.ScatterWithColorMapping) {
                    dataColor = receiverColorMapping.channel?.contents[0] ?? null;
                }

                const font = {
                    size: calcTextSize({
                        width: wrapperDivSize.width,
                        height: wrapperDivSize.height,
                        numPlotsX: receiverX.channel.contents.length,
                        numPlotsY: receiverY.channel.contents.length,
                    }),
                };

                let cellIndex = 0;
                receiverX.channel.contents.forEach((contentRow, rowIndex) => {
                    if (!receiverY.channel) {
                        return;
                    }
                    receiverY.channel.contents.forEach((contentCol, colIndex) => {
                        cellIndex++;

                        const dataX = contentCol;
                        const dataY = contentRow;

                        const xValues: number[] = [];
                        const yValues: number[] = [];
                        const colorValues: number[] = [];
                        const realizations: number[] = [];

                        let color = colorSet.getFirstColor();
                        const preferredColorX = contentRow.metaData.preferredColor;
                        const preferredColorY = contentCol.metaData.preferredColor;

                        if (preferredColorX && preferredColorY) {
                            if (preferredColorX === preferredColorY) {
                                color = preferredColorX;
                            }
                        }

                        const keysX = dataX.dataArray.map((el: any) => el.key);
                        const keysY = dataY.dataArray.map((el: any) => el.key);
                        const keysColor = dataColor?.dataArray.map((el: any) => el.key) ?? [];
                        if (
                            keysX.length === keysY.length &&
                            (dataColor === null || keysColor.length === keysX.length) &&
                            !keysX.some(
                                (el, index) => el !== keysY[index] || (dataColor !== null && el !== keysColor[index])
                            )
                        ) {
                            keysX.forEach((key) => {
                                const dataPointX = dataX.dataArray.find((el: any) => el.key === key);
                                const dataPointY = dataY.dataArray.find((el: any) => el.key === key);
                                const dataPointColor = dataColor?.dataArray.find((el: any) => el.key === key);
                                if (dataPointX && dataPointY) {
                                    xValues.push(dataPointX.value as number);
                                    yValues.push(dataPointY.value as number);
                                    if (dataPointColor) {
                                        colorValues.push(dataPointColor.value as number);
                                    }
                                    realizations.push(key as number);
                                }
                            });
                        }

                        const trace: Partial<PlotData> = {
                            x: xValues,
                            y: yValues,
                            mode: "markers",
                            marker: {
                                size: 5,
                                color: dataColor ? colorValues : color,
                                colorscale: dataColor ? colorScale : undefined,
                                colorbar:
                                    dataColor && cellIndex === 1
                                        ? {
                                              title: makeTitleFromChannelContent(dataColor),
                                              titleside: "right",
                                          }
                                        : undefined,
                            },
                            showlegend: false,
                            type: "scattergl",
                            hovertemplate: realizations.map((real) =>
                                dataColor
                                    ? makeHoverTextWithColor(contentRow, contentCol, dataColor, real)
                                    : makeHoverText(contentRow, contentCol, real)
                            ),
                        };

                        figure.addTrace(trace, rowIndex + 1, colIndex + 1);

                        if (rowIndex === 0) {
                            const patch: Partial<Layout> = {
                                [`xaxis${cellIndex}`]: {
                                    title: makeTitleFromChannelContent(contentCol),
                                    font,
                                },
                            };
                            figure.updateLayout(patch);
                        }
                        if (colIndex === 0) {
                            const patch: Partial<Layout> = {
                                [`yaxis${cellIndex}`]: {
                                    title: makeTitleFromChannelContent(contentRow),
                                    font,
                                },
                            };
                            figure.updateLayout(patch);
                        }
                    });
                });
                const patch: Partial<Layout> = {
                    margin: {
                        t: 5,
                        r: 5,
                    },
                    font,
                    autosize: true,
                };
                figure.updateLayout(patch);
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
