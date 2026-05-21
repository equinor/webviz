import React from "react";

import { defaults, omit } from "lodash";

import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";

import type { MenuItemProps, MenuPopupProps, MenuRootProps, MenuTriggerProps } from "..";
import { Menu } from "..";

import type { Action, Divider, MenuItem, SubMenu } from "./types";

const DEFAULT_PROPS = {
    itemSize: "default",
} satisfies Partial<ComposedMenuProps>;

const RootPropsContext = React.createContext<(typeof DEFAULT_PROPS & ComposedMenuProps) | null>(null);

export type ComposedMenuProps = {
    /** The list of items displayed in the menu */
    items: MenuItem[];
    /** Flattens the list, instead of using sub-menus */
    flat?: boolean;

    /** Callback whenever an *action* is clicked */
    onActionClicked?: (id: string) => void;

    // --- Inherited props ---
    // Trigger
    children: MenuTriggerProps["children"];

    // Popup
    /** Sets the menu alignment to the trigger element */
    align?: MenuPopupProps["align"];
    /** Sets which side of the trigger element the menu appears */
    side?: MenuPopupProps["side"];
    /** Sets the size of items in the menu's popup */
    itemSize?: MenuPopupProps["itemSize"];

    // Items
    /** Closes the menu when an action item is clicked. By default, true for actions, and false for toggle items */
    closeOnClick?: MenuItemProps["closeOnClick"];
} & MenuRootProps;

function DefaultComposedMenuComponent(
    props: ComposedMenuProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const propsWithDefaults = React.useMemo(() => defaults({}, props, DEFAULT_PROPS), [props]);

    const baseProps = omit(propsWithDefaults, [
        "items",
        "flat",
        "onActionClicked",
        "children",
        "align",
        "side",
        "itemSize",
        "closeOnClick",
    ]);

    return (
        <Menu.Root {...baseProps}>
            <RootPropsContext.Provider value={propsWithDefaults}>
                <Menu.Trigger ref={ref} disabled={!propsWithDefaults.items.length}>
                    {propsWithDefaults.children}
                </Menu.Trigger>

                <Menu.Popup
                    side={propsWithDefaults.side}
                    align={propsWithDefaults.align}
                    itemSize={propsWithDefaults.itemSize}
                >
                    {propsWithDefaults.items.map((item, i) => (
                        <MenuItemComponent key={makeKey(item, i)} item={item} />
                    ))}
                </Menu.Popup>
            </RootPropsContext.Provider>
        </Menu.Root>
    );
}

function MenuItemComponent(props: { item: MenuItem }) {
    if (isItemGroup(props.item)) {
        return <SubmenuItem group={props.item} />;
    } else if (isDivider(props.item)) {
        return <Menu.Separator />;
    } else {
        return <ActionItem action={props.item} />;
    }
}

function ActionItem(props: { action: Action }) {
    const rootProps = React.useContext(RootPropsContext)!;

    const ItemComp = props.action.checked !== undefined ? Menu.CheckboxItem : Menu.Item;

    function onClick() {
        rootProps?.onActionClicked?.(props.action.id);
    }

    return (
        <TooltipCompositions.Default content={props.action.tooltip} side="right">
            <ItemComp
                closeOnClick={rootProps?.closeOnClick}
                checked={props.action.checked}
                disabled={props.action.disabled}
                description={props.action.description}
                icon={props.action.icon}
                onClick={onClick}
            >
                {props.action.label}
            </ItemComp>
        </TooltipCompositions.Default>
    );
}

function SubmenuItem(props: { group: SubMenu }) {
    const rootProps = React.useContext(RootPropsContext)!;

    const subMenuContent = props.group.items.map((entry, index) => (
        <MenuItemComponent key={makeKey(entry, index)} item={entry} />
    ));

    if (rootProps.flat) {
        return (
            <>
                <Menu.Separator layoutClassName="first:hidden" />
                <Menu.Group>
                    <Menu.GroupLabel>
                        {props.group.label} {props.group.icon}
                    </Menu.GroupLabel>

                    {subMenuContent}
                </Menu.Group>
            </>
        );
    }

    return <Menu.SubmenuItem triggerContent={props.group.label}>{subMenuContent}</Menu.SubmenuItem>;
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
    return Object.hasOwn(item, "items");
}

function isDivider(item: MenuItem): item is Divider {
    return Object.hasOwn(item, "type") && (item as Divider).type === "divider";
}

/**
 * Display a dropdown menu containing one or more actions
 */
export const DefaultComposedMenu = React.forwardRef(DefaultComposedMenuComponent);
