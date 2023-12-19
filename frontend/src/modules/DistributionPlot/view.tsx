import React from "react";

import { KeyKind } from "@framework/DataChannelTypes";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { Size } from "@lib/utils/geometry";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import { ColorBar, Layout, PlotData } from "plotly.js";

import { DisplayMode, PlotType, State } from "./state";
import { Figure, makeSubplots } from "./utils/Figure";
import { makeHistogramBins, makeHistogramTrace } from "./utils/histogram";
import { makePlotTitle } from "./utils/stringUtils";
import { calcTextSize } from "./utils/textSize";

export const View = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
    const [isPending, startTransition] = React.useTransition();
    const [plot, setPlot] = React.useState<React.ReactNode>(null);
    const [revNumberX, setRevNumberX] = React.useState<number>(0);
    const [revNumberY, setRevNumberY] = React.useState<number>(0);
    const [revNumberColorMapping, setRevNumberColorMapping] = React.useState<number>(0);
    const [prevPlotType, setPrevPlotType] = React.useState<PlotType | null>(null);
    const [prevNumBins, setPrevNumBins] = React.useState<number | null>(null);
    const [prevOrientation, setPrevOrientation] = React.useState<"v" | "h" | null>(null);
    const [prevSize, setPrevSize] = React.useState<Size | null>(null);

    const plotType = moduleContext.useStoreValue("plotType");
    const numBins = moduleContext.useStoreValue("numBins");
    const orientation = moduleContext.useStoreValue("orientation");
    const displayMode = moduleContext.useStoreValue("displayMode");

    const statusWriter = useViewStatusWriter(moduleContext);

    const colorSet = workbenchSettings.useColorSet();
    const seqColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const receiverX = moduleContext.useChannelReceiver({
        idString: "channelX",
        expectedKindsOfKeys: [KeyKind.Realization],
    });
    const receiverY = moduleContext.useChannelReceiver({
        idString: "channelY",
        expectedKindsOfKeys: [KeyKind.Realization],
    });
    const receiverColorMapping = moduleContext.useChannelReceiver({
        idString: "channelColorMapping",
        expectedKindsOfKeys: [KeyKind.Realization],
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
            if (!receiverX.hasActiveSubscription) {
                setPlot(
                    <ContentInfo>
                        Connect a channel to <Tag label={receiverX.displayName} />
                    </ContentInfo>
                );
                return;
            }

            if (receiverX.channel.contents.length === 0) {
                setPlot(
                    <ContentInfo>
                        No data on <Tag label={receiverX.displayName} />
                    </ContentInfo>
                );
                return;
            }

            if (plotType === PlotType.Scatter || plotType === PlotType.ScatterWithColorMapping) {
                if (!receiverY.hasActiveSubscription) {
                    setPlot(
                        <ContentInfo>
                            Connect a channel to <Tag label={receiverY.displayName} />
                        </ContentInfo>
                    );
                    return;
                }

                if (receiverY.channel.contents.length === 0) {
                    setPlot(
                        <ContentInfo>
                            No data on <Tag label={receiverY.displayName} />
                        </ContentInfo>
                    );
                    return;
                }
            }

            if (plotType === PlotType.ScatterWithColorMapping) {
                if (!receiverColorMapping.hasActiveSubscription) {
                    setPlot(
                        <ContentInfo>
                            Connect a channel to <Tag label={receiverColorMapping.displayName} />
                        </ContentInfo>
                    );
                    return;
                }

                if (receiverColorMapping.channel.contents.length === 0) {
                    setPlot(
                        <ContentInfo>
                            No data on <Tag label={receiverColorMapping.displayName} />
                        </ContentInfo>
                    );
                    return;
                }
            }

            if (plotType === PlotType.Histogram) {
                const numContents = receiverX.channel.contents.length;
                const numCols = Math.floor(Math.sqrt(numContents));
                const numRows = Math.ceil(numContents / numCols);

                let figure: Figure | null = null;

                if (displayMode === DisplayMode.PlotMatrix) {
                    figure = makeSubplots({
                        numRows,
                        numCols,
                        width: wrapperDivSize.width,
                        height: wrapperDivSize.height,
                        sharedXAxes: false,
                        sharedYAxes: false,
                        verticalSpacing: 0.3 / numRows,
                        horizontalSpacing: 0.3 / numCols,
                    });
                } else {
                    figure = new Figure({
                        layout: {
                            // width: wrapperDivSize.width,
                            // height: wrapperDivSize.height,
                        },
                    });
                }

                if (displayMode === DisplayMode.PlotMatrix) {
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

                            const xAxisTitle = data.displayName;

                            const patch: Partial<Layout> = {
                                [`xaxis${cellIndex + 1}`]: {
                                    title: xAxisTitle,
                                },
                                [`yaxis${cellIndex + 1}`]: {
                                    title: "Percent",
                                },
                            };
                            figure.updateLayout(patch);
                            cellIndex++;
                        }
                    }
                } else {
                    const xValuesArray = receiverX.channel.contents.map((content) =>
                        content.dataArray.map((el: any) => el.value)
                    );
                    const bins = makeHistogramBins({
                        xValuesArray,
                        numBins,
                    });

                    for (let i = 0; i < xValuesArray.length; i++) {
                        const trace = makeHistogramTrace({
                            xValues: xValuesArray[i],
                            numBins,
                            bins,
                            color: colorSet.getColor(i),
                        });

                        figure.addTrace(trace);
                    }
                }

                setPlot(figure.makePlot());
                return;
            }

            if (plotType === PlotType.BarChart) {
                const numContents = receiverX.channel.contents.length;
                const numCols = Math.floor(Math.sqrt(numContents));
                const numRows = Math.ceil(numContents / numCols);

                const figure = makeSubplots({
                    numRows,
                    numCols,
                    width: wrapperDivSize.width,
                    height: wrapperDivSize.height,
                    sharedXAxes: false,
                    sharedYAxes: false,
                    verticalSpacing: 0.15 / numRows,
                    horizontalSpacing: 0.3 / numCols,
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

                        const dataTitle = data.displayName;
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

                setPlot(figure.makePlot());
                return;
            }

            if (plotType === PlotType.Scatter && receiverY.channel) {
                const figure = makeSubplots({
                    numRows: receiverX.channel.contents.length,
                    numCols: receiverY.channel.contents.length,
                    width: wrapperDivSize.width,
                    height: wrapperDivSize.height,
                    sharedXAxes: true,
                    sharedYAxes: true,
                    verticalSpacing: 0.05 / receiverX.channel.contents.length,
                });

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
                    receiverY.channel.contents.forEach((contentCol, colIndex) => {
                        cellIndex++;

                        const dataX = contentCol;
                        const dataY = contentRow;

                        const xValues: number[] = [];
                        const yValues: number[] = [];

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
                        if (keysX.length === keysY.length && !keysX.some((el, index) => el !== keysY[index])) {
                            keysX.forEach((key) => {
                                const dataPointX = dataX.dataArray.find((el: any) => el.key === key);
                                const dataPointY = dataY.dataArray.find((el: any) => el.key === key);
                                if (dataPointX && dataPointY) {
                                    xValues.push(dataPointX.value as number);
                                    yValues.push(dataPointY.value as number);
                                }
                            });
                        }

                        const trace: Partial<PlotData> = {
                            x: xValues,
                            y: yValues,
                            mode: "markers",
                            marker: {
                                size: 5,
                                color: color,
                            },
                            showlegend: false,
                            type: "scattergl",
                        };

                        figure.addTrace(trace, rowIndex + 1, colIndex + 1);

                        if (rowIndex === 0) {
                            const patch: Partial<Layout> = {
                                [`xaxis${cellIndex}`]: {
                                    title: makePlotTitle(contentCol),
                                    font,
                                },
                            };
                            figure.updateLayout(patch);
                        }
                        if (colIndex === 0) {
                            const patch: Partial<Layout> = {
                                [`yaxis${cellIndex}`]: {
                                    title: makePlotTitle(contentRow),
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
                };
                figure.updateLayout(patch);
                setPlot(figure.makePlot());
                return;
            }

            if (plotType === PlotType.ScatterWithColorMapping && receiverY.channel && receiverColorMapping.channel) {
                const verticalSpacing = 0.1 / receiverX.channel.contents.length;
                const horizontalSpacing = 0.1 / receiverY.channel.contents.length;
                const figure = makeSubplots({
                    numRows: receiverX.channel.contents.length,
                    numCols: receiverY.channel.contents.length,
                    width: wrapperDivSize.width,
                    height: wrapperDivSize.height,
                    sharedXAxes: true,
                    sharedYAxes: true,
                    verticalSpacing,
                    horizontalSpacing,
                    margin: {
                        t: 10,
                        r: 20,
                        b: 30,
                        l: 30,
                    },
                });

                const colorScale = seqColorScale.getPlotlyColorScale();
                const dataColor = receiverColorMapping.channel.contents[0];
                const colorBar: Partial<ColorBar> = {
                    title: makePlotTitle(dataColor),
                    titleside: "right",
                };
                const font = {
                    size: calcTextSize({
                        width: wrapperDivSize.width,
                        height: wrapperDivSize.height,
                        numPlotsX: receiverX.channel.contents.length,
                        numPlotsY: receiverY.channel.contents.length,
                    }),
                };

                const patch: Partial<Layout> = {
                    font,
                    autosize: true,
                };
                figure.updateLayout(patch);

                let cellIndex = 0;
                receiverX.channel.contents.forEach((dataX, rowIndex) => {
                    receiverY.channel.contents.forEach((dataY, colIndex) => {
                        cellIndex++;
                        const xValues: number[] = [];
                        const yValues: number[] = [];
                        const colorValues: number[] = [];

                        const keysX = dataX.dataArray.map((el: any) => el.key);
                        const keysY = dataY.dataArray.map((el: any) => el.key);
                        const keysColor = dataColor.dataArray.map((el: any) => el.key);
                        if (
                            keysX.length === keysY.length &&
                            keysX.length === keysColor.length &&
                            !keysX.some((el, index) => el !== keysY[index] || el !== keysColor[index])
                        ) {
                            keysX.forEach((key) => {
                                const dataPointX = dataX.dataArray.find((el: any) => el.key === key);
                                const dataPointY = dataY.dataArray.find((el: any) => el.key === key);
                                const dataPointColor = dataColor.dataArray.find((el: any) => el.key === key);
                                if (dataPointX && dataPointY && dataPointColor) {
                                    xValues.push(dataPointX.value as number);
                                    yValues.push(dataPointY.value as number);
                                    colorValues.push(dataPointColor.value as number);
                                }
                            });
                        }

                        const trace: Partial<PlotData> = {
                            x: xValues,
                            y: yValues,
                            mode: "markers",
                            marker: {
                                size: 5,
                                color: colorValues,
                                colorscale: colorScale,
                                colorbar: cellIndex === 1 ? colorBar : undefined,
                            },
                            showlegend: false,
                            type: "scattergl",
                        };

                        figure.addTrace(trace, rowIndex + 1, colIndex + 1);

                        if (rowIndex === 0) {
                            const patch: Partial<Layout> = {
                                [`xaxis${cellIndex}`]: {
                                    title: makePlotTitle(dataX),
                                    font,
                                },
                            };
                            figure.updateLayout(patch);
                        }
                        if (colIndex === 0) {
                            const patch: Partial<Layout> = {
                                [`yaxis${cellIndex}`]: {
                                    title: makePlotTitle(dataY),
                                    font,
                                },
                            };
                            figure.updateLayout(patch);
                        }
                    });
                });

                setPlot(figure.makePlot());
            }
        });
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {plot}
        </div>
    );
};

View.displayName = "View";
