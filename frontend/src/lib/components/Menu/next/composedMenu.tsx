import React from "react";

// import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { MenuPositionerProps } from "@base-ui/react";
import { ChevronRight } from "@mui/icons-material";

import * as Parts from "./index.parts";

export const ActionCallbackContext = React.createContext<{
    onActionClick: (actionIdentifier: string) => void;
}>({ onActionClick: () => {} });

export type Action = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    description?: string;
    disabled?: boolean;
    checked?: boolean;
};

export type SubMenu = {
    id: string;
    label: string;
    items: MenuItem[];
    icon?: React.ReactNode;
    description?: string;
    disabled?: boolean;
};

export type Divider = {
    type: "divider";
};

export type MenuItem = Action | SubMenu | Divider;

export type MenuProps = {
    open?: boolean;
    flat?: boolean;
    items: MenuItem[];

    side?: MenuPositionerProps["side"];
    align?: MenuPositionerProps["align"];
    closeOnClick?: boolean;

    onOpenChange?: (isOpen: boolean) => void;
    onActionClicked?: (id: string) => void;
    children: React.ReactNode;
};

const RootPropsContext = React.createContext<MenuProps | null>(null);

function MenuComponent(props: MenuProps, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    return (
        <RootPropsContext.Provider value={props}>
            <Parts.Root disabled={!props.items.length} open={props.open} onOpenChange={props.onOpenChange}>
                <Parts.Trigger ref={ref}>{props.children}</Parts.Trigger>
                <Parts.Portal>
                    <Parts.Positioner className="z-9999" side={props.side} align={props.align}>
                        <Parts.Popup>
                            {props.items.map((item, i) => (
                                <MenuItem key={makeKey(item, i)} item={item} />
                            ))}
                        </Parts.Popup>
                    </Parts.Positioner>
                </Parts.Portal>
            </Parts.Root>
        </RootPropsContext.Provider>
    );
}

function MenuItem(props: { item: MenuItem }) {
    if (isItemGroup(props.item)) {
        return <SubmenuItem group={props.item} />;
    } else if (isDivider(props.item)) {
        return <Parts.Separator className="h-px bg-gray-200 my-1" />;
    } else {
        return <ActionItem action={props.item} />;
    }
}

function ActionItem(props: { action: Action }) {
    const rootProps = React.useContext(RootPropsContext);
    const ItemComp = props.action.checked !== undefined ? Parts.CheckBoxItem : Parts.Item;

    function onClick() {
        rootProps?.onActionClicked?.(props.action.id);
    }

    function makeContent() {
        if (props.action.description) {
            return (
                <>
                    <span>{props.action.icon}</span>
                    <div>
                        <p className="font-bold">{props.action.label}</p>
                        <p className="text-xs">{props.action.description}</p>
                    </div>
                </>
            );
        } else {
            return (
                <>
                    {props.action.icon}
                    {props.action.label}
                </>
            );
        }
    }

    return (
        <ItemComp closeOnClick={rootProps?.closeOnClick} onClick={onClick} checked={props.action.checked}>
            {makeContent()}
        </ItemComp>
    );
}

function SubmenuItem(props: { group: SubMenu }) {
    const rootProps = React.useContext(RootPropsContext);

    const subMenuContent = props.group.items.map((entry, index) => (
        <MenuItem key={makeKey(entry, index)} item={entry} />
    ));

    if (rootProps?.flat) {
        return (
            <Parts.Group>
                <Parts.GroupLabel className={"text-xs text-gray-500 uppercase font-semibold tracking-wider px-3 py-1"}>
                    {props.group.label} {props.group.icon}
                </Parts.GroupLabel>
                {subMenuContent}
            </Parts.Group>
        );
    }

    return (
        <Parts.SubmenuRoot>
            <Parts.SubmenuTrigger>
                {props.group.icon}
                <span className="grow">{props.group.label}</span>

                <ChevronRight fontSize="inherit" />
            </Parts.SubmenuTrigger>
            <Parts.Portal>
                <Parts.Positioner className="z-9999" side="right" align="start">
                    <Parts.Popup>{subMenuContent}</Parts.Popup>
                </Parts.Positioner>
            </Parts.Portal>
        </Parts.SubmenuRoot>
    );
}

function makeKey(entry: MenuItem, index: number) {
    if (isDivider(entry)) {
        return `divider-${index}`;
    } else if (isItemGroup(entry)) {
        return `${entry.id}-${index}`;
    } else {
        return `${entry.id}-${index}`;
    }
}

function isItemGroup(item: MenuItem): item is SubMenu {
    if (Object.hasOwn(item, "items")) return true;

    return false;
}

function isDivider(item: MenuItem): item is Divider {
    if (!Object.hasOwn(item, "type")) return false;

    return (item as Divider).type === "divider";
}

export const Menu = React.forwardRef(MenuComponent);
