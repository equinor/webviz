import React from "react";

import type { Action } from "@base-ui/react/toast/index.parts";
import { Add, ArrowDropDown, ChevronRight } from "@mui/icons-material";

import { Menu } from "@lib/components/Menu/next";

export type Action = {
    identifier: string;
    icon?: React.ReactNode;
    label: string;
    description?: string;
};

export type ActionGroup = {
    icon?: React.ReactNode;
    label: string;
    children: (Action | ActionGroup)[];
};

function isActionGroup(action: Action | ActionGroup): action is ActionGroup {
    return (action as ActionGroup).children !== undefined;
}

export type ActionsProps = {
    actionGroups: ActionGroup[];
    startOpen?: boolean;
    onActionClick: (actionIdentifier: string) => void;
};

const CallbackContext = React.createContext<{
    onActionClick: (actionIdentifier: string) => void;
}>({ onActionClick: () => {} });

export function Actions(props: ActionsProps): React.ReactNode {
    const { onActionClick } = props;
    const [isOpen, setIsOpen] = React.useState(props.startOpen ?? false);

    const actions = props.actionGroups.length === 1 ? props.actionGroups[0].children : props.actionGroups;

    return (
        <CallbackContext.Provider value={{ onActionClick }}>
            <Menu.Root open={isOpen} onOpenChange={setIsOpen}>
                <Menu.Trigger disabled={!props.actionGroups.length}>
                    <Add fontSize="inherit" />
                    <span>Add</span>
                    <ArrowDropDown fontSize="inherit" />
                </Menu.Trigger>

                <Menu.Portal>
                    <Menu.Positioner className="z-9999" side="bottom" align="end">
                        <Menu.Popup>
                            {actions.map((entry, index) => (
                                <ActionMenuEntry key={makeKey(entry, index)} entry={entry} />
                            ))}
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
        </CallbackContext.Provider>
    );
}

function ActionGroup(props: { group: ActionGroup }) {
    return (
        <Menu.SubmenuRoot>
            <Menu.SubmenuTrigger>
                <span className="grow">{props.group.label}</span>
                <ChevronRight fontSize="inherit" />
            </Menu.SubmenuTrigger>
            <Menu.Portal>
                <Menu.Positioner className="z-9999" side="right" align="start">
                    <Menu.Popup>
                        {props.group.children.map((entry, index) => (
                            <ActionMenuEntry key={makeKey(entry, index)} entry={entry} />
                        ))}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.SubmenuRoot>
    );
}

function ActionItem(props: { action: Action }) {
    const { onActionClick } = React.useContext(CallbackContext);

    if (props.action.description) {
        return (
            <Menu.Item className="" onClick={() => onActionClick(props.action.identifier)}>
                <span>{props.action.icon}</span>
                <div>
                    <p className="font-bold">{props.action.label}</p>
                    <p className="text-xs">{props.action.description}</p>
                </div>
            </Menu.Item>
        );
    }

    return (
        <Menu.Item onClick={() => onActionClick(props.action.identifier)}>
            {props.action.icon}
            {props.action.label}
        </Menu.Item>
    );
}

function ActionMenuEntry(props: { entry: Action | ActionGroup }) {
    if (isActionGroup(props.entry)) {
        return <ActionGroup group={props.entry} />;
    } else {
        return <ActionItem action={props.entry} />;
    }
}

function makeKey(entry: Action | ActionGroup, index: number) {
    if (isActionGroup(entry)) {
        return `${entry.label}-${index}`;
    } else {
        return `${entry.identifier}-${index}`;
    }
}
