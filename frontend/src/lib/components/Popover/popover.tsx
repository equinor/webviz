import type React from "react";

import type { PopoverRootProps, PopoverTriggerProps } from "@base-ui/react/popover";
import { Popover as BasePopover } from "@base-ui/react/popover";

import { DenseIconButton } from "../DenseIconButton";

export type PopoverProps = {
    /** Controls the popover open/close state */
    open?: boolean;
    /** The body of the popover message */
    content?: React.ReactNode;
    /** The content of the popover trigger */
    children?: React.ReactNode;

    /**
     * A ref to imperative actions.
     *
     * - `unmount`: When specified, the popover will not be unmounted when closed. Instead, the unmount function must be called to unmount the popover manually. Useful when the popover's animation is controlled by an external library.
     * - `close`: Closes the dialog imperatively when called.
     */ // -- copied from base type
    actionsRef?: PopoverRootProps["actionsRef"];

    /**
     * Allows you to replace the component’s HTML element
     * with a different tag, or compose it with another component.
     *
     * Accepts a `ReactElement` or a function that returns the element to render.
     */ // -- copied from base type
    renderTrigger?: PopoverTriggerProps["render"];

    /** Callback for open/close control state */
    onOpenChange?: (isOpen: boolean) => void;

    /**
     * Trigger tooltip (Not applied if trigger is manually rendered)
     */
    triggerTitle?: string;
};

/** Show a rich Popover element attached to a trigger element. For simple string tooltips, use Tooltip instead. For larger interactive menus, use Menu */
export function Popover(props: PopoverProps): React.ReactNode {
    const triggerRenderOrDefault = props.renderTrigger ?? (
        <DenseIconButton title={props.triggerTitle}>{props.children}</DenseIconButton>
    );

    return (
        <BasePopover.Root open={props.open} actionsRef={props.actionsRef} onOpenChange={props.onOpenChange}>
            <BasePopover.Trigger render={triggerRenderOrDefault} />

            <BasePopover.Portal>
                {/* Note the z-index class here. Base-ui assumes a different stacking context, so we need to manually ensure floating elements stay on top */}
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
