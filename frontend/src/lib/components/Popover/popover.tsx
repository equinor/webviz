import type React from "react";

import type { PopoverRootProps, PopoverTriggerProps } from "@base-ui/react/popover";
import { Popover as BasePopover } from "@base-ui/react/popover";

import { DenseIconButton } from "../DenseIconButton";

export type PopoverProps = {
    /** Controls the popover open/close state */
    open?: boolean;
    /** The content of the popover */
    content?: React.ReactNode;
    /** Utility ref that can be used to programmatically control the popover */
    actionsRef?: PopoverRootProps["actionsRef"];
    /** Overrides the triggers default rendering. If a node is given, props will be merged  */
    renderTrigger?: PopoverTriggerProps["render"];

    /** Callback for open/close control state */
    onOpenChange?: (isOpen: boolean) => void;

    children?: React.ReactNode;
};

/** Show a rich Popover element attached to a trigger element. For simple string tooltips, use Tooltip instead. For larger interactive menus, use Menu */
export function Popover(props: PopoverProps): React.ReactNode {
    return (
        <BasePopover.Root open={props.open} onOpenChange={props.onOpenChange} actionsRef={props.actionsRef}>
            <BasePopover.Trigger render={<DenseIconButton>{props.children}</DenseIconButton>} />

            <BasePopover.Portal>
                <BasePopover.Positioner className="z-9999" sideOffset={4} align="end" side="bottom">
                    <BasePopover.Popup className="bg-white shadow-md border border-gray-200 rounded-sm transition-opacity">
                        <BasePopover.Arrow
                            className="
                            bg-inherit
                            border border-gray-200
                            size-3 border-b-0 border-r-0

                            data-[side=bottom]:rotate-45
                            data-[side=left]:rotate-135
                            data-[side=top]:rotate-225
                            data-[side=right]:rotate-315

                            data-[side=bottom]:-top-1.5
                            data-[side=left]:-right-1.5
                            data-[side=right]:-left-1.5
                            data-[side=top]:-bottom-1.5
                        "
                        />
                        <BasePopover.Viewport className=" py-2">{props.content}</BasePopover.Viewport>
                    </BasePopover.Popup>
                </BasePopover.Positioner>
            </BasePopover.Portal>
        </BasePopover.Root>
    );
}
