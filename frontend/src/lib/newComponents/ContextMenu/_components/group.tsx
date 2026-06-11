import type { ContextMenuGroupProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export type GroupProps = Omit<ContextMenuGroupProps, "className" | "style">;

export function Group(props: GroupProps) {
    return <ContextMenuBase.Group {...props} className="" />;
}
