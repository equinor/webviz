import { ContextMenu as ContextMenuBase, ContextMenuRootProps } from "@base-ui/react";

export type RootProps = Omit<ContextMenuRootProps, "className" | "style"> & {
    children: React.ReactNode;
};

export function Root(props: RootProps) {
    return <ContextMenuBase.Root {...props}>{props.children}</ContextMenuBase.Root>;
}
