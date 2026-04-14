import type { ContextMenuRadioItemProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export type RadioItemProps = Omit<ContextMenuRadioItemProps, "className" | "style">;

export function RadioItem(props: RadioItemProps) {
    return <ContextMenuBase.RadioItem {...props} className="" />;
}
