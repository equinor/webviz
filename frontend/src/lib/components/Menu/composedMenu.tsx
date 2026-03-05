import React from "react";

import type { MenuPositionerProps, MenuTriggerProps } from "@base-ui/react/menu";
import { ChevronRight } from "@mui/icons-material";
import { defaults } from "lodash";

import type { SizeName } from "@lib/utils/componentSize";
import { getTextSizeClassName } from "@lib/utils/componentSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import * as Parts from "./index.parts";
import type { MenuItem, Text, Action, SubMenu, Divider } from "./types";

const DEFAULT_PROPS = {
    itemSize: "medium",
    triggerSize: "medium",
} as const;

const RootPropsContext = React.createContext<(NonNullable<typeof DEFAULT_PROPS> & ComposedMenuProps) | null>(null);
const GroupDepthContext = React.createContext(0);

export type ComposedMenuProps = {
    /** The list of items displayed in the menu */
    items: MenuItem[];
    /** Controls the menu open/close state */
    open?: boolean;
    /** Flattens the list, instead of using sub-menus */
    flat?: boolean;
    /** Closes the menu when an action item is clicked */
    closeOnClick?: boolean;

    /** Sets the size of the menu items. @default "medium" */
    itemSize?: SizeName;
    /** Sets the size of the menu trigger button @default "medium" */
    triggerSize?: SizeName;

    /** Sets the menu alignment to the trigger element */
    align?: MenuPositionerProps["align"];
    /** Sets which side of the trigger element the menu appears */
    side?: MenuPositionerProps["side"];
    /** Overrides the triggers default rendering. If a node is given, props will be merged  */
    renderTrigger?: MenuTriggerProps["render"];

    /** Callback for open/close control state */
    onOpenChange?: (isOpen: boolean) => void;
    /** Callback whenever an *action* is clicked */
    onActionClicked?: (id: string) => void;

    children?: React.ReactNode;
};

function ComposedMenuComponent(props: ComposedMenuProps, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    const propsWithDefaults = React.useMemo(() => defaults({}, props, DEFAULT_PROPS), [props]);

    return (
        <RootPropsContext.Provider value={propsWithDefaults}>
            <Parts.Root
                disabled={!propsWithDefaults.items.length}
                open={propsWithDefaults.open}
                onOpenChange={propsWithDefaults.onOpenChange}
            >
                <Parts.Trigger
                    ref={ref}
                    className={getTextSizeClassName(propsWithDefaults.triggerSize)}
                    render={propsWithDefaults.renderTrigger}
                >
                    {propsWithDefaults.children}
                </Parts.Trigger>
                <Parts.Portal>
                    <Parts.Positioner className="z-9999" side={propsWithDefaults.side} align={propsWithDefaults.align}>
                        <Parts.Popup className={getTextSizeClassName(propsWithDefaults.itemSize)}>
                            {propsWithDefaults.items.map((item, i) => (
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
    } else if (isText(props.item)) {
        return <TextItem item={props.item} />;
    } else {
        return <ActionItem action={props.item} />;
    }
}

function TextItem(props: { item: Text }) {
    const textSizeClass = props.item.size && getTextSizeClassName(props.item.size);

    return (
        <Parts.Separator className={resolveClassNames(textSizeClass, "text-gray-500 tracking-wider px-3 py-1")}>
            {props.item.text}
        </Parts.Separator>
    );
}
function ActionItem(props: { action: Action }) {
    const rootProps = React.useContext(RootPropsContext)!;

    const ItemComp = props.action.checked !== undefined ? Parts.CheckBoxItem : Parts.Item;

    function onClick() {
        rootProps?.onActionClicked?.(props.action.id);
    }

    function makeContent() {
        if (props.action.description) {
            return (
                <>
                    {props.action.icon && <span>{props.action.icon}</span>}
                    <div>
                        <p className="font-bold">{props.action.label}</p>
                        <p className={getTextSizeClassName(rootProps.itemSize, -1)}>{props.action.description}</p>
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
        <ItemComp
            closeOnClick={rootProps?.closeOnClick}
            onClick={onClick}
            checked={props.action.checked}
            disabled={props.action.disabled}
        >
            {makeContent()}
        </ItemComp>
    );
}

function SubmenuItem(props: { group: SubMenu }) {
    const rootProps = React.useContext(RootPropsContext)!;
    const groupDepth = React.useContext(GroupDepthContext);

    const subMenuContent = props.group.items.map((entry, index) => (
        <MenuItem key={makeKey(entry, index)} item={entry} />
    ));

    if (rootProps.flat) {
        return (
            <Parts.Group
                className={getTextSizeClassName(rootProps.itemSize)}
                style={{ paddingLeft: `${groupDepth}rem` }}
            >
                <Parts.GroupLabel
                    className={resolveClassNames(
                        getTextSizeClassName(rootProps.itemSize, -1),
                        "text-gray-500 uppercase font-semibold tracking-wider px-3 py-1",
                    )}
                >
                    {props.group.label} {props.group.icon}
                </Parts.GroupLabel>
                <GroupDepthContext.Provider value={groupDepth + 1}>{subMenuContent}</GroupDepthContext.Provider>
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
                    <Parts.Popup className={getTextSizeClassName(rootProps.itemSize)}>{subMenuContent}</Parts.Popup>
                </Parts.Positioner>
            </Parts.Portal>
        </Parts.SubmenuRoot>
    );
}

function makeKey(entry: MenuItem, index: number) {
    if (isDivider(entry)) {
        return `divider-${index}`;
    } else if (isText(entry)) {
        return `text-${index}`;
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

function isText(item: MenuItem): item is Text {
    if (!Object.hasOwn(item, "type")) return false;

    return (item as Text).type === "text";
}

/**
 * Display a dropdown menu containing one or more actions
 */
export const ComposedMenu = React.forwardRef(ComposedMenuComponent);
