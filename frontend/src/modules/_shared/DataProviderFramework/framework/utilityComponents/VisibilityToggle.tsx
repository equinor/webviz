import { Visibility, VisibilityOff } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
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
        <DenseIconButton onClick={handleToggleVisibility} title="Toggle visibility">
            {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
        </DenseIconButton>
    );
}
