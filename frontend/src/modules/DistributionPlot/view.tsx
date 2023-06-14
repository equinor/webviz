import React from "react";

import { BroadcastChannelKeyCategory, BroadcastChannelMeta, broadcaster } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

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

export const view = ({ moduleContext, workbenchServices }: ModuleFCProps<State>) => {
    const plotType = moduleContext.useStoreValue("plotType");
    const channelNameX = moduleContext.useStoreValue("channelNameX");
    const channelNameY = moduleContext.useStoreValue("channelNameY");
    const channelNameZ = moduleContext.useStoreValue("channelNameZ");
    const numBins = moduleContext.useStoreValue("numBins");
    const orientation = moduleContext.useStoreValue("orientation");

    const [highlightedKey, setHighlightedKey] = React.useState<number | null>(null);
    const [dataX, setDataX] = React.useState<any[] | null>(null);
    const [dataY, setDataY] = React.useState<any[] | null>(null);
    const [dataZ, setDataZ] = React.useState<any[] | null>(null);
    const [metaDataX, setMetaDataX] = React.useState<BroadcastChannelMeta | null>(null);
    const [metaDataY, setMetaDataY] = React.useState<BroadcastChannelMeta | null>(null);
    const [metaDataZ, setMetaDataZ] = React.useState<BroadcastChannelMeta | null>(null);

    const channelX = broadcaster.getChannel(channelNameX ?? "");
    const channelY = broadcaster.getChannel(channelNameY ?? "");
    const channelZ = broadcaster.getChannel(channelNameZ ?? "");

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    React.useEffect(() => {
        if (channelX) {
            const handleChannelXChanged = (data: any, metaData: BroadcastChannelMeta) => {
                setDataX(data);
                setMetaDataX(metaData);
            };

            const handleChannelXRemoved = () => {
                setDataX(null);
                setMetaDataX(null);
            };

            const unsubscribeFunc = channelX.subscribe(handleChannelXChanged, handleChannelXRemoved);

            return unsubscribeFunc;
        }
    }, [channelX]);

    React.useEffect(() => {
        if (channelY) {
            const handleChannelYChanged = (data: any, metaData: BroadcastChannelMeta) => {
                setDataY(data);
                setMetaDataY(metaData);
            };

            const handleChannelYRemoved = () => {
                setDataY(null);
                setMetaDataY(null);
            };

            const unsubscribeFunc = channelY.subscribe(handleChannelYChanged, handleChannelYRemoved);

            return unsubscribeFunc;
        }
    }, [channelY]);

    React.useEffect(() => {
        if (channelZ) {
            const handleChannelZChanged = (data: any, metaData: BroadcastChannelMeta) => {
                setDataZ(data);
                setMetaDataZ(metaData);
            };

            const handleChannelZRemoved = () => {
                setDataZ(null);
                setMetaDataZ(null);
            };

            const unsubscribeFunc = channelZ.subscribe(handleChannelZChanged, handleChannelZRemoved);

            return unsubscribeFunc;
        }
    }, [channelZ]);

    React.useEffect(() => {
        if (channelX?.getDataDef().key === BroadcastChannelKeyCategory.Realization) {
            workbenchServices.subscribe("global.hoverRealization", (data) => {
                if (data.realization !== undefined) {
                    setHighlightedKey(data.realization);
                }
            });
        }
    }, [channelX, workbenchServices]);

    const handleHoverChanged = (data: any) => {
        if (channelX?.getDataDef().key === BroadcastChannelKeyCategory.Realization) {
            workbenchServices.publishGlobalData("global.hoverRealization", {
                realization: data !== null ? (data as number) : -1,
            });
        }
    };

    const makeContent = (): React.ReactNode => {
        if (plotType === null) {
            return "Please select a plot type.";
        }

        if (plotType === PlotType.Histogram) {
            if (dataX === null) {
                return "Please select a channel for the x-axis.";
            }

            const xValues = dataX.map((el: any) => el.value);
            const xMin = Math.min(...xValues);
            const xMax = Math.max(...xValues);
            const binSize = (xMax - xMin) / numBins;
            const bins: { from: number; to: number }[] = Array.from({ length: numBins }, (_, i) => ({
                from: xMin + i * binSize,
                to: xMin + (i + 1) * binSize,
            }));
            bins[bins.length - 1].to = xMax + 1e-6; // make sure the last bin includes the max value
            const binValues: number[] = bins.map(
                (range) => xValues.filter((el) => el >= range.from && el < range.to).length
            );

            const binStrings = bins.map((range) => `${nFormatter(range.from, 2)}-${nFormatter(range.to, 2)}`);

            return (
                <Histogram
                    key="histogram"
                    x={binStrings}
                    y={binValues}
                    xAxisTitle={`${metaDataX?.description ?? ""} [${metaDataX?.unit ?? ""}]`}
                    yAxisTitle={channelX?.getDataDef().key ?? ""}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                />
            );
        }

        if (plotType === PlotType.BarChart) {
            if (dataX === null) {
                return "Please select a channel for the x-axis.";
            }

            const keyData = dataX.map((el: any) => el.key);
            const valueData = dataX.map((el: any) => el.value);

            const keyTitle = channelX?.getDataDef().key ?? "";
            const valueTitle = `${metaDataX?.description ?? ""} [${metaDataX?.unit ?? ""}]`;

            return (
                <BarChart
                    key="barchart"
                    x={orientation === "h" ? valueData : keyData}
                    y={orientation === "h" ? keyData : valueData}
                    xAxisTitle={orientation === "h" ? valueTitle : keyTitle}
                    yAxisTitle={orientation === "h" ? keyTitle : valueTitle}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                    orientation={orientation}
                    onHoverData={handleHoverChanged}
                    keyData={keyData}
                    highlightedKey={highlightedKey ?? undefined}
                />
            );
        }

        if (plotType === PlotType.Scatter) {
            if (!dataX || !dataY) {
                return "Please select a channel for the x-axis and the y-axis.";
            }

            const xValues: number[] = [];
            const yValues: number[] = [];

            const keysX = dataX.map((el: any) => el.key);
            const keysY = dataY.map((el: any) => el.key);
            if (keysX.length === keysY.length && !keysX.some((el, index) => el !== keysY[index])) {
                keysX.forEach((key) => {
                    const dataPointX = dataX.find((el: any) => el.key === key);
                    const dataPointY = dataY.find((el: any) => el.key === key);
                    xValues.push(dataPointX.value);
                    yValues.push(dataPointY.value);
                });
            }

            return (
                <ScatterPlot
                    key="scatter"
                    x={xValues}
                    y={yValues}
                    xAxisTitle={`${metaDataX?.description ?? ""} [${metaDataX?.unit ?? ""}]`}
                    yAxisTitle={`${metaDataY?.description ?? ""} [${metaDataY?.unit ?? ""}]`}
                    keyData={keysX}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                    onHoverData={handleHoverChanged}
                    highlightedKey={highlightedKey ?? undefined}
                />
            );
        }

        if (plotType === PlotType.ScatterWithColorMapping) {
            if (!dataX || !dataY || !dataZ) {
                return "Please select a channel for the x-axis, the y-axis and the color mapping.";
            }

            const xValues: number[] = [];
            const yValues: number[] = [];
            const zValues: number[] = [];

            const keysX = dataX.map((el: any) => el.key);
            const keysY = dataY.map((el: any) => el.key);
            const keysZ = dataZ.map((el: any) => el.key);
            if (
                keysX.length === keysY.length &&
                keysY.length === keysZ.length &&
                !keysX.some((el, index) => el !== keysY[index]) &&
                !keysX.some((el, index) => el !== keysZ[index])
            ) {
                keysX.forEach((key) => {
                    const dataPointX = dataX.find((el: any) => el.key === key);
                    const dataPointY = dataY.find((el: any) => el.key === key);
                    const dataPointZ = dataZ.find((el: any) => el.key === key);
                    xValues.push(dataPointX.value);
                    yValues.push(dataPointY.value);
                    zValues.push(dataPointZ.value);
                });
            }

            return (
                <ScatterPlotWithColorMapping
                    key="scatter-with-colormapping"
                    x={xValues}
                    y={yValues}
                    z={zValues}
                    keyData={keysX}
                    highlightedKey={highlightedKey ?? undefined}
                    xAxisTitle={`${metaDataX?.description ?? ""} [${metaDataX?.unit ?? ""}]`}
                    yAxisTitle={`${metaDataY?.description ?? ""} [${metaDataY?.unit ?? ""}]`}
                    zAxisTitle={`${metaDataZ?.description ?? ""} [${metaDataZ?.unit ?? ""}]`}
                    width={wrapperDivSize.width}
                    onHoverData={handleHoverChanged}
                    height={wrapperDivSize.height}
                />
            );
        }
    };

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
};
