import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { DeckGlInstanceManager, DeckGlInstanceManagerTopic } from "../utils/DeckGlInstanceManager";

export type ContextMenuProps = {
    deckGlManager: DeckGlInstanceManager;
};

export function ContextMenu(props: ContextMenuProps): React.ReactNode {
    const contextMenu = usePublishSubscribeTopicValue(props.deckGlManager, DeckGlInstanceManagerTopic.CONTEXT_MENU);

    if (!contextMenu) {
        return null;
    }

    return (
        <div
            style={{ top: contextMenu.position.y, left: contextMenu.position.x }}
            className="bg-white border border-gray-300 rounded shadow-lg absolute z-10"
        >
            {contextMenu.items.map((item, index) => (
                <div
                    key={index}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100"
                    onClick={() => {
                        item.onClick();
                    }}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}
