import React from "react";
import { createPortal } from "react-dom";

import { ChannelContentDefinition } from "@framework/DataChannelTypes";
import { ChannelReceiver } from "@framework/internal/DataChannels/ChannelReceiver";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { Overlay } from "@lib/components/Overlay";
import { Vector2 } from "@lib/utils/vector2";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { Close } from "@mui/icons-material";

export type SelectableChannel = {
    idString: string;
    displayName: string;
    contents: Omit<ChannelContentDefinition, "dataGenerator">[];
};

type ChannelContentSelectorProps = {
    multiSelect: boolean;
    channel: SelectableChannel;
    selected: boolean;
    selectedContentIdStrings: string[];
    onSelectChannel: (channelIdString: string, checked: boolean) => void;
    onSelectContent: (channelIdString: string, contentIdString: string, checked: boolean) => void;
};

const ChannelContentSelector: React.FC<ChannelContentSelectorProps> = (props) => {
    function handleChannelToggle(e: React.ChangeEvent<HTMLInputElement>) {
        props.onSelectChannel(props.channel.idString, e.currentTarget.checked);
    }

    function handleContentToggle(contentIdString: string, e: React.ChangeEvent<HTMLInputElement>) {
        props.onSelectContent(props.channel.idString, contentIdString, e.currentTarget.checked);
    }

    return (
        <div>
            <div className="p-2 hover:bg-blue-50 cursor-pointer text-sm font-bold flex items-center gap-2 h-12">
                <Checkbox onChange={handleChannelToggle} label={props.channel.displayName} checked={props.selected} />
            </div>
            <div className="relative pb-2">
                {props.selected && (
                    <div className="absolute inset-0 bg-slate-100 opacity-90 w-full h-full flex items-center justify-center text-sm">
                        {props.multiSelect
                            ? "All contents are automatically selected."
                            : "The first content is automatically selected."}
                    </div>
                )}
                {props.channel.contents.map((content, index) => (
                    <div
                        key={content.contentIdString}
                        className="flex items-center gap-1 ml-5 pl-0 p-2 hover:bg-blue-50 cursor-pointer text-sm border-l border-slate-400 h-8"
                    >
                        <span className="h-px w-2 bg-slate-400 mr-2 inline-block" />
                        <Checkbox
                            onChange={(e) => handleContentToggle(content.contentIdString, e)}
                            label={content.displayName}
                            checked={
                                (props.selected && (props.multiSelect || index === 0)) ||
                                props.selectedContentIdStrings.includes(content.contentIdString)
                            }
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

ChannelContentSelector.displayName = "ChannelSelectionItem";

export type SelectedContents = {
    channelIdString: string;
    contentIdStrings: string[];
};

export type ChannelSelectorProps = {
    receiver: ChannelReceiver;
    selectableChannels: SelectableChannel[];
    selectedChannelIdString?: string;
    selectedContents?: SelectedContents;
    position: Vector2;
    onSelect: (channelIdString: string, contentIdStrings: string[]) => void;
    onCancel: () => void;
};

export const ChannelSelector: React.FC<ChannelSelectorProps> = (props) => {
    const { onCancel } = props;
    const [selectedChannelIdString, setSelectedChannelIdString] = React.useState<string | null>(
        props.selectedChannelIdString ?? null
    );
    const [selectedContents, setSelectedContents] = React.useState<SelectedContents | null>(
        props.selectedContents ?? null
    );

    React.useEffect(() => {
        const handleClickOutside = (e: PointerEvent) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            if (target.closest("#channel-selector-header")) {
                e.preventDefault();
                return;
            }

            if (target.closest("#channel-selector")) {
                e.preventDefault();
                return;
            }
            onCancel();
        };

        document.addEventListener("pointerup", handleClickOutside, true);

        return () => {
            document.removeEventListener("pointerup", handleClickOutside, true);
        };
    }, [onCancel]);

    function handleCancelChannelSelection(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
        onCancel();
    }

    function handleSelectionDone(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
        if (selectedContents === null && selectedChannelIdString === null) {
            return;
        }
        if (selectedChannelIdString !== null) {
            props.onSelect(selectedChannelIdString, []);
            return;
        }
        if (selectedContents === null) {
            return;
        }
        props.onSelect(selectedContents.channelIdString, selectedContents.contentIdStrings);
    }

    function handleChannelToggle(channelIdString: string, checked: boolean) {
        const channel = props.selectableChannels.find((el) => el.idString === channelIdString);
        if (!channel) {
            return;
        }

        if (checked) {
            setSelectedChannelIdString(channelIdString);
        } else {
            setSelectedChannelIdString(null);
        }
    }

    function handleContentToggle(channelIdString: string, contentIdString: string, checked: boolean) {
        if (checked) {
            if (
                selectedContents === null ||
                selectedContents.channelIdString !== channelIdString ||
                !props.receiver.getHasMultiContentSupport()
            ) {
                setSelectedContents({ channelIdString: channelIdString, contentIdStrings: [contentIdString] });
                return;
            }
            setSelectedContents({
                channelIdString: channelIdString,
                contentIdStrings: [...(selectedContents.contentIdStrings ?? []), contentIdString],
            });
        } else {
            if (selectedContents === null || selectedContents.channelIdString !== channelIdString) {
                return;
            }

            setSelectedContents({
                channelIdString: channelIdString,
                contentIdStrings: selectedContents.contentIdStrings?.filter((el) => el !== contentIdString) ?? [],
            });
        }
    }

    function checkIfSelectionIsMade() {
        if (selectedContents === null && selectedChannelIdString === null) {
            return false;
        }
        if (
            selectedChannelIdString === null &&
            selectedContents !== null &&
            selectedContents.contentIdStrings.length === 0
        ) {
            return false;
        }
        return true;
    }

    const channelElementHeight = convertRemToPixels(3.5);
    const contentElementHeight = convertRemToPixels(2);

    const calculatedHeight =
        props.selectableChannels.reduce((acc, el) => {
            return acc + channelElementHeight + el.contents.length * contentElementHeight;
        }, 0) +
        convertRemToPixels(3) +
        convertRemToPixels(4) +
        4;
    const left = Math.min(props.position.x, window.innerWidth - convertRemToPixels(10) - 10);
    const top = Math.max(
        10,
        Math.min(props.position.y - calculatedHeight / 2, window.innerHeight - calculatedHeight - 10)
    );
    const maxHeight = Math.min(calculatedHeight, window.innerHeight - 20);

    return createPortal(
        <>
            <Overlay visible />
            <div
                id="channel-selector"
                className="absolute bg-white border rounded overflow-auto z-50 shadow flex flex-col w-80"
                style={{
                    left: `calc(${left}px - 10rem)`,
                    top: top,
                    maxHeight: maxHeight,
                }}
                onPointerUp={(e) => e.stopPropagation()}
            >
                <div
                    id="channel-selector-header"
                    className="px-2 bg-slate-200 font-bold flex items-center text-sm h-12"
                >
                    <div className="flex-grow">
                        Make <i className="font-bold text-green-700">{props.receiver.getDisplayName()}</i> subscribe
                        to...
                    </div>
                    <div className="hover:text-slate-500 cursor-pointer" onClick={props.onCancel}>
                        <Close fontSize="small" />
                    </div>
                </div>
                <div className="flex-grow overflow-auto">
                    {props.selectableChannels.map((channel) => (
                        <ChannelContentSelector
                            multiSelect={props.receiver.getHasMultiContentSupport()}
                            key={channel.idString}
                            channel={channel}
                            selected={selectedChannelIdString === channel.idString}
                            selectedContentIdStrings={
                                selectedContents?.channelIdString === channel.idString
                                    ? selectedContents.contentIdStrings
                                    : []
                            }
                            onSelectChannel={handleChannelToggle}
                            onSelectContent={handleContentToggle}
                        />
                    ))}
                </div>
                <div className="px-2 bg-slate-200 flex gap-2 justify-end h-16 items-center">
                    <Button onClick={handleCancelChannelSelection}>Cancel</Button>
                    <Button onClick={handleSelectionDone} disabled={!checkIfSelectionIsMade()}>
                        OK
                    </Button>
                </div>
            </div>
        </>,
        document.body
    );
};
