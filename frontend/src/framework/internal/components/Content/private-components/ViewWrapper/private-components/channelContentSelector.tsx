import React from "react";
import { createPortal } from "react-dom";

import { ContentDefinition } from "@framework/DataChannelTypes";
import { Subscriber } from "@framework/internal/DataChannels/Subscriber";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { Overlay } from "@lib/components/Overlay";
import { Point } from "@lib/utils/geometry";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { Close } from "@mui/icons-material";

export type SelectableChannel = {
    ident: string;
    name: string;
    contents: ContentDefinition[];
};

type ChannelContentSelectorProps = {
    multiSelect: boolean;
    channel: SelectableChannel;
    selected: boolean;
    selectedContentIdents: string[];
    onSelectChannel: (channelIdent: string, checked: boolean) => void;
    onSelectContent: (channelIdent: string, contentIdent: string, checked: boolean) => void;
};

const ChannelContentSelector: React.FC<ChannelContentSelectorProps> = (props) => {
    function handleChannelToggle(e: React.ChangeEvent<HTMLInputElement>) {
        props.onSelectChannel(props.channel.ident, e.currentTarget.checked);
    }

    function handleContentToggle(contentIdent: string, e: React.ChangeEvent<HTMLInputElement>) {
        props.onSelectContent(props.channel.ident, contentIdent, e.currentTarget.checked);
    }

    return (
        <div>
            <div className="p-2 hover:bg-blue-50 cursor-pointer text-sm font-bold flex items-center gap-2 h-12">
                <Checkbox onChange={handleChannelToggle} label={props.channel.name} checked={props.selected} />
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
                        key={content.ident}
                        className="flex items-center gap-1 ml-5 pl-0 p-2 hover:bg-blue-50 cursor-pointer text-sm border-l border-slate-400 h-8"
                    >
                        <span className="h-px w-2 bg-slate-400 mr-2 inline-block" />
                        <Checkbox
                            onChange={(e) => handleContentToggle(content.ident, e)}
                            label={content.name}
                            checked={
                                (props.selected && (props.multiSelect || index === 0)) ||
                                props.selectedContentIdents.includes(content.ident)
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
    channelIdent: string;
    contentIdents: string[];
};

export type ChannelSelectorProps = {
    subscriber: Subscriber<any>;
    selectableChannels: SelectableChannel[];
    selectedChannelIdent?: string;
    selectedContents?: SelectedContents;
    position: Point;
    onSelect: (channelIdent: string, contentIdents: string[]) => void;
    onCancel: () => void;
};

export const ChannelSelector: React.FC<ChannelSelectorProps> = (props) => {
    const [selectedChannelIdent, setSelectedChannelIdent] = React.useState<string | null>(
        props.selectedChannelIdent ?? null
    );
    const [selectedContents, setSelectedContents] = React.useState<SelectedContents | null>(
        props.selectedContents ?? null
    );

    React.useEffect(() => {
        const handleClickOutside = (e: PointerEvent) => {
            e.stopPropagation();
            e.preventDefault();
            const target = e.target as HTMLElement;
            if (target.closest("#channel-selector-header")) {
                e.preventDefault();
                return;
            }

            if (target.closest("#channel-selector")) {
                return;
            }
            props.onCancel();
        };

        document.addEventListener("pointerup", handleClickOutside, true);

        return () => {
            document.removeEventListener("pointerup", handleClickOutside, true);
        };
    }, [props.onCancel]);

    function handleCancelChannelSelection(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
        props.onCancel();
    }

    function handleSelectionDone(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
        if (selectedContents === null && selectedChannelIdent === null) {
            return;
        }
        if (selectedChannelIdent !== null) {
            props.onSelect(selectedChannelIdent, []);
            return;
        }
        if (selectedContents === null) {
            return;
        }
        props.onSelect(selectedContents.channelIdent, selectedContents.contentIdents);
    }

    function handleChannelToggle(channelIdent: string, checked: boolean) {
        const channel = props.selectableChannels.find((el) => el.ident === channelIdent);
        if (!channel) {
            return;
        }

        if (checked) {
            setSelectedChannelIdent(channelIdent);
        } else {
            setSelectedChannelIdent(null);
        }
    }

    function handleContentToggle(channelIdent: string, contentIdent: string, checked: boolean) {
        if (checked) {
            if (
                selectedContents === null ||
                selectedContents.channelIdent !== channelIdent ||
                !props.subscriber.getHasMultiContentSupport()
            ) {
                setSelectedContents({ channelIdent, contentIdents: [contentIdent] });
                return;
            }
            setSelectedContents({
                channelIdent,
                contentIdents: [...(selectedContents.contentIdents ?? []), contentIdent],
            });
        } else {
            if (selectedContents === null || selectedContents.channelIdent !== channelIdent) {
                return;
            }

            setSelectedContents({
                channelIdent,
                contentIdents: selectedContents.contentIdents?.filter((el) => el !== contentIdent) ?? [],
            });
        }
    }

    function checkIfSelectionIsMade() {
        if (selectedContents === null && selectedChannelIdent === null) {
            return false;
        }
        if (selectedChannelIdent === null && selectedContents !== null && selectedContents.contentIdents.length === 0) {
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
    const top = Math.min(props.position.y - calculatedHeight / 2, window.innerHeight - calculatedHeight - 10);
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
                        Make <i className="font-bold text-green-700">{props.subscriber.getName()}</i> subscribe to...
                    </div>
                    <div className="hover:text-slate-500 cursor-pointer" onClick={props.onCancel}>
                        <Close fontSize="small" />
                    </div>
                </div>
                <div className="flex-grow overflow-auto">
                    {props.selectableChannels.map((channel) => (
                        <ChannelContentSelector
                            multiSelect={props.subscriber.getHasMultiContentSupport()}
                            key={channel.ident}
                            channel={channel}
                            selected={selectedChannelIdent === channel.ident}
                            selectedContentIdents={
                                selectedContents?.channelIdent === channel.ident ? selectedContents.contentIdents : []
                            }
                            onSelectChannel={handleChannelToggle}
                            onSelectContent={handleContentToggle}
                        />
                    ))}
                </div>
                <div className="px-2 bg-slate-200 flex gap-2 justify-end h-16 items-center">
                    <Button onClick={handleCancelChannelSelection}>Cancel</Button>
                    <Button onClick={handleSelectionDone} disabled={!checkIfSelectionIsMade()}>
                        Confirm
                    </Button>
                </div>
            </div>
        </>,
        document.body
    );
};
