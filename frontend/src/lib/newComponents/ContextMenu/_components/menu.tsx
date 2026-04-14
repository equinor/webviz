import type { ContextMenuPopupProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export type MenuProps = Omit<ContextMenuPopupProps, "className" | "style"> & {
    children: React.ReactNode;
};

export function Menu(props: MenuProps) {
    return (
        <ContextMenuBase.Portal>
            <ContextMenuBase.Positioner>
                <ContextMenuBase.Popup
                    className="bg-floating shadow-elevation-overlay py-vertical-xs min-w-20 origin-(--transform-origin) rounded outline-0 transition-all data-ending-style:opacity-0"
                    {...props}
                >
                    {props.children}
                </ContextMenuBase.Popup>
            </ContextMenuBase.Positioner>
        </ContextMenuBase.Portal>
    );
}
