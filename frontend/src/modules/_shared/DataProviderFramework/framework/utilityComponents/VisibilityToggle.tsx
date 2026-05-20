import { Visibility, VisibilityOff } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
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
        <Button
            onClick={handleToggleVisibility}
            title="Toggle visibility"
            variant="text"
            tone="neutral"
            size="small"
            iconOnly
        >
            {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
        </Button>
    );
}
