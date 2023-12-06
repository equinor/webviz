import React from "react";
import Plot from "react-plotly.js";

import { DataElement, KeyKind, KeyType } from "@framework/DataChannelTypes";
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
import { makeSubplots } from "./utils/Figure";
import { makeHistogram } from "./utils/histogram";
import { makePlotGrid } from "./utils/plotGrid";
import { makeScatterPlotMatrix } from "./utils/scatterPlotMatrix";

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

    const listenerX = moduleContext.useChannelReceiver({
        subscriberIdent: "channelX",
        initialSettings,
        expectedKeyKinds: [KeyKind.Realization],
    });
    const listenerY = moduleContext.useChannelReceiver({
        subscriberIdent: "channelY",
        initialSettings,
        expectedKeyKinds: [KeyKind.Realization],
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
            return makePlotGrid({
                data: listenerX.channel.contents,
                plotFunction: (data) => {
                    const xValues = data.dataArray.map((el: any) => el.value);
                    return makeHistogram({
                        title: `${data.displayName} [${data.metaData?.unit ?? ""}]`,
                        xValues,
                        numBins,
                        colorSet,
                        width: wrapperDivSize.width,
                        height: wrapperDivSize.height,
                    });
                },
                width: wrapperDivSize.width,
                height: wrapperDivSize.height,
            });
        }

        if (plotType === PlotType.BarChart) {
            return makePlotGrid({
                data: listenerX.channel.contents,
                plotFunction: (data) => {
                    const keyData = data.dataArray.map((el: any) => el.key);
                    const valueData = data.dataArray.map((el: any) => el.value);

                    const keyTitle = data.displayName;
                    const valueTitle = `${data.metaData?.unit}` ?? "";

                    return (
                        <BarChart
                            key={data.idString}
                            x={orientation === "h" ? valueData : keyData}
                            y={orientation === "h" ? keyData : valueData}
                            xAxisTitle={orientation === "h" ? valueTitle : keyTitle}
                            yAxisTitle={orientation === "h" ? keyTitle : valueTitle}
                            colorSet={colorSet}
                            keyData={keyData}
                        />
                    );
                },
                width: wrapperDivSize.width,
                height: wrapperDivSize.height,
            });
        }

        if (plotType === PlotType.Scatter) {
            const reverseRowData = [...listenerY.channel.contents];
            reverseRowData.reverse();
            const figure = makeSubplots({
                numRows: listenerX.channel.contents.length,
                numCols: listenerY.channel.contents.length,
                width: wrapperDivSize.width,
                height: wrapperDivSize.height,
            });

            listenerX.channel.contents.forEach((content, rowIndex) => {
                listenerY.channel.contents.forEach((contentY, colIndex) => {
                    const xValues = content.dataArray.map((el: any) => el.value);
                    const yValues = contentY.dataArray.map((el: any) => el.value);

                    const trace: Partial<PlotData> = {
                        x: xValues,
                        y: yValues,
                        mode: "markers",
                        marker: {
                            size: 5,
                            color: colorSet.getColor(rowIndex),
                        },
                        type: "scatter",
                    };

                    const patch: Partial<Layout> = {
                        [`xaxis${colIndex + 1}`]: {
                            title: `${content.displayName} [${content.metaData?.unit ?? ""}]`,
                        },
                        [`yaxis${rowIndex + 1}`]: {
                            title: `${contentY.displayName} [${contentY.metaData?.unit ?? ""}]`,
                        },
                    };

                    figure.addTrace(trace, rowIndex + 1, colIndex + 1);
                    //figure.updateLayout(patch);
                });
            });
            return figure.makePlot();
            /*
            return makeScatterPlotMatrix({
                columnData: listenerX.channel.contents.map((content) => {
                    return {
                        moduleInstanceId: listenerX.channel.moduleInstanceId,
                        channelIdent: listenerX.channel.idString,
                        contentIdent: content.idString,
                        contentName: content.displayName,
                        dataArray: content.dataArray,
                    };
                }),
                rowData: reverseRowData.map((content) => {
                    return {
                        moduleInstanceId: listenerY.channel.moduleInstanceId,
                        channelIdent: listenerY.channel.idString,
                        contentIdent: content.idString,
                        contentName: content.displayName,
                        dataArray: content.dataArray,
                    };
                }),
                width: wrapperDivSize.width,
                height: wrapperDivSize.height,
                colorSet,
            });
            */
        }
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
};
