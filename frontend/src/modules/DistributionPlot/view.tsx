import React from "react";

import { KeyKind } from "@framework/DataChannelTypes";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import { ColorBar, Layout, PlotData } from "plotly.js";

import { DisplayMode, PlotType, State } from "./state";
import { Figure, makeSubplots } from "./utils/Figure";
import { makeHistogramBins, makeHistogramTrace } from "./utils/histogram";
import { makePlotTitle } from "./utils/stringUtils";
import { calcTextSize } from "./utils/textSize";

export const View = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
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

    statusWriter.setLoading(receiverX.isPending || receiverY.isPending || receiverColorMapping.isPending);

    function makeContent() {
        if (!receiverX.hasActiveSubscription) {
            return (
                <ContentInfo>
                    Connect a channel to <Tag label={receiverX.displayName} />
                </ContentInfo>
            );
        }

        if (receiverX.channel.contents.length === 0) {
            return (
                <ContentInfo>
                    No data on <Tag label={receiverX.displayName} />
                </ContentInfo>
            );
        }

        if (plotType === PlotType.Scatter || plotType === PlotType.ScatterWithColorMapping) {
            if (!receiverY.hasActiveSubscription) {
                return (
                    <ContentInfo>
                        Connect a channel to <Tag label={receiverY.displayName} />
                    </ContentInfo>
                );
            }

            if (receiverY.channel.contents.length === 0) {
                return (
                    <ContentInfo>
                        No data on <Tag label={receiverY.displayName} />
                    </ContentInfo>
                );
            }
        }

        if (plotType === PlotType.ScatterWithColorMapping) {
            if (!receiverColorMapping.hasActiveSubscription) {
                return (
                    <ContentInfo>
                        Connect a channel to <Tag label={receiverColorMapping.displayName} />
                    </ContentInfo>
                );
            }

            if (receiverColorMapping.channel.contents.length === 0) {
                return (
                    <ContentInfo>
                        No data on <Tag label={receiverColorMapping.displayName} />
                    </ContentInfo>
                );
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
                        width: wrapperDivSize.width,
                        height: wrapperDivSize.height,
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

            return figure.makePlot();
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

            return figure.makePlot();
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
                            color: colorSet.getFirstColor(),
                        },
                        showlegend: false,
                        type: "scatter",
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
            return figure.makePlot();
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
                        type: "scatter",
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
            return figure.makePlot();
        }
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
};

View.displayName = "View";
