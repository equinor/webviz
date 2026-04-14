import { ContextMenu as ContextMenuBase, ContextMenuItemProps } from "@base-ui/react";

export type ItemProps = Omit<ContextMenuItemProps, "className" | "style">;

export function Item(props: ItemProps) {
    return (
        <ContextMenuBase.Item
            {...props}
            className="hover:bg-accent-hover active:bg-accent-active px-selectable-x py-selectable-y text-body-md outline-0 select-none"
        />
    );
}
