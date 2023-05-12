import React from "react";

import { BroadcastChannel, BroadcastChannelDef, broadcaster } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@lib/components/ChannelSelect";

import { State } from "./state";

export const View = ({ moduleContext }: ModuleFCProps<State>) => {
    const indexColumnChannelName = moduleContext.useStoreValue("indexColumnChannel");
    const columnChannelNames = moduleContext.useStoreValue("columnChannels");

    const [indexData, setIndexData] = React.useState<any[] | null>(null);
    const [indexTitle, setIndexTitle] = React.useState<string>("");
    const [columnsData, setColumnsData] = React.useState<any[] | null>(null);
    const [columnsTitles, setColumnsTitles] = React.useState<string[]>([]);
    const [columnChannels, setColumnChannels] = React.useState<(BroadcastChannel<BroadcastChannelDef> | null)[]>([]);

    const indexChannel = broadcaster.getChannel(indexColumnChannelName ?? "");

    React.useEffect(() => {
        const newColumnChannels = columnChannelNames.map((channelName) => broadcaster.getChannel(channelName ?? ""));
        setColumnChannels(newColumnChannels);
    }, [columnChannelNames]);

    React.useEffect(() => {
        if (indexChannel) {
            const handleIndexChannelChanged = (data: any, description: string) => {
                setIndexData(data);
                setIndexTitle(description);
            };

            const unsubscribeFunc = indexChannel.subscribe(handleIndexChannelChanged);

            return unsubscribeFunc;
        }
    }, [indexChannel]);

    React.useEffect(() => {
        const unsubscribeFuncs: (() => void)[] = [];
        columnChannels.forEach((channel, i) => {
            if (channel) {
                const handleColumnChannelsChanged = (data: any, description: string) => {
                    setColumnsData((prev) => {
                        let newData: any[] = [];
                        if (prev) {
                            newData = [...prev];
                        }
                        newData[i] = data;
                        return newData;
                    });

                    setColumnsTitles((prev) => {
                        const newDescriptions = [...prev];
                        newDescriptions[i] = description;
                        return newDescriptions;
                    });
                };

                const unsubscribeFunc = channel.subscribe(handleColumnChannelsChanged);

                unsubscribeFuncs.push(unsubscribeFunc);
            }
        });

        return () => {
            unsubscribeFuncs.forEach((unsubscribeFunc) => unsubscribeFunc());
        };
    }, [columnChannels]);

    if (!indexChannel || !indexData) {
        return null;
    }

    return (
        <table className="border border-slate-600 border-collapse">
            <thead>
                <tr>
                    <th>{indexChannel.getDataDef().key}</th>
                    <th>{indexTitle}</th>
                    {columnsTitles.map((channelName, i) => (
                        <th key={i}>{channelName}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {indexData &&
                    indexData.map((el, i) => (
                        <tr key={i}>
                            <td>{el.key}</td>
                            <td>{el.value}</td>
                            {columnsData && columnsData.map((column, j) => <td key={j}>{column[i].value}</td>)}
                        </tr>
                    ))}
            </tbody>
        </table>
    );
};
