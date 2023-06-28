import React, { ChangeEvent } from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@framework/components/ChannelSelect";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Slider } from "@lib/components/Slider";

import { PlotType, State } from "./state";

const plotTypes = [
    {
        value: PlotType.Histogram,
        label: "Histogram",
    },
    {
        value: PlotType.BarChart,
        label: "Bar chart",
    },
    {
        value: PlotType.Scatter,
        label: "Scatter 2D",
    },
    {
        value: PlotType.ScatterWithColorMapping,
        label: "Scatter 2D with color mapping",
    },
];

const crossPlottingTypes = [
    {
        label: "Realization",
        value: BroadcastChannelKeyCategory.Realization,
    },
    {
        label: "Time",
        value: BroadcastChannelKeyCategory.TimestampMs,
    },
    {
        label: "Measured depth",
        value: BroadcastChannelKeyCategory.MeasuredDepth,
    },
    {
        label: "Grid index",
        value: BroadcastChannelKeyCategory.GridIndex,
    },
    {
        label: "Grid IJK",
        value: BroadcastChannelKeyCategory.GridIJK,
    },
];

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices, presetProps }: ModuleFCProps<State>) {
    const [channelNameX, setChannelNameX] = moduleContext.useStoreState("channelNameX");
    const [channelNameY, setChannelNameY] = moduleContext.useStoreState("channelNameY");
    const [channelNameZ, setChannelNameZ] = moduleContext.useStoreState("channelNameZ");
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [numBins, setNumBins] = moduleContext.useStoreState("numBins");
    const [orientation, setOrientation] = moduleContext.useStoreState("orientation");
    const [crossPlottingType, setCrossPlottingType] = React.useState<BroadcastChannelKeyCategory | null>(
        presetProps?.get<BroadcastChannelKeyCategory>("crossPlottingType", "string") || null
    );

    React.useEffect(() => {
        const presetPropsObj = {
            channelNameX: presetProps?.get<string>("channelNameX", "string"),
            channelNameY: presetProps?.get<string>("channelNameY", "string"),
            channelNameZ: presetProps?.get<string>("channelNameZ", "string"),
            plotType: presetProps?.get<PlotType>("plotType", "string"),
            numBins: presetProps?.get<number>("numBins", "number"),
            orientation: presetProps?.get<"h" | "v">("orientation", "string"),
            crossPlottingType: presetProps?.get<BroadcastChannelKeyCategory>("crossPlottingType", "string"),
        };

        if (presetPropsObj.channelNameX) {
            setChannelNameX(presetPropsObj.channelNameX);
        }

        if (presetPropsObj.channelNameY) {
            setChannelNameY(presetPropsObj.channelNameY);
        }

        if (presetPropsObj.channelNameZ) {
            setChannelNameZ(presetPropsObj.channelNameZ);
        }

        if (presetPropsObj.plotType) {
            setPlotType(presetPropsObj.plotType);
        }

        if (presetPropsObj.numBins) {
            setNumBins(presetPropsObj.numBins as number);
        }

        if (presetPropsObj.orientation) {
            setOrientation(presetPropsObj.orientation as "h" | "v");
        }

        if (presetPropsObj.crossPlottingType) {
            setCrossPlottingType(presetPropsObj.crossPlottingType as BroadcastChannelKeyCategory);
        }
    }, [presetProps]);

    const handleChannelXChanged = (channelName: string) => {
        setChannelNameX(channelName);
    };

    const handleChannelYChanged = (channelName: string) => {
        setChannelNameY(channelName);
    };

    const handleChannelZChanged = (channelName: string) => {
        setChannelNameZ(channelName);
    };

    const handlePlotTypeChanged = (value: string) => {
        setPlotType(value as PlotType);
    };

    const handleCrossPlottingTypeChanged = (value: string) => {
        setCrossPlottingType(value as BroadcastChannelKeyCategory);
    };

    const handleNumBinsChanged = (_: Event, value: number | number[]) => {
        if (Array.isArray(value)) {
            return;
        }
        setNumBins(value);
    };

    const handleOrientationChanged = (e: ChangeEvent<HTMLInputElement>) => {
        setOrientation(e.target.value as "h" | "v");
    };

    const makeContent = (): React.ReactNode => {
        if (plotType === null || crossPlottingType === null) {
            return null;
        }
        const content: React.ReactNode[] = [];

        content.push(
            <Label text="Data channel X axis" key="data-channel-x-axis">
                <ChannelSelect
                    onChange={handleChannelXChanged}
                    channelKeyCategory={crossPlottingType}
                    initialChannel={channelNameX || undefined}
                    broadcaster={workbenchServices.getBroadcaster()}
                />
            </Label>
        );

        if (plotType === PlotType.Scatter || plotType === PlotType.ScatterWithColorMapping) {
            content.push(
                <Label text="Data channel Y axis" key="data-channel-y-axis">
                    <ChannelSelect
                        onChange={handleChannelYChanged}
                        channelKeyCategory={crossPlottingType}
                        initialChannel={channelNameY || undefined}
                        broadcaster={workbenchServices.getBroadcaster()}
                    />
                </Label>
            );
        }

        if (plotType === PlotType.ScatterWithColorMapping) {
            content.push(
                <Label text="Data channel color mapping" key="data-channel-color-mapping">
                    <ChannelSelect
                        onChange={handleChannelZChanged}
                        channelKeyCategory={crossPlottingType}
                        initialChannel={channelNameZ || undefined}
                        broadcaster={workbenchServices.getBroadcaster()}
                    />
                </Label>
            );
        }

        if (plotType === PlotType.Histogram) {
            content.push(
                <Label text="Number of bins" key="number-of-bins">
                    <Slider value={numBins} onChange={handleNumBinsChanged} min={1} max={30} displayValue />
                </Label>
            );
        }

        if (plotType === PlotType.BarChart) {
            content.push(
                <Label text="Orientation" key="orientation">
                    <RadioGroup
                        options={[
                            {
                                label: "Horizontal",
                                value: "h",
                            },
                            {
                                label: "Vertical",
                                value: "v",
                            },
                        ]}
                        onChange={handleOrientationChanged}
                        value={orientation}
                    />
                </Label>
            );
        }

        return content;
    };

    return (
        <>
            <Label text="Plot type">
                <Dropdown options={plotTypes} onChange={handlePlotTypeChanged} />
            </Label>
            <Label text="Cross plotting">
                <Dropdown options={crossPlottingTypes} onChange={handleCrossPlottingTypeChanged} />
            </Label>
            {makeContent()}
        </>
    );
}
