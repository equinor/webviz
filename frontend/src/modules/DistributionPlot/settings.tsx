import React, { ChangeEvent } from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { applyInitialSettingsToState } from "@framework/InitialSettings";
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
export function settings({ moduleContext, workbenchServices, initialSettings }: ModuleFCProps<State>) {
    const [prevChannelXName, setPrevChannelXName] = React.useState<string | null>(null);
    const [prevChannelYName, setPrevChannelYName] = React.useState<string | null>(null);
    const [prevChannelColorName, setPrevChannelColorName] = React.useState<string | null>(null);

    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [numBins, setNumBins] = moduleContext.useStoreState("numBins");
    const [orientation, setOrientation] = moduleContext.useStoreState("orientation");
    const [crossPlottingType, setCrossPlottingType] = React.useState<BroadcastChannelKeyCategory | null>(null);

    applyInitialSettingsToState(initialSettings, "plotType", "string", setPlotType);
    applyInitialSettingsToState(initialSettings, "numBins", "number", setNumBins);
    applyInitialSettingsToState(initialSettings, "orientation", "string", setOrientation);
    applyInitialSettingsToState(initialSettings, "crossPlottingType", "string", setCrossPlottingType);

    const channelX = moduleContext.useInputChannel("channelX", initialSettings);
    const channelY = moduleContext.useInputChannel("channelY", initialSettings);
    const channelColor = moduleContext.useInputChannel("channelColor", initialSettings);

    if (channelX && channelX.getName() !== prevChannelXName && crossPlottingType === null) {
        setPrevChannelXName(channelX?.getName() ?? null);
        setCrossPlottingType(channelX?.getDataDef().key ?? null);
    }

    if (channelY && channelY?.getName() !== prevChannelYName && crossPlottingType === null) {
        setPrevChannelYName(channelY?.getName() ?? null);
        setCrossPlottingType(channelY?.getDataDef().key ?? null);
    }

    if (channelColor && channelColor?.getName() !== prevChannelColorName && crossPlottingType === null) {
        setPrevChannelColorName(channelColor?.getName() ?? null);
        setCrossPlottingType(channelColor?.getDataDef().key ?? null);
    }

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
                    moduleContext={moduleContext}
                    channelName="channelX"
                    broadcaster={workbenchServices.getBroadcaster()}
                />
            </Label>
        );

        if (plotType === PlotType.Scatter || plotType === PlotType.ScatterWithColorMapping) {
            content.push(
                <Label text="Data channel Y axis" key="data-channel-y-axis">
                    <ChannelSelect
                        moduleContext={moduleContext}
                        channelName="channelY"
                        broadcaster={workbenchServices.getBroadcaster()}
                    />
                </Label>
            );
        }

        if (plotType === PlotType.ScatterWithColorMapping) {
            content.push(
                <Label text="Data channel color mapping" key="data-channel-color-mapping">
                    <ChannelSelect
                        moduleContext={moduleContext}
                        channelName="channelColor"
                        broadcaster={workbenchServices.getBroadcaster()}
                    />
                </Label>
            );
        }

        if (plotType === PlotType.Histogram) {
            content.push(
                <Label text="Number of bins" key="number-of-bins">
                    <Slider value={numBins} onChange={handleNumBinsChanged} min={1} max={30} valueLabelDisplay="auto" />
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
                <Dropdown value={plotType as string} options={plotTypes} onChange={handlePlotTypeChanged} />
            </Label>
            <Label text="Cross plotting">
                <Dropdown
                    value={crossPlottingType as string}
                    options={crossPlottingTypes}
                    onChange={handleCrossPlottingTypeChanged}
                />
            </Label>
            {makeContent()}
        </>
    );
}
