import React from "react";

import { broadcaster } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import PlotlyScatter from "./plotlyScatterChart";
import { State } from "./state";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const channelNameX = moduleContext.useStoreValue("channelNameX");
    const channelNameY = moduleContext.useStoreValue("channelNameY");
    const [dataX, setDataX] = React.useState<any[] | null>(null);
    const [dataY, setDataY] = React.useState<any[] | null>(null);
    const [xTitle, setXTitle] = React.useState<string>("");
    const [yTitle, setYTitle] = React.useState<string>("");

    const channelX = broadcaster.getChannel(channelNameX ?? "");
    const channelY = broadcaster.getChannel(channelNameY ?? "");

    React.useEffect(() => {
        if (channelX) {
            const handleChannelXChanged = (data: any, description: string) => {
                setDataX(data);
                setXTitle(description);
            };

            const unsubscribeFunc = channelX.subscribe(handleChannelXChanged);

            return unsubscribeFunc;
        }
    }, [channelX]);

    React.useEffect(() => {
        if (channelY) {
            const handleChannelYChanged = (data: any, description: string) => {
                setDataY(data);
                setYTitle(description);
            };

            const unsubscribeFunc = channelY.subscribe(handleChannelYChanged);

            return unsubscribeFunc;
        }
    }, [channelY]);

    const xValues: number[] = [];
    const yValues: number[] = [];

    if (dataX && dataY) {
        const keysX = dataX.map((el: any) => el.key);
        const keysY = dataY.map((el: any) => el.key);
        if (keysX.length === keysY.length && !keysX.some((el, index) => el !== keysY[index])) {
            keysX.forEach((key) => {
                const dataPointX = dataX.find((el: any) => el.key === key);
                const dataPointY = dataY.find((el: any) => el.key === key);
                if (dataX && dataY) {
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
                    xAxisTitle={xTitle}
                    yAxisTitle={yTitle}
                    realizations={[]}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                />
            )}
        </div>
    );
};
