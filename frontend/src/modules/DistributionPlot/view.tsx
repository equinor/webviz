import React from "react";
import Plot from "react-plotly.js";

import { Data, Type } from "@framework/DataChannelTypes";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ColorSet } from "@lib/utils/ColorSet";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import { Layout, PlotData } from "plotly.js";

import { BarChart } from "./components/barChart";
import { Histogram } from "./components/histogram";
import { ScatterPlot } from "./components/scatterPlot";
import { ScatterPlotWithColorMapping } from "./components/scatterPlotWithColorMapping";
import { PlotType, State } from "./state";

function nFormatter(num: number, digits: number): string {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "B" },
        { value: 1e12, symbol: "T" },
        { value: 1e15, symbol: "P" },
        { value: 1e18, symbol: "E" },
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    const item = lookup
        .slice()
        .reverse()
        .find(function (item) {
            return num >= item.value;
        });
    return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}

function makeHistogram(
    title: string,
    xValues: number[],
    numBins: number,
    colorSet: ColorSet,
    width: number,
    height: number
): React.ReactNode {
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const binSize = (xMax - xMin) / numBins;
    const bins: { from: number; to: number }[] = Array.from({ length: numBins }, (_, i) => ({
        from: xMin + i * binSize,
        to: xMin + (i + 1) * binSize,
    }));
    bins[bins.length - 1].to = xMax + 1e-6; // make sure the last bin includes the max value
    const binValues: number[] = bins.map((range) => xValues.filter((el) => el >= range.from && el < range.to).length);

    const binStrings = bins.map((range) => `${nFormatter(range.from, 2)}-${nFormatter(range.to, 2)}`);

    return (
        <Histogram
            key="histogram"
            x={binStrings}
            y={binValues}
            xAxisTitle={`${title}`}
            yAxisTitle={""}
            width={width}
            height={height}
            colorSet={colorSet}
        />
    );
}

function makeScatterPlot(options: {
    xAxisTitle: string;
    yAxisTitle: string;
    dataX: Data[];
    dataY: Data[];
    width: number;
    height: number;
    keyData: number[];
}): React.ReactNode {
    const xValues: number[] = [];
    const yValues: number[] = [];

    const keysX = options.dataX.map((el: any) => el.key);
    const keysY = options.dataY.map((el: any) => el.key);
    if (keysX.length === keysY.length && !keysX.some((el, index) => el !== keysY[index])) {
        keysX.forEach((key) => {
            const dataPointX = options.dataX.find((el: any) => el.key === key);
            const dataPointY = options.dataY.find((el: any) => el.key === key);
            if (dataPointX && dataPointY) {
                xValues.push(dataPointX.value as number);
                yValues.push(dataPointY.value as number);
            }
        });
    }

    return (
        <ScatterPlot
            key="scatter"
            x={xValues}
            y={yValues}
            xAxisTitle={options.xAxisTitle}
            yAxisTitle={options.yAxisTitle}
            keyData={keysX}
            width={options.width}
            height={options.height}
        />
    );
}

function makeScatterPlotMatrix(options: {
    columnData: {
        moduleInstanceId: string;
        channelIdent: string;
        contentIdent: string;
        contentName: string;
        dataArray: Data<number>[];
    }[];
    rowData: {
        moduleInstanceId: string;
        channelIdent: string;
        contentIdent: string;
        contentName: string;
        dataArray: Data<number>[];
    }[];
    width: number;
    height: number;
    colorSet: ColorSet;
}): React.ReactNode {
    let plotLayout: Partial<Layout> = {
        width: options.width,
        height: options.height,
        grid: {
            rows: options.rowData.length,
            columns: options.columnData.length,
            pattern: "coupled",
        },
        margin: {
            t: 5,
            r: 5,
        },
    };

    const plotData: Partial<PlotData>[] = [];

    for (let row = 0; row < options.rowData.length; row++) {
        const key = `yaxis${row + 1}`;
        plotLayout = {
            ...plotLayout,
            [key]: {
                title: {
                    text: options.rowData[row].contentName,
                },
                zeroline: true,
                showgrid: true,
            },
        };
        for (let col = 0; col < options.columnData.length; col++) {
            const key = `xaxis${col + 1}`;
            plotLayout = {
                ...plotLayout,
                [key]: {
                    title: {
                        text: options.columnData[col].contentName,
                    },
                    zeroline: true,
                    showgrid: true,
                },
            };

            const dataX = options.columnData[col];
            const dataY = options.rowData[row];

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

            if (
                dataX.moduleInstanceId === dataY.moduleInstanceId &&
                dataX.channelIdent === dataY.channelIdent &&
                dataX.contentIdent === dataY.contentIdent
            ) {
                plotData.push({
                    showlegend: false,
                    xaxis: `x${col + 1}`,
                    yaxis: `y${row + 1}`,
                });
            } else {
                plotData.push({
                    x: xValues,
                    y: yValues,
                    type: "scatter",
                    mode: "markers",
                    marker: {
                        size: 10,
                        color: options.colorSet.getFirstColor(),
                    },
                    showlegend: false,
                    xaxis: `x${col + 1}`,
                    yaxis: `y${row + 1}`,
                });
            }
        }
    }

    return <Plot data={plotData} layout={plotLayout} />;
}

export const view = ({
    moduleContext,
    workbenchServices,
    initialSettings,
    workbenchSettings,
}: ModuleFCProps<State>) => {
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const numBins = moduleContext.useStoreValue("numBins");
    const orientation = moduleContext.useStoreValue("orientation");

    const colorSet = workbenchSettings.useColorSet();
    const seqColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const listenerX = moduleContext.useSubscriber<Type.Number>({
        subscriberIdent: "channelX",
        initialSettings,
        expectedValueType: Type.Number,
    });
    const listenerY = moduleContext.useSubscriber<Type.Number>({
        subscriberIdent: "channelY",
        initialSettings,
        expectedValueType: Type.Number,
    });

    function makeContent() {
        if (!listenerX.hasActiveSubscription) {
            return <ContentInfo>Connect a channel to channel X</ContentInfo>;
        }

        if (listenerX.channel.contents.length === 0) {
            return <ContentInfo>No data on channel X</ContentInfo>;
        }

        if (plotType === PlotType.Scatter || plotType === PlotType.ScatterWithColorMapping) {
            if (!listenerY.hasActiveSubscription) {
                return <ContentInfo>Connect a channel to channel Y</ContentInfo>;
            }

            if (listenerY.channel.contents.length === 0) {
                return <ContentInfo>No data on channel Y</ContentInfo>;
            }
        }

        if (plotType === PlotType.Histogram) {
            const histograms: React.ReactNode[] = [];
            const numPrograms = listenerX.channel.contents.length;
            const numCols = Math.floor(Math.sqrt(numPrograms));
            const numRows = Math.ceil(numPrograms / numCols);

            for (const program of listenerX.channel.contents) {
                const xValues = program.dataArray.map((el: any) => el.value);
                histograms.push(
                    makeHistogram(
                        `${program.name} [${program.metaData?.unit ?? ""}]`,
                        xValues,
                        numBins,
                        colorSet,
                        wrapperDivSize.width / numCols - 20,
                        wrapperDivSize.height / numRows - 20
                    )
                );
            }

            const grid: React.ReactNode[] = [];

            for (let i = 0; i < numRows; i++) {
                for (let j = 0; j < numCols; j++) {
                    const index = i * numCols + j;
                    if (index >= histograms.length) {
                        break;
                    }
                    grid.push(
                        <div
                            key={index}
                            className="flex flex-col items-center justify-center"
                            style={{
                                width: `${wrapperDivSize.width / numCols - 20}`,
                                height: `${wrapperDivSize.height / numRows - 20}`,
                            }}
                        >
                            {histograms[index]}
                        </div>
                    );
                }
            }
            return <div className="w-full h-full flex flex-row flex-wrap gap-2">{grid}</div>;
        }

        if (plotType === PlotType.Scatter) {
            return makeScatterPlotMatrix({
                columnData: listenerX.channel.contents.map((content) => {
                    return {
                        moduleInstanceId: listenerX.channel.moduleInstanceId,
                        channelIdent: listenerX.channel.ident,
                        contentIdent: content.ident,
                        contentName: content.name,
                        dataArray: content.dataArray,
                    };
                }),
                rowData: listenerY.channel.contents.map((program) => {
                    return {
                        moduleInstanceId: listenerY.channel.moduleInstanceId,
                        channelIdent: listenerY.channel.ident,
                        contentIdent: program.ident,
                        contentName: program.name,
                        dataArray: program.dataArray,
                    };
                }),
                width: wrapperDivSize.width,
                height: wrapperDivSize.height,
                colorSet,
            });

            /*
            const scatterPlots: React.ReactNode[] = [];
            const numPrograms = listenerX.programs.length;
            const numCols = Math.floor(Math.sqrt(numPrograms));
            const numRows = Math.ceil(numPrograms / numCols);

            for (let index = 0; index < listenerX.programs.length; index++) {
                const programX = listenerX.programs[index];
                const programY = listenerY.programs[index];

                const xValues = programX.content.map((el: any) => el.value);
                const yValues = programY.content.map((el: any) => el.value);

                scatterPlots.push(
                    makeScatterPlot({
                        xAxisTitle: programX.programName,
                        yAxisTitle: programY.programName,
                        dataX: programX.content,
                        dataY: programY.content,
                        width: wrapperDivSize.width / numCols - 20,
                        height: wrapperDivSize.height / numRows - 20,
                        keyData: programX.content.map((el: any) => el.key),
                    })
                );
            }

            const grid: React.ReactNode[] = [];

            for (let i = 0; i < numRows; i++) {
                for (let j = 0; j < numCols; j++) {
                    const index = i * numCols + j;
                    if (index >= scatterPlots.length) {
                        break;
                    }
                    grid.push(
                        <div
                            key={index}
                            className="flex flex-col items-center justify-center"
                            style={{
                                width: `${wrapperDivSize.width / numCols - 20}`,
                                height: `${wrapperDivSize.height / numRows - 20}`,
                            }}
                        >
                            {scatterPlots[index]}
                        </div>
                    );
                }
            }
            return <div className="w-full h-full flex flex-row flex-wrap gap-2">{grid}</div>;
            */
        }
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
};
