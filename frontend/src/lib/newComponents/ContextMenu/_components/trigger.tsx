import type { ContextMenuTriggerProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export type TriggerProps = Omit<ContextMenuTriggerProps, "className" | "style"> & {
    children?: React.ReactNode;
};

export function Trigger(props: TriggerProps) {
    return <ContextMenuBase.Trigger {...props} />;
}
