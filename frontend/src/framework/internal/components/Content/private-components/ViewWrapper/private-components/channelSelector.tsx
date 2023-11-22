import React from "react";
import { createPortal } from "react-dom";

import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { Overlay } from "@lib/components/Overlay";
import { Point } from "@lib/utils/geometry";
import { Close } from "@mui/icons-material";

export type SelectableChannel = {
    ident: string;
    name: string;
    programs: { ident: string; name: string }[];
};

export type ChannelSelectorProps = {
    selectableChannels: SelectableChannel[];
    position: Point;
    onSelectPrograms: (channelIdent: string, programIdents: string[]) => void;
    onCancel: () => void;
};

export const ChannelSelector: React.FC<ChannelSelectorProps> = (props) => {
    const [selectedChannelIdent, setSelectedChannelIdent] = React.useState<string | null>(null);
    const [selectedProgramIdents, setSelectedProgramIdents] = React.useState<string[]>([]);

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
        if (!selectedChannelIdent || selectedProgramIdents.length === 0) {
            return;
        }
        props.onSelectPrograms(selectedChannelIdent, selectedProgramIdents);
    }

    function handleChannelToggle(channelIdent: string, checked: boolean) {
        const channel = props.selectableChannels.find((el) => el.ident === channelIdent);
        if (!channel) {
            return;
        }
        const programIdents = channel.programs.map((el) => el.ident);

        setSelectedChannelIdent(channelIdent);

        if (checked) {
            setSelectedProgramIdents([...selectedProgramIdents, ...programIdents]);
        } else {
            setSelectedProgramIdents(selectedProgramIdents.filter((el) => !programIdents.includes(el)));
        }
    }

    function handleProgramToggle(channelIdent: string, programIdent: string, checked: boolean) {
        setSelectedChannelIdent(channelIdent);
        if (checked) {
            setSelectedProgramIdents([...selectedProgramIdents, programIdent]);
        } else {
            setSelectedProgramIdents(selectedProgramIdents.filter((el) => el !== programIdent));
        }
    }

    function getChannelState(channelIdent: string): {
        checked: boolean;
        indeterminate: boolean;
    } {
        const channel = props.selectableChannels.find((el) => el.ident === channelIdent);
        if (!channel) {
            return { checked: false, indeterminate: false };
        }

        const programIdents = channel.programs.map((el) => el.ident);
        const allProgramsSelected = programIdents.every((el) => selectedProgramIdents.includes(el));
        const someProgramsSelected = programIdents.some((el) => selectedProgramIdents.includes(el));

        return {
            checked: allProgramsSelected,
            indeterminate: someProgramsSelected && !allProgramsSelected,
        };
    }

    return createPortal(
        <>
            <Overlay visible />
            <div
                id="channel-selector"
                className="absolute bg-white border rounded overflow-auto z-50 shadow flex flex-col"
                style={{
                    left: props.position.x < window.innerWidth / 2 ? props.position.x : undefined,
                    top: props.position.y < window.innerHeight / 2 ? props.position.y : undefined,
                    right: props.position.x > window.innerWidth / 2 ? window.innerWidth - props.position.x : undefined,
                    bottom:
                        props.position.y > window.innerHeight / 2 ? window.innerHeight - props.position.y : undefined,
                }}
            >
                <div id="channel-selector-header" className="p-2 bg-slate-200 font-bold flex text-sm">
                    <div className="flex-grow">Select a channel</div>
                    <div className="hover:text-slate-500 cursor-pointer" onClick={props.onCancel}>
                        <Close fontSize="small" />
                    </div>
                </div>
                <div className="flex-grow overflow-auto">
                    {props.selectableChannels.map((channel) => {
                        return (
                            <div key={channel.ident}>
                                <div className="p-2 hover:bg-blue-50 cursor-pointer text-xs font-bold">
                                    <Checkbox
                                        onChange={(e) => handleChannelToggle(channel.ident, e.currentTarget.checked)}
                                        label={channel.name}
                                        {...getChannelState(channel.ident)}
                                    />
                                </div>
                                {channel.programs.map((program) => (
                                    <div
                                        key={program.ident}
                                        className="flex items-center ml-4 pl-0 p-2 hover:bg-blue-50 cursor-pointer text-xs border-l border-black"
                                    >
                                        <span className="h-px w-1 bg-black mr-2 inline-block" />
                                        <Checkbox
                                            onChange={(e) =>
                                                handleProgramToggle(
                                                    channel.ident,
                                                    program.ident,
                                                    e.currentTarget.checked
                                                )
                                            }
                                            label={program.name}
                                            checked={selectedProgramIdents.includes(program.ident)}
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
                <div className="p-2 bg-slate-200 flex gap-2 justify-end">
                    <Button onClick={handleCancelChannelSelection}>Cancel</Button>
                    <Button onClick={handleSelectionDone} disabled={selectedProgramIdents.length === 0}>
                        Confirm
                    </Button>
                </div>
            </div>
        </>,
        document.body
    );
};
