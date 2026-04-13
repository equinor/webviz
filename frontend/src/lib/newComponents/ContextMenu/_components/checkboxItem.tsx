import { ContextMenu as ContextMenuBase, ContextMenuCheckboxItemProps } from "@base-ui/react";

export type CheckboxItemProps = Omit<ContextMenuCheckboxItemProps, "className" | "style">;

export function CheckboxItem(props: CheckboxItemProps) {
    return <ContextMenuBase.CheckboxItem {...props} className="" />;
}
