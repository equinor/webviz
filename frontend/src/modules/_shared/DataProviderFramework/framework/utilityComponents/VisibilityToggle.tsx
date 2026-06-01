import { Visibility, VisibilityOff } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item } from "../../interfacesAndTypes/entities";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";

export type VisibilityToggleProps = {
    item: Item;
};

export function VisibilityToggle(props: VisibilityToggleProps): React.ReactNode {
    const isVisible = usePublishSubscribeTopicValue(props.item.getItemDelegate(), ItemDelegateTopic.VISIBILITY);

    function handleToggleVisibility() {
        props.item.getItemDelegate().setVisible(!isVisible);
    }

    return (
        <TooltipCompositions.Default content={isVisible ? "Hide item in view" : "Show item in view"} side="bottom">
            <Button onClick={handleToggleVisibility} variant="ghost" tone="neutral" size="small" iconOnly>
                {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
            </Button>
        </TooltipCompositions.Default>
    );
}
