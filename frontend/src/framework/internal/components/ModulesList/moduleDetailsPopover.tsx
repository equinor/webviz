import type React from "react";

import { ModuleDevState, type Module } from "@framework/Module";
import { ModuleDataTags } from "@framework/ModuleDataTags";
import type { PopoverPopupProps } from "@lib/components/Popover";
import { Popover } from "@lib/components/Popover";

import { DevStateIcon, PersistenceIcon } from "./moduleIcons";
import { PreviewImage } from "./previewImage";

export type ModuleDetailsPopoverProps = {
    module: Module<any, any> | null;
    open: boolean;
    anchor: PopoverPopupProps["anchor"];

    children?: React.ReactNode;
    onOpenChange: (open: boolean) => void;
};

export function ModuleDetailsPopover(props: ModuleDetailsPopoverProps): React.ReactNode {
    if (!props.module) return null;

    return (
        <Popover.Root open={props.open} onOpenChange={props.onOpenChange}>
            <Popover.Popup side="left" anchor={props.anchor}>
                <div className="gap-x-sm flex w-96 items-center">
                    <div className="min-w-20">
                        <PreviewImage size={80} drawPreviewFunc={props.module.getDrawPreviewFunc()} />
                    </div>

                    <div className="grow self-stretch">
                        <Popover.Title containedSeparator>
                            <span className="font-bolder grow">{props.module.getDefaultTitle()}</span>
                        </Popover.Title>
                        <Popover.Content as="div">
                            <div className="gap-x-sm mb-2xs flex empty:hidden">
                                <DevState module={props.module} />
                                <PersistenceState module={props.module} />
                            </div>
                            <div className="text-body-sm">{props.module.getDescription()}</div>
                            <DataTags module={props.module} />
                        </Popover.Content>
                    </div>
                </div>
            </Popover.Popup>
        </Popover.Root>
    );
}

function DevState(props: { module: Module<any, any> }) {
    const devState = props.module.getDevState();

    if (devState === ModuleDevState.DEPRECATED) {
        return (
            <div className="text-warning-subtle gap-4xs text-body-xs flex items-center">
                <DevStateIcon devState={devState} />
                Deprecated
            </div>
        );
    }
    if (devState === ModuleDevState.DEV) {
        return (
            <div className="text-danger-subtle gap-4xs text-body-xs flex items-center">
                <DevStateIcon devState={devState} />
                Experimental
            </div>
        );
    }
}

function PersistenceState(props: { module: Module<any, any> }): React.ReactNode {
    if (props.module.canBeSerialized()) return null;

    return (
        <div className="text-disabled gap-x-4xs text-body-xs flex items-center">
            <PersistenceIcon isSerializable={false} />
            Module settings won&apos;t be saved
        </div>
    );
}

function DataTags(props: { module: Module<any, any> }): React.ReactNode {
    if (!props.module) return [];

    return (
        <div className="mt-2xs text-bolder gap-x-2xs text-body-xs flex flex-wrap">
            {props.module.getDataTagIds().map((tag) => {
                const tagObj = ModuleDataTags.find((el) => el.id === tag);

                if (tagObj) {
                    return (
                        <div key={tag} className="text-accent-subtle font-bolder">
                            #{tagObj.name}
                        </div>
                    );
                }
            })}
        </div>
    );
}
