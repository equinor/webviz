import React from "react";

import { EnsembleParameterDescription, VectorDescription } from "@api";
import { BroadcastChannelKeyCategory, broadcaster } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { ChannelSelect } from "@lib/components/ChannelSelect";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { Ensemble } from "@shared-types/ensemble";

import { State } from "./state";

const plotTypes = [
    {
        value: "histogram",
        label: "Histogram",
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
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
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
            <Label text="Data channel X axis">
                <ChannelSelect onChange={handleChannelXChanged} channelKeyCategory={crossPlottingType} />
            </Label>,
        ];

        if (plotType === "scatter" || plotType === "scatter3d") {
            content.push(
                <Label text="Data channel Y axis">
                    <ChannelSelect onChange={handleChannelYChanged} channelKeyCategory={crossPlottingType} />
                </Label>
            );
        }

        if (plotType === "scatter3d") {
            content.push(
                <Label text="Data channel Z axis">
                    <ChannelSelect onChange={handleChannelZChanged} channelKeyCategory={crossPlottingType} />
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
