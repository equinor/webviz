import React from "react";

import { isEqual } from "lodash-es";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import {
    type ContextMenu as ContextMenuType,
    type DeckGlInstanceManager,
    DeckGlInstanceManagerTopic,
} from "@modules/_shared/utils/subsurfaceViewer/DeckGlInstanceManager";

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
            className="border-neutral-subtle z-elevated py-3xs absolute rounded border bg-white shadow-lg"
        >
            {contextMenu.items.map((item, index) => (
                <div
                    key={index}
                    className="hover:bg-info-surface gap-2xs px-2xs text-body-sm p-3xs flex cursor-pointer items-center"
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
