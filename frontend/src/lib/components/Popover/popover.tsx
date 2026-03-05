import type React from "react";

import type { PopoverRootProps } from "@base-ui/react/popover";
import { Popover as BasePopover } from "@base-ui/react/popover";

import { DenseIconButton } from "../DenseIconButton";

export type PopoverProps = {
    children: React.ReactNode;
    content: React.ReactNode;
    actionsRef?: PopoverRootProps["actionsRef"];
};

export function Popover(props: PopoverProps): React.ReactNode {
    return (
        <BasePopover.Root actionsRef={props.actionsRef}>
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
