import { ContextMenu as ContextMenuBase, ContextMenuRadioItemProps } from "@base-ui/react";

export type RadioItemProps = Omit<ContextMenuRadioItemProps, "className" | "style">;

export function RadioItem(props: RadioItemProps) {
    return <ContextMenuBase.RadioItem {...props} className="" />;
}
