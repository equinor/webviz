import { broadcaster } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { ChannelSelect } from "@lib/components/ChannelSelect";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";

import { State } from "./state";

export const Settings = ({ moduleContext }: ModuleFCProps<State>) => {
    const [indexColumnChannelName, setIndexColumnChannelName] = moduleContext.useStoreState("indexColumnChannel");
    const [columnChannelNames, setColumnChannelNames] = moduleContext.useStoreState("columnChannels");

    const indexColumnChannel = broadcaster.getChannel(indexColumnChannelName ?? "");

    const handleIndexColumnChannelChanged = (channel: string) => {
        setIndexColumnChannelName(channel);
    };

    const handleColumnChannelChanged = (channel: string, index: number) => {
        setColumnChannelNames((prev) => {
            const newChannels = [...prev];
            newChannels[index] = channel;
            return newChannels;
        });
    };

    return (
        <>
            <Label text="Index column">
                <ChannelSelect channel={indexColumnChannelName} onChange={handleIndexColumnChannelChanged} />
            </Label>
            {indexColumnChannel && (
                <Label text="Column channels">
                    <>
                        {columnChannelNames.map((channel, i) => (
                            <div className="flex flex-row">
                                <ChannelSelect
                                    className="flex-grow"
                                    key={i}
                                    channel={channel}
                                    channelKeyCategory={indexColumnChannel.getDataDef().key}
                                    onChange={(channel) => handleColumnChannelChanged(channel, i)}
                                />
                                <IconButton
                                    onClick={() => setColumnChannelNames((prev) => prev.filter((_, j) => j !== i))}
                                >
                                    <XMarkIcon />
                                </IconButton>
                            </div>
                        ))}
                        <Button onClick={() => setColumnChannelNames((prev) => [...prev, ""])}>Add column</Button>
                    </>
                </Label>
            )}
        </>
    );
};
