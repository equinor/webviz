import { Visibility, VisibilityOff } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item } from "../../interfacesAndTypes/entities";

export type VisibilityToggleProps = {
    item: Item;
};

export function VisibilityToggle(props: VisibilityToggleProps): React.ReactNode {
    const isVisible = usePublishSubscribeTopicValue(props.item.getItemDelegate(), ItemDelegateTopic.VISIBILITY);

    function handleToggleVisibility() {
        props.item.getItemDelegate().setVisible(!isVisible);
    }

    return (
        <Tooltip content={isVisible ? "Hide item in view" : "Show item in view"} side="bottom">
            <Button onClick={handleToggleVisibility} variant="ghost" tone="neutral" size="small" iconOnly>
                {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
            </Button>
        </Tooltip>
    );
}
