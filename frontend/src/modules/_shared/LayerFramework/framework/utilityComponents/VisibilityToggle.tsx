import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Visibility, VisibilityOff } from "@mui/icons-material";

import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { usePublishSubscribeTopicValue } from "../../delegates/PublishSubscribeDelegate";
import { Item } from "../../interfaces";

export type VisibilityToggleProps = {
    item: Item;
};

export function VisibilityToggle(props: VisibilityToggleProps): React.ReactNode {
    const isVisible = usePublishSubscribeTopicValue(props.item.getItemDelegate(), ItemDelegateTopic.VISIBILITY);

    function handleToggleLayerVisibility() {
        props.item.getItemDelegate().setVisible(!isVisible);
    }

    return (
        <DenseIconButton onClick={handleToggleLayerVisibility} title="Toggle visibility">
            {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
        </DenseIconButton>
    );
}
