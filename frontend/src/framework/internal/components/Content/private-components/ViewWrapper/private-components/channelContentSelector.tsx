import React from "react";

import type { BaseUIEvent } from "@base-ui/react";
import { Close } from "@mui/icons-material";
import { createPortal } from "react-dom";

import type { ChannelReceiver } from "@framework/internal/DataChannels/ChannelReceiver";
import type { ChannelContentDefinition } from "@framework/types/dataChannnel";
import { Overlay } from "@lib/components/Overlay";
import { Button } from "@lib/newComponents/Button";
import { CheckboxCompositions } from "@lib/newComponents/Checkbox";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import type { Vec2 } from "@lib/utils/vec2";

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
    function handleChannelToggle(checked: boolean) {
        props.onSelectChannel(props.channel.idString, checked);
    }

    function handleContentToggle(contentIdString: string, checked: boolean) {
        props.onSelectContent(props.channel.idString, contentIdString, checked);
    }

    return (
        <div className="py-vertical-2xs flex flex-col">
            <div className="px-horizontal-2xs font-bolder text-body-sm flex cursor-pointer items-center">
                <CheckboxCompositions.WithLabel
                    onCheckedChange={handleChannelToggle}
                    label={props.channel.displayName}
                    checked={props.selected}
                    size="small"
                />
            </div>
            <div className="relative">
                {props.selected && (
                    <div className="bg-canvas text-body-sm absolute inset-0 -top-2 flex w-full items-center justify-center opacity-90">
                        {props.multiSelect
                            ? "All contents are automatically selected."
                            : "The first content is automatically selected."}
                    </div>
                )}
                {props.channel.contents.map((content, index) => (
                    <div
                        key={content.contentIdString}
                        className="ml-horizontal-2xl border-neutral-strong text-body-sm gap-horizontal-3xs px-horizontal-2xs flex cursor-pointer items-center border-l pl-0"
                    >
                        <span className="bg-neutral-strong -mr-horizontal-2xs inline-block h-px w-2" />
                        <CheckboxCompositions.WithLabel
                            onCheckedChange={(checked) => handleContentToggle(content.contentIdString, checked)}
                            label={content.displayName}
                            checked={
                                (props.selected && (props.multiSelect || index === 0)) ||
                                props.selectedContentIdStrings.includes(content.contentIdString)
                            }
                            size="small"
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
    position: Vec2;
    onSelect: (channelIdString: string, contentIdStrings: string[]) => void;
    onCancel: () => void;
};

export const ChannelSelector: React.FC<ChannelSelectorProps> = (props) => {
    const { onCancel } = props;
    const [selectedChannelIdString, setSelectedChannelIdString] = React.useState<string | null>(
        props.selectedChannelIdString ?? null,
    );
    const [selectedContents, setSelectedContents] = React.useState<SelectedContents | null>(
        props.selectedContents ?? null,
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

    function handleCancelChannelSelection(e: BaseUIEvent<React.MouseEvent<HTMLButtonElement>>) {
        e.stopPropagation();
        onCancel();
    }

    function handleSelectionDone(e: BaseUIEvent<React.MouseEvent<HTMLButtonElement>>) {
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
    const contentElementHeight = convertRemToPixels(3);

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
        Math.min(props.position.y - calculatedHeight / 2, window.innerHeight - calculatedHeight - 10),
    );
    const maxHeight = Math.min(calculatedHeight, window.innerHeight - 20);

    return createPortal(
        <>
            <Overlay visible />
            <div
                id="channel-selector"
                className="bg-surface z-toast shadow-elevation-overlay border-neutral-subtle absolute flex flex-col overflow-auto rounded border"
                style={{
                    left: `calc(${left}px - 10rem)`,
                    top: top,
                    maxHeight: maxHeight,
                }}
                onPointerUp={(e) => e.stopPropagation()}
            >
                <div
                    id="channel-selector-header"
                    className="bg-neutral px-horizontal-2xs text-body-sm font-bolder flex h-12 items-center"
                >
                    <div className="grow">
                        Make <i className="text-accent-subtle font-bold">{props.receiver.getDisplayName()}</i> subscribe
                        to...
                    </div>
                    <Button variant="ghost" tone="neutral" size="small" onClick={handleCancelChannelSelection} iconOnly>
                        <Close fontSize="small" />
                    </Button>
                </div>
                <div className="grow overflow-auto">
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
                <div className="gap-horizontal-2xs bg-canvas px-horizontal-2xs flex h-16 items-center justify-end">
                    <Button variant="ghost" tone="neutral" onClick={handleCancelChannelSelection}>
                        Cancel
                    </Button>
                    <Button onClick={handleSelectionDone} disabled={!checkIfSelectionIsMade()}>
                        OK
                    </Button>
                </div>
            </div>
        </>,
        document.body,
    );
};
