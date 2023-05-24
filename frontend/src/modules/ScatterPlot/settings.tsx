import React from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@lib/components/ChannelSelect";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";

import { State } from "./state";

const plotTypes = [
    {
        value: "histogram",
        label: "Histogram",
    },
    {
        value: "barchart",
        label: "Bar chart",
    },
    {
        value: "scatter",
        label: "Scatter",
    },
    {
        value: "scatter3d",
        label: "Scatter 3D",
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
export function settings({ moduleContext }: ModuleFCProps<State>) {
    const [channelNameX, setChannelNameX] = moduleContext.useStoreState("channelNameX");
    const [channelNameY, setChannelNameY] = moduleContext.useStoreState("channelNameY");
    const [channelNameZ, setChannelNameZ] = moduleContext.useStoreState("channelNameZ");
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [crossPlottingType, setCrossPlottingType] = React.useState<BroadcastChannelKeyCategory | null>(null);

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
        setPlotType(value);
    };

    const handleCrossPlottingTypeChanged = (value: string) => {
        setCrossPlottingType(value as BroadcastChannelKeyCategory);
    };

    const makeContent = (): React.ReactNode => {
        if (plotType === null || crossPlottingType === null) {
            return null;
        }
        const content: React.ReactNode[] = [
            <Label text="Data channel X axis" key="data-channel-x-axis">
                <ChannelSelect
                    onChange={handleChannelXChanged}
                    channelKeyCategory={crossPlottingType}
                    initialChannel={channelNameX || undefined}
                />
            </Label>,
        ];

        if (plotType === "scatter" || plotType === "scatter3d") {
            content.push(
                <Label text="Data channel Y axis" key="data-channel-y-axis">
                    <ChannelSelect
                        onChange={handleChannelYChanged}
                        channelKeyCategory={crossPlottingType}
                        initialChannel={channelNameY || undefined}
                    />
                </Label>
            );
        }

        if (plotType === "scatter3d") {
            content.push(
                <Label text="Data channel Z axis" key="data-channel-z-axis">
                    <ChannelSelect
                        onChange={handleChannelZChanged}
                        channelKeyCategory={crossPlottingType}
                        initialChannel={channelNameZ || undefined}
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
