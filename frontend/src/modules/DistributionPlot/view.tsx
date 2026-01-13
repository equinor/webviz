import React from "react";

import { Warning } from "@mui/icons-material";
import type { Layout, PlotData } from "plotly.js";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import type { ChannelReceiverChannelContent, ChannelReceiverReturnData } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";
import { useColorSet, useContinuousColorScale } from "@framework/WorkbenchSettings";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Size2D } from "@lib/utils/geometry";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { ContentWarning } from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";
import { makeHistogramTrace } from "@modules/_shared/histogram";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { Interfaces } from "./interfaces";
import { BarSortBy, PlotType } from "./typesAndEnums";
import { makeHoverText, makeHoverTextWithColor, makeTitleFromChannelContent } from "./utils/stringUtils";
import { calcTextSize } from "./utils/textSize";

const MAX_NUM_PLOTS = 12;

export const View = ({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const sharedXAxes = viewContext.useSettingsToViewInterfaceValue("sharedXAxes");
    const sharedYAxes = viewContext.useSettingsToViewInterfaceValue("sharedYAxes");
    const numBins = viewContext.useSettingsToViewInterfaceValue("numBins");
    const orientation = viewContext.useSettingsToViewInterfaceValue("orientation");
    const barSortBy = viewContext.useSettingsToViewInterfaceValue("barSortBy");

    const statusWriter = useViewStatusWriter(viewContext);
    const colorSet = useColorSet(workbenchSettings);
    const seqColorScale = useContinuousColorScale(workbenchSettings, {
        gradientType: ColorScaleGradientType.Sequential,
    });

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

    statusWriter.setLoading(receiverX.isPending || receiverY.isPending || receiverColorMapping.isPending);

    const content = React.useMemo(() => {
        // Validate X channel (required for all plot types)
        if (!receiverX.channel) {
            return <ChannelNotConnectedMessage displayName={receiverX.displayName} />;
        }
        if (receiverX.channel.contents.length === 0) {
            return <NoDataMessage displayName={receiverX.displayName} />;
        }

        // Validate Y channel (required for scatter plots)
        const needsYChannel = plotType === PlotType.Scatter || plotType === PlotType.ScatterWithColorMapping;
        if (needsYChannel) {
            if (!receiverY.channel) {
                return <ChannelNotConnectedMessage displayName={receiverY.displayName} />;
            }
            if (receiverY.channel.contents.length === 0) {
                return <NoDataMessage displayName={receiverY.displayName} />;
            }
        }

        // Validate color mapping channel (required for scatter with color)
        if (plotType === PlotType.ScatterWithColorMapping) {
            if (!receiverColorMapping.channel) {
                return <ChannelNotConnectedMessage displayName={receiverColorMapping.displayName} />;
            }
            if (receiverColorMapping.channel.contents.length === 0) {
                return <NoDataMessage displayName={receiverColorMapping.displayName} />;
            }
        }

        const channelX = receiverX.channel;

        if (plotType === PlotType.Histogram) {
            return renderHistogramPlot({
                channelX,
                size: wrapperDivSize,
                sharedXAxes,
                sharedYAxes,
                numBins,
                colorSet,
            });
        }

        if (plotType === PlotType.BarChart) {
            return renderBarChart({
                channelX,
                size: wrapperDivSize,
                orientation,
                barSortBy,
                colorSet,
            });
        }

        if ((plotType === PlotType.Scatter || plotType === PlotType.ScatterWithColorMapping) && receiverY.channel) {
            const dataColor: ChannelReceiverChannelContent<KeyKind.REALIZATION[]> | null =
                plotType === PlotType.ScatterWithColorMapping
                    ? (receiverColorMapping.channel?.contents[0] ?? null)
                    : null;

            return renderScatterPlot({
                channelX,
                channelY: receiverY.channel,
                dataColor,
                size: wrapperDivSize,
                sharedXAxes,
                sharedYAxes,
                colorSet,
                colorScale: seqColorScale.getPlotlyColorScale(),
            });
        }

        return null;
    }, [
        receiverX.channel,
        receiverX.displayName,
        receiverY.channel,
        receiverY.displayName,
        receiverColorMapping.channel,
        receiverColorMapping.displayName,
        plotType,
        numBins,
        orientation,
        barSortBy,
        sharedXAxes,
        sharedYAxes,
        wrapperDivSize,
        colorSet,
        seqColorScale,
    ]);

    // "overflow-hidden" in order to avoid flickering when zooming in browser (chrome)
    return (
        <div className="w-full h-full overflow-hidden" ref={wrapperDivRef}>
            {content}
        </div>
    );
};

View.displayName = "View";

function calcGridDimensions(numContents: number): { numRows: number; numCols: number } {
    const numCols = Math.floor(Math.sqrt(numContents));
    const numRows = Math.ceil(numContents / numCols);
    return { numRows, numCols };
}

function MaxNumberPlotsExceededMessage(): React.ReactElement {
    return (
        <ContentWarning>
            <Warning fontSize="large" className="mb-2" />
            Too many plots to display. Due to performance limitations, the number of plots is limited to {MAX_NUM_PLOTS}
            .
        </ContentWarning>
    );
}

function ChannelNotConnectedMessage({ displayName }: { displayName: string }): React.ReactElement {
    return (
        <ContentInfo>
            Connect a channel to <Tag label={displayName} />
        </ContentInfo>
    );
}

function NoDataMessage({ displayName }: { displayName: string }): React.ReactElement {
    return (
        <ContentInfo>
            No data on <Tag label={displayName} />
        </ContentInfo>
    );
}

// --- Histogram Plot ---
interface HistogramPlotOptions {
    channelX: ChannelReceiverReturnData<KeyKind.REALIZATION[]>["channel"] & {};
    size: Size2D;
    sharedXAxes: boolean;
    sharedYAxes: boolean;
    numBins: number;
    colorSet: ColorSet;
}

function renderHistogramPlot(options: HistogramPlotOptions): React.ReactElement {
    const { channelX, size, sharedXAxes, sharedYAxes, numBins, colorSet } = options;

    const numContents = channelX.contents.length;
    if (numContents > MAX_NUM_PLOTS) {
        return <MaxNumberPlotsExceededMessage />;
    }

    const { numRows, numCols } = calcGridDimensions(numContents);
    const figure = makeSubplots({
        numRows,
        numCols,
        width: size.width,
        height: size.height,
        sharedXAxes,
        sharedYAxes,
        verticalSpacing: 100 / (size.height - 50),
        horizontalSpacing: 0.2 / numCols,
        margin: { t: 0, r: 20, b: 50, l: 90 },
    });

    channelX.contents.forEach((data, cellIndex) => {
        const rowIndex = Math.floor(cellIndex / numCols);
        const colIndex = cellIndex % numCols;
        const xValues = data.dataArray.map((el) => el.value);

        figure.addTrace(
            makeHistogramTrace({ xValues, numBins, color: colorSet.getFirstColor() }),
            rowIndex + 1,
            colIndex + 1,
        );

        figure.updateLayout({
            [`xaxis${cellIndex + 1}`]: {
                title: { text: makeTitleFromChannelContent(data) },
                tickangle: 0,
                tickson: "boundaries",
                ticklabeloverflow: "hide past div",
            },
            [`yaxis${cellIndex + 1}`]: {
                title: { text: "Percentage (%)" },
            },
        } as Partial<Layout>);
    });

    return <Plot data={figure.makeData()} layout={figure.makeLayout()} />;
}

// --- Bar Chart ---
interface BarChartOptions {
    channelX: ChannelReceiverReturnData<KeyKind.REALIZATION[]>["channel"] & {};
    size: Size2D;
    orientation: "v" | "h";
    barSortBy: BarSortBy;
    colorSet: ColorSet;
}

function renderBarChart(options: BarChartOptions): React.ReactElement {
    const { channelX, size, orientation, barSortBy, colorSet } = options;

    const numContents = channelX.contents.length;
    if (numContents > MAX_NUM_PLOTS) {
        return <MaxNumberPlotsExceededMessage />;
    }

    const { numRows, numCols } = calcGridDimensions(numContents);
    const figure = makeSubplots({
        numRows,
        numCols,
        width: size.width,
        height: size.height,
        sharedXAxes: false,
        sharedYAxes: false,
        verticalSpacing: 100 / (size.height - 50),
        horizontalSpacing: 0.2 / numCols,
        margin: { t: 0, r: 20, b: 50, l: 90 },
    });

    const kindOfKeyTitle = `${channelX.kindOfKey}`;

    channelX.contents.forEach((data, cellIndex) => {
        const rowIndex = Math.floor(cellIndex / numCols);
        const colIndex = cellIndex % numCols;
        const keyData = data.dataArray.map((el) => el.key);
        const valueData = data.dataArray.map((el) => el.value);
        const dataTitle = makeTitleFromChannelContent(data);

        const isHorizontal = orientation === "h";
        const sortByValue = barSortBy === BarSortBy.Value;

        const trace: Partial<PlotData> = {
            x: isHorizontal ? valueData : keyData,
            y: isHorizontal ? keyData : valueData,
            marker: { size: 5, color: colorSet.getFirstColor() },
            showlegend: false,
            type: "bar",
            orientation,
            hovertemplate: data.dataArray.map(
                (el) =>
                    `${kindOfKeyTitle}: <b>${el.key}</b><br>${dataTitle}: <b>${formatNumber(Number(el.value))}</b><extra></extra>`,
            ),
            hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
        };

        figure.addTrace(trace, rowIndex + 1, colIndex + 1);

        const xSortDescending = !isHorizontal && sortByValue;
        const ySortDescending = isHorizontal && sortByValue;

        figure.updateLayout({
            [`xaxis${cellIndex + 1}`]: {
                title: { text: isHorizontal ? dataTitle : `${kindOfKeyTitle} (hover to see values)` },
                type: xSortDescending ? "category" : "linear",
                categoryorder: xSortDescending ? "total descending" : "trace",
                showticklabels: !xSortDescending,
            },
            [`yaxis${cellIndex + 1}`]: {
                title: { text: isHorizontal ? `${kindOfKeyTitle} (hover to see values)` : dataTitle },
                type: ySortDescending ? "category" : "linear",
                categoryorder: ySortDescending ? "total descending" : "trace",
                showticklabels: !ySortDescending,
            },
        } as Partial<Layout>);
    });

    return <Plot data={figure.makeData()} layout={figure.makeLayout()} />;
}

// --- Scatter Plot ---
interface ScatterPlotOptions {
    channelX: ChannelReceiverReturnData<KeyKind.REALIZATION[]>["channel"] & {};
    channelY: ChannelReceiverReturnData<KeyKind.REALIZATION[]>["channel"] & {};
    dataColor: ChannelReceiverChannelContent<KeyKind.REALIZATION[]> | null;
    size: Size2D;
    sharedXAxes: boolean;
    sharedYAxes: boolean;
    colorSet: ColorSet;
    colorScale: [number, string][];
}

function renderScatterPlot(options: ScatterPlotOptions): React.ReactElement {
    const { channelX, channelY, dataColor, size, sharedXAxes, sharedYAxes, colorSet, colorScale } = options;

    const numPlots = channelX.contents.length * channelY.contents.length;
    if (numPlots > MAX_NUM_PLOTS) {
        return <MaxNumberPlotsExceededMessage />;
    }

    // When there's only 1 X value, stack Y values vertically to share X axis
    const singleXValue = channelX.contents.length === 1;
    const singleYValue = channelY.contents.length === 1;
    const numRows = singleXValue ? channelY.contents.length : channelX.contents.length;
    const numCols = singleXValue ? channelX.contents.length : channelY.contents.length;

    const figure = makeSubplots({
        numRows,
        numCols,
        width: size.width,
        height: size.height,
        sharedXAxes,
        sharedYAxes,
        verticalSpacing: 20 / (size.height - 80),
        horizontalSpacing: 20 / (size.width - 80),
        margin: { t: 0, r: 0, b: 80, l: 80 },
    });

    const font = {
        size: calcTextSize({
            width: size.width,
            height: size.height,
            numPlotsX: numCols,
            numPlotsY: numRows,
        }),
    };

    let cellIndex = 0;

    channelX.contents.forEach((contentX, xIndex) => {
        channelY.contents.forEach((contentY, yIndex) => {
            cellIndex++;
            const rowIndex = singleXValue ? yIndex : xIndex;
            const colIndex = singleXValue ? xIndex : yIndex;

            const traceData = buildScatterTraceData(contentX, contentY, dataColor);
            const markerColor = getMarkerColor(contentX, contentY, colorSet);
            const markerFillColor = `${markerColor}80`;
            const markerLineColor = `${markerColor}FF`;

            const trace: Partial<PlotData> = {
                x: traceData.xValues,
                y: traceData.yValues,
                mode: "markers",
                marker: {
                    symbol: "circle",
                    size: 10,
                    color: dataColor ? traceData.colorValues : markerFillColor,
                    opacity: 1,
                    line: {
                        color: dataColor ? undefined : markerLineColor,
                        width: 1,
                    },
                    colorscale: dataColor ? colorScale : undefined,
                    colorbar:
                        dataColor && cellIndex === 1
                            ? { title: makeTitleFromChannelContent(dataColor), titleside: "right" }
                            : undefined,
                },
                showlegend: false,
                type: "scatter",
                hovertemplate: traceData.realizations.map((real) =>
                    dataColor
                        ? makeHoverTextWithColor(contentX, contentY, dataColor, real)
                        : makeHoverText(contentX, contentY, real),
                ),
                hoverlabel: {
                    bgcolor: "white",
                    font: { size: 12, color: "black" },
                },
            };

            figure.addTrace(trace, rowIndex + 1, colIndex + 1);

            updateScatterAxisLayout(figure, cellIndex, {
                contentX,
                contentY,
                rowIndex,
                colIndex,
                numRows,
                numCols,
                singleXValue,
                singleYValue,
                sharedXAxes,
                sharedYAxes,
                font,
            });
        });
    });

    figure.updateLayout({ margin: { t: 5, r: 5 }, font, autosize: true });
    return <Plot data={figure.makeData()} layout={figure.makeLayout()} />;
}

function buildScatterTraceData(
    contentX: ChannelReceiverChannelContent<KeyKind.REALIZATION[]>,
    contentY: ChannelReceiverChannelContent<KeyKind.REALIZATION[]>,
    dataColor: ChannelReceiverChannelContent<KeyKind.REALIZATION[]> | null,
): { xValues: number[]; yValues: number[]; colorValues: number[]; realizations: number[] } {
    const keysX = contentX.dataArray.map((el) => el.key).sort((a, b) => (a as number) - (b as number));
    const keysY = contentY.dataArray.map((el) => el.key).sort((a, b) => (a as number) - (b as number));
    const keysColor = dataColor?.dataArray.map((el) => el.key).sort((a, b) => (a as number) - (b as number)) ?? [];

    const keysMatch =
        keysX.length === keysY.length &&
        (dataColor === null || keysColor.length === keysX.length) &&
        keysX.every((key, i) => key === keysY[i] && (dataColor === null || key === keysColor[i]));

    const xValues: number[] = [];
    const yValues: number[] = [];
    const colorValues: number[] = [];
    const realizations: number[] = [];

    if (keysMatch) {
        keysX.forEach((key) => {
            const pointX = contentX.dataArray.find((el) => el.key === key);
            const pointY = contentY.dataArray.find((el) => el.key === key);
            const pointColor = dataColor?.dataArray.find((el) => el.key === key);

            if (pointX && pointY) {
                xValues.push(pointX.value as number);
                yValues.push(pointY.value as number);
                if (pointColor) colorValues.push(pointColor.value as number);
                realizations.push(key as number);
            }
        });
    }

    return { xValues, yValues, colorValues, realizations };
}

function getMarkerColor(
    contentX: ChannelReceiverChannelContent<KeyKind.REALIZATION[]>,
    contentY: ChannelReceiverChannelContent<KeyKind.REALIZATION[]>,
    colorSet: ColorSet,
): string {
    const { preferredColor: prefColorX } = contentX.metaData;
    const { preferredColor: prefColorY } = contentY.metaData;
    if (prefColorX && prefColorY && prefColorX === prefColorY) {
        return prefColorX;
    }
    return colorSet.getFirstColor();
}

interface AxisLayoutOptions {
    contentX: ChannelReceiverChannelContent<KeyKind.REALIZATION[]>;
    contentY: ChannelReceiverChannelContent<KeyKind.REALIZATION[]>;
    rowIndex: number;
    colIndex: number;
    numRows: number;
    numCols: number;
    singleXValue: boolean;
    singleYValue: boolean;
    sharedXAxes: boolean;
    sharedYAxes: boolean;
    font: { size: number };
}

function updateScatterAxisLayout(figure: Figure, cellIndex: number, opts: AxisLayoutOptions): void {
    const {
        contentX,
        contentY,
        rowIndex,
        colIndex,
        numRows,
        singleXValue,
        singleYValue,
        sharedXAxes,
        sharedYAxes,
        font,
    } = opts;

    const isBottomRow = rowIndex === numRows - 1;
    const isLeftColumn = colIndex === 0;

    // Show X title: always if multiple X values, otherwise only on bottom row
    const showXTitle = !singleXValue || isBottomRow;
    // Show Y title: always if multiple Y values, otherwise only on left column
    const showYTitle = !singleYValue || isLeftColumn;

    // Tick labels: hide interior ones only when axes are shared AND content is the same
    const showXTickLabels = !sharedXAxes || !singleXValue || isBottomRow;
    const showYTickLabels = !sharedYAxes || !singleYValue || isLeftColumn;

    figure.updateLayout({
        [`xaxis${cellIndex}`]: {
            title: showXTitle ? { text: makeTitleFromChannelContent(contentX), font } : undefined,
            showticklabels: showXTickLabels,
        },
        [`yaxis${cellIndex}`]: {
            title: showYTitle ? { text: makeTitleFromChannelContent(contentY), font } : undefined,
            showticklabels: showYTickLabels,
        },
    } as Partial<Layout>);
}
