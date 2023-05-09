import React from "react";

import { broadcaster, useChannelData } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { BroadcastChannelTypes } from "@modules/SimulationTimeSeries/broadcastChannel";

import PlotlyScatter from "./plotlyScatterChart";
import { State } from "./state";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const timeStep = moduleContext.useStoreValue("timeStep");
    const channelNameX = moduleContext.useStoreValue("channelNameX");
    const channelNameY = moduleContext.useStoreValue("channelNameY");
    const [dataX, setDataX] = React.useState<any[] | null>(null);
    const [dataY, setDataY] = React.useState<any[] | null>(null);

    const channelX = broadcaster.getChannel(channelNameX ?? "");
    const channelY = broadcaster.getChannel(channelNameY ?? "");

    React.useEffect(() => {
        if (channelX) {
            const handleChannelXChanged = (data: any) => {
                setDataX(data);
            };

            const unsubscribeFunc = channelX.subscribe(handleChannelXChanged);

            return unsubscribeFunc;
        }
    }, [channelX]);

    React.useEffect(() => {
        if (channelY) {
            const handleChannelYChanged = (data: any) => {
                setDataY(data);
            };

            const unsubscribeFunc = channelY.subscribe(handleChannelYChanged);

            return unsubscribeFunc;
        }
    }, [channelY]);

    const xValues: number[] = [];
    const yValues: number[] = [];

    if (dataX && dataY && timeStep) {
        const filteredDataX = dataX.filter((el) => ("datetime" in el ? el.datetime === parseInt(timeStep, 10) : true));
        const filteredDataY = dataY.filter((el) => ("datetime" in el ? el.datetime === parseInt(timeStep, 10) : true));
        const keysX = filteredDataX.map((el: any) => el.realization);
        const keysY = filteredDataY.map((el: any) => el.realization);
        if (keysX.length === keysY.length && !keysX.some((el, index) => el !== keysY[index])) {
            keysX.forEach((key) => {
                const dataPointX = filteredDataX.find((el: any) => el.realization === key);
                const dataPointY = filteredDataY.find((el: any) => el.realization === key);
                if (filteredDataX && filteredDataY) {
                    xValues.push(dataPointX.value);
                    yValues.push(dataPointY.value);
                }
            });
        }
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {dataX && dataY && (
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
