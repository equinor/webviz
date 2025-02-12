import React from "react";

import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { isEqual } from "lodash";

import {
    ContextMenu as ContextMenuType,
    DeckGlInstanceManager,
    DeckGlInstanceManagerTopic,
} from "../utils/DeckGlInstanceManager";

export type ContextMenuProps = {
    deckGlManager: DeckGlInstanceManager;
};

export function ContextMenu(props: ContextMenuProps): React.ReactNode {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [prevContextMenu, setPrevContextMenu] = React.useState<ContextMenuType | null>(null);
    const contextMenu = usePublishSubscribeTopicValue(props.deckGlManager, DeckGlInstanceManagerTopic.CONTEXT_MENU);

    React.useEffect(function handleMount() {
        function hideContextMenu() {
            setVisible(false);
        }

        window.addEventListener("blur", hideContextMenu);

        return function handleUnmount() {
            window.removeEventListener("blur", hideContextMenu);
        };
    }, []);

    if (!isEqual(prevContextMenu, contextMenu)) {
        setPrevContextMenu(contextMenu);
        setVisible(true);
    }

    if (!contextMenu || !visible || !contextMenu.items.length) {
        return null;
    }

    return (
        <div
            style={{ top: contextMenu.position.y, left: contextMenu.position.x }}
            className="bg-white border border-gray-300 rounded shadow-lg absolute z-10 py-2"
        >
            {contextMenu.items.map((item, index) => (
                <div
                    key={index}
                    className="flex items-center gap-4 p-2 px-4 hover:bg-blue-100 cursor-pointer text-sm"
                    onClick={() => {
                        item.onClick();
                        setVisible(false);
                    }}
                >
                    {item.icon ? React.cloneElement(item.icon, { fontSize: "small" }) : null}
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}
