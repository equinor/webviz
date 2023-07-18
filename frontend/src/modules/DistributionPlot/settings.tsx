import React, { ChangeEvent } from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
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
];

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices, initialSettings }: ModuleFCProps<State>) {
    const [channelNameX, setChannelNameX] = moduleContext.useStoreState("channelNameX");
    const [channelNameY, setChannelNameY] = moduleContext.useStoreState("channelNameY");
    const [channelNameZ, setChannelNameZ] = moduleContext.useStoreState("channelNameZ");
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [numBins, setNumBins] = moduleContext.useStoreState("numBins");
    const [orientation, setOrientation] = moduleContext.useStoreState("orientation");

    const channelX = moduleContext.useInputChannel("channelX");
    const channelY = moduleContext.useInputChannel("channelY");
    const channelColor = moduleContext.useInputChannel("channelColor");
    initialSettings?.applyToStateOnMount("channelNameX", "string", setChannelNameX);
    initialSettings?.applyToStateOnMount("channelNameY", "string", setChannelNameY);
    initialSettings?.applyToStateOnMount("channelNameZ", "string", setChannelNameZ);
    initialSettings?.applyToStateOnMount("plotType", "string", setPlotType);
    initialSettings?.applyToStateOnMount("numBins", "number", setNumBins);
    initialSettings?.applyToStateOnMount("orientation", "string", setOrientation);
    initialSettings?.applyToStateOnMount("crossPlottingType", "string", setCrossPlottingType);

    const handleChannelXChanged = (channelName: string) => {
        setChannelNameX(channelName);
    };

    const handlePlotTypeChanged = (value: string) => {
        setPlotType(value as PlotType);
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
        const content: React.ReactNode[] = [];
        if (channelX && !channelY && !channelColor) {
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
                <Label key="plot-type" text="Plot type">
                    <Dropdown value={plotType as PlotType} options={plotTypes} onChange={handlePlotTypeChanged} />
                </Label>
            );

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
