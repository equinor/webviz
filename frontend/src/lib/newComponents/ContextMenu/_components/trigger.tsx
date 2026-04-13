import { ContextMenu as ContextMenuBase, ContextMenuTriggerProps } from "@base-ui/react";

export type TriggerProps = Omit<ContextMenuTriggerProps, "className" | "style"> & {
    children?: React.ReactNode;
};

export function Trigger(props: TriggerProps) {
    return <ContextMenuBase.Trigger {...props} />;
}
