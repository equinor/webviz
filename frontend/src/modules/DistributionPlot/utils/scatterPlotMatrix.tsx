import Plot from "react-plotly.js";

import { DataElement, KeyType } from "@framework/DataChannelTypes";
import { ColorSet } from "@lib/utils/ColorSet";

import { Layout, PlotData } from "plotly.js";

export function makeScatterPlotMatrix(options: {
    columnData: {
        moduleInstanceId: string;
        channelIdent: string;
        contentIdent: string;
        contentName: string;
        dataArray: DataElement<KeyType.Number>[];
    }[];
    rowData: {
        moduleInstanceId: string;
        channelIdent: string;
        contentIdent: string;
        contentName: string;
        dataArray: DataElement<KeyType.Number>[];
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

    return <Plot data={plotData} layout={plotLayout} />;
}
