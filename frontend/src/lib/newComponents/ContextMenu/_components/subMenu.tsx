import { ContextMenu as ContextMenuBase, ContextMenuSubmenuRootProps } from "@base-ui/react";

export type SubmenuProps = Omit<ContextMenuSubmenuRootProps, "className" | "style"> & {
    children: React.ReactNode;
};

export function Submenu(props: SubmenuProps) {
    return (
        <ContextMenuBase.SubmenuRoot {...props}>
            <ContextMenuBase.SubmenuTrigger className="w-full"></ContextMenuBase.SubmenuTrigger>
            <ContextMenuBase.Portal>
                <ContextMenuBase.Positioner>
                    <ContextMenuBase.Popup className="">{props.children}</ContextMenuBase.Popup>
                </ContextMenuBase.Positioner>
            </ContextMenuBase.Portal>
        </ContextMenuBase.SubmenuRoot>
    );
}
