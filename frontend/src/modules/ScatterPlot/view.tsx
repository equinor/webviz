import React from "react";

import { useChannelData } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { BroadcastChannelTypes } from "@modules/SimulationTimeSeries/broadcastChannel";

import PlotlyScatter from "./plotlyScatterChart";
import { State } from "./state";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const timeStep = moduleContext.useStoreValue("timeStep");
    const channelName = moduleContext.useStoreValue("channelName");

    const channelData = useChannelData<any>(channelName || "");

    let xValues: number[] = [];
    let yValues: number[] = [];

    if (channelData && timeStep) {
        const filteredData = channelData.filter((el: any) => el.datetime === parseInt(timeStep, 10));
        xValues = filteredData.map((el: any) => el.key);
        yValues = filteredData.map((el: any) => el.value);
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {channelData && (
                <PlotlyScatter
                    x={xValues}
                    y={yValues}
                    realizations={[]}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                />
            )}
        </div>
    );
};
