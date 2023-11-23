import React from "react";
import { createPortal } from "react-dom";

import { ModuleChannelListener } from "@framework/NewBroadcaster";
import { Button } from "@lib/components/Button";
import { Checkbox, CheckboxProps } from "@lib/components/Checkbox";
import { IconButton } from "@lib/components/IconButton";
import { Overlay } from "@lib/components/Overlay";
import { Point } from "@lib/utils/geometry";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { Close, ExpandLess, ExpandMore } from "@mui/icons-material";

export type SelectableChannel = {
    ident: string;
    name: string;
    programs: { ident: string; name: string }[];
};

type ChannelSelectionItemProps = {
    multiSelect: boolean;
    channel: SelectableChannel;
    selected: boolean;
    selectedProgramIdents: string[];
    onSelectChannel: (channelIdent: string, checked: boolean) => void;
    onSelectProgram: (channelIdent: string, programIdent: string, checked: boolean) => void;
};

const ChannelSelectionItem: React.FC<ChannelSelectionItemProps> = (props) => {
    const [expanded, setExpanded] = React.useState(props.selectedProgramIdents.length > 0 && !props.selected);

    function handleChannelToggle(e: React.ChangeEvent<HTMLInputElement>) {
        props.onSelectChannel(props.channel.ident, e.currentTarget.checked);
    }

    function handleProgramToggle(programIdent: string, e: React.ChangeEvent<HTMLInputElement>) {
        props.onSelectProgram(props.channel.ident, programIdent, e.currentTarget.checked);
    }

    return (
        <div>
            <div className="p-2 hover:bg-blue-50 cursor-pointer text-sm font-bold flex items-center gap-2 h-12">
                <IconButton onClick={() => setExpanded(!expanded)} size="small">
                    {expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                </IconButton>
                <Checkbox onChange={handleChannelToggle} label={props.channel.name} checked={props.selected} />
            </div>
            <div className="relative">
                {expanded && (
                    <>
                        {props.selected && (
                            <div className="absolute inset-0 bg-slate-100 opacity-90 w-full h-full flex items-center justify-center text-sm">
                                {props.multiSelect
                                    ? "All programs are automatically selected."
                                    : "The first program is automatically selected."}
                            </div>
                        )}
                        {props.channel.programs.map((program, index) => (
                            <div
                                key={program.ident}
                                className="flex items-center gap-1 ml-5 pl-0 p-2 hover:bg-blue-50 cursor-pointer text-sm border-l border-slate-400 h-8"
                            >
                                <span className="h-px w-2 bg-slate-400 mr-2 inline-block" />
                                <Checkbox
                                    onChange={(e) => handleProgramToggle(program.ident, e)}
                                    label={program.name}
                                    checked={
                                        (props.selected && (props.multiSelect || index === 0)) ||
                                        props.selectedProgramIdents.includes(program.ident)
                                    }
                                />
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

ChannelSelectionItem.displayName = "ChannelSelectionItem";

export type SelectedPrograms = {
    channelIdent: string;
    programIdents: string[];
};

export type ChannelSelectorProps = {
    listener: ModuleChannelListener;
    selectableChannels: SelectableChannel[];
    selectedChannelIdent?: string;
    selectedPrograms?: SelectedPrograms;
    position: Point;
    onSelect: (channelIdent: string, programIdents: string[]) => void;
    onCancel: () => void;
};

export const ChannelSelector: React.FC<ChannelSelectorProps> = (props) => {
    const [selectedChannelIdent, setSelectedChannelIdent] = React.useState<string | null>(
        props.selectedChannelIdent ?? null
    );
    const [selectedPrograms, setSelectedPrograms] = React.useState<SelectedPrograms | null>(
        props.selectedPrograms ?? null
    );

    React.useEffect(() => {
        const handleClickOutside = (e: PointerEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest("#channel-selector-header")) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (target.closest("#channel-selector")) {
                return;
            }
            props.onCancel();
        };

        document.addEventListener("pointerdown", handleClickOutside);

        return () => {
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [props.onCancel]);

    function handleCancelChannelSelection() {
        props.onCancel();
    }

    function handleSelectionDone() {
        if (selectedPrograms === null && selectedChannelIdent === null) {
            return;
        }
        if (selectedChannelIdent !== null) {
            props.onSelect(selectedChannelIdent, []);
            return;
        }
        if (selectedPrograms === null) {
            return;
        }
        props.onSelect(selectedPrograms.channelIdent, selectedPrograms.programIdents);
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

    function handleProgramToggle(channelIdent: string, programIdent: string, checked: boolean) {
        if (checked) {
            if (
                selectedPrograms === null ||
                selectedPrograms.channelIdent !== channelIdent ||
                !props.listener.getCanMultiTask()
            ) {
                setSelectedPrograms({ channelIdent, programIdents: [programIdent] });
                return;
            }
            setSelectedPrograms({
                channelIdent,
                programIdents: [...(selectedPrograms.programIdents ?? []), programIdent],
            });
        } else {
            if (selectedPrograms === null || selectedPrograms.channelIdent !== channelIdent) {
                return;
            }

            setSelectedPrograms({
                channelIdent,
                programIdents: selectedPrograms.programIdents?.filter((el) => el !== programIdent) ?? [],
            });
        }
    }

    function checkIfSelectionIsMade() {
        if (selectedPrograms === null && selectedChannelIdent === null) {
            return false;
        }
        if (selectedChannelIdent === null && selectedPrograms !== null && selectedPrograms.programIdents.length === 0) {
            return false;
        }
        return true;
    }

    const channelElementHeight = convertRemToPixels(3);
    const programElementHeight = convertRemToPixels(2);

    const calculatedHeight =
        props.selectableChannels.reduce((acc, el) => {
            return acc + channelElementHeight + el.programs.length * programElementHeight;
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
            >
                <div
                    id="channel-selector-header"
                    className="px-2 bg-slate-200 font-bold flex items-center text-sm h-12"
                >
                    <div className="flex-grow">
                        Make <i className="font-bold text-green-700">{props.listener.getName()}</i> listen to...
                    </div>
                    <div className="hover:text-slate-500 cursor-pointer" onClick={props.onCancel}>
                        <Close fontSize="small" />
                    </div>
                </div>
                <div className="flex-grow overflow-auto">
                    {props.selectableChannels.map((channel) => (
                        <ChannelSelectionItem
                            multiSelect={props.listener.getCanMultiTask()}
                            key={channel.ident}
                            channel={channel}
                            selected={selectedChannelIdent === channel.ident}
                            selectedProgramIdents={
                                selectedPrograms?.channelIdent === channel.ident ? selectedPrograms.programIdents : []
                            }
                            onSelectChannel={handleChannelToggle}
                            onSelectProgram={handleProgramToggle}
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
