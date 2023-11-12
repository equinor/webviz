import React from "react";

import { BroadcastChannelMeta, Genre } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";

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

export const view = ({
    moduleContext,
    workbenchServices,
    initialSettings,
    workbenchSettings,
}: ModuleFCProps<State>) => {
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const numBins = moduleContext.useStoreValue("numBins");
    const orientation = moduleContext.useStoreValue("orientation");

    const [highlightedKey, setHighlightedKey] = React.useState<number | null>(null);
    const [dataX, setDataX] = React.useState<any[] | null>(null);
    const [dataY, setDataY] = React.useState<any[] | null>(null);
    const [dataColor, setDataColor] = React.useState<any[] | null>(null);
    const [metaDataX, setMetaDataX] = React.useState<BroadcastChannelMeta | null>(null);
    const [metaDataY, setMetaDataY] = React.useState<BroadcastChannelMeta | null>(null);
    const [metaDataColor, setMetaDataColor] = React.useState<BroadcastChannelMeta | null>(null);

    const channelX = moduleContext.useInputChannel("channelX", initialSettings);
    const channelY = moduleContext.useInputChannel("channelY", initialSettings);
    const channelColor = moduleContext.useInputChannel("channelColor", initialSettings);

    const colorSet = workbenchSettings.useColorSet();
    const seqColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    React.useEffect(() => {
        if (!channelX) {
            setDataX(null);
            setMetaDataX(null);
            return;
        }

        const handleChannelXChanged = (data: any | null, metaData: BroadcastChannelMeta | null) => {
            setDataX(data);
            setMetaDataX(metaData);
        };

        const unsubscribeFunc = channelX.subscribe(handleChannelXChanged);

        return unsubscribeFunc;
    }, [channelX]);

    React.useEffect(() => {
        if (!channelY) {
            setDataY(null);
            setMetaDataY(null);
            return;
        }

        if (plotType !== PlotType.ScatterWithColorMapping && plotType !== PlotType.Scatter) {
            setPlotType(PlotType.Scatter);
        }

        const handleChannelYChanged = (data: any | null, metaData: BroadcastChannelMeta | null) => {
            setDataY(data);
            setMetaDataY(metaData);
        };

        const unsubscribeFunc = channelY.subscribe(handleChannelYChanged);

        return unsubscribeFunc;
    }, [channelY]);

    React.useEffect(() => {
        if (!channelColor) {
            setDataColor(null);
            setMetaDataColor(null);
            return;
        }

        if (plotType !== PlotType.ScatterWithColorMapping) {
            setPlotType(PlotType.ScatterWithColorMapping);
        }

        const handleChannelColorChanged = (data: any | null, metaData: BroadcastChannelMeta | null) => {
            setDataColor(data);
            setMetaDataColor(metaData);
        };

        const unsubscribeFunc = channelColor.subscribe(handleChannelColorChanged);

        return unsubscribeFunc;
    }, [channelColor]);

    React.useEffect(() => {
        if (channelX?.getDataDef().key === Genre.Realization) {
            workbenchServices.subscribe("global.hoverRealization", (data) => {
                setHighlightedKey(data ? data.realization : null);
            });
        }
    }, [channelX, workbenchServices]);

    const handleHoverChanged = (data: any) => {
        if (channelX?.getDataDef().key === Genre.Realization) {
            workbenchServices.publishGlobalData("global.hoverRealization", {
                realization: data !== null ? (data as number) : -1,
            });
        }
    };

    function makeContent(): React.ReactNode {
        if (plotType === null) {
            return "Please select a plot type.";
        }

        if (plotType === PlotType.Histogram) {
            if (!channelX) {
                return "Please select a channel for the x-axis.";
            }
            if (dataX === null) {
                return (
                    <>
                        No data on channel <Tag label={channelX.getDisplayName()} /> yet.
                    </>
                );
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
                    colorSet={colorSet}
                />
            );
        }

        if (plotType === PlotType.BarChart) {
            if (!channelX) {
                return "Please select a channel for the x-axis.";
            }
            if (dataX === null) {
                return (
                    <>
                        No data on channel <Tag label={channelX.getName()} /> yet.
                    </>
                );
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
                    colorSet={colorSet}
                />
            );
        }

        if (plotType === PlotType.Scatter) {
            if (!channelX) {
                return "Please select a channel for the x-axis.";
            }

            if (!channelY) {
                return "Please select a channel for the y-axis.";
            }

            if (dataX === null) {
                return (
                    <>
                        No data on channel <Tag label={channelX.getName()} /> yet.
                    </>
                );
            }
            if (dataY === null) {
                return (
                    <>
                        No data on channel <Tag label={channelY.getName()} /> yet.
                    </>
                );
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
            if (!channelX) {
                return "Please select a channel for the x-axis.";
            }

            if (!channelY) {
                return "Please select a channel for the y-axis.";
            }

            if (!channelColor) {
                return "Please select a channel for the color mapping.";
            }

            if (dataX === null) {
                return (
                    <>
                        No data on channel <Tag label={channelX.getName()} /> yet.
                    </>
                );
            }
            if (dataY === null) {
                return (
                    <>
                        No data on channel <Tag label={channelY.getName()} /> yet.
                    </>
                );
            }
            if (dataColor === null) {
                return (
                    <>
                        No data on channel <Tag label={channelColor.getName()} /> yet.
                    </>
                );
            }

            const xValues: number[] = [];
            const yValues: number[] = [];
            const zValues: number[] = [];

            const keysX = dataX.map((el: any) => el.key);
            const keysY = dataY.map((el: any) => el.key);
            const keysZ = dataColor.map((el: any) => el.key);
            if (
                keysX.length === keysY.length &&
                keysY.length === keysZ.length &&
                !keysX.some((el, index) => el !== keysY[index]) &&
                !keysX.some((el, index) => el !== keysZ[index])
            ) {
                keysX.forEach((key) => {
                    const dataPointX = dataX.find((el: any) => el.key === key);
                    const dataPointY = dataY.find((el: any) => el.key === key);
                    const dataPointZ = dataColor.find((el: any) => el.key === key);
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
                    zAxisTitle={`${metaDataColor?.description ?? ""} [${metaDataColor?.unit ?? ""}]`}
                    width={wrapperDivSize.width}
                    onHoverData={handleHoverChanged}
                    height={wrapperDivSize.height}
                    colorScale={seqColorScale}
                />
            );
        }

        if (dataX) {
            if (plotType === PlotType.Histogram) {
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
                        colorSet={colorSet}
                    />
                );
            }

            if (plotType === PlotType.BarChart) {
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
                        colorSet={colorSet}
                    />
                );
            }
        }
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
};
