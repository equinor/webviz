import { SortableListItemProps } from "@lib/components/SortableList";

import { LayerComponent } from "./LayerComponent";
import { SettingsGroupComponent } from "./SettingsGroupComponent";
import { SharedSettingComponent } from "./SharedSettingComponent";
import { ViewComponent } from "./ViewComponent";
import { LayersActionGroup } from "./layersActions";

import { SettingsGroup } from "../SettingsGroup";
import { SharedSetting } from "../SharedSetting";
import { View } from "../View";
import { Group, Item, instanceofGroup, instanceofLayer } from "../interfaces";

export function makeComponent(
    item: Item,
    layerActions?: LayersActionGroup[],
    onActionClick?: (identifier: string, group: Group) => void
): React.ReactElement<SortableListItemProps> {
    if (instanceofLayer(item)) {
        return <LayerComponent key={item.getItemDelegate().getId()} layer={item} onRemove={() => {}} />;
    }
    if (instanceofGroup(item)) {
        if (item instanceof SettingsGroup) {
            return (
                <SettingsGroupComponent
                    key={item.getItemDelegate().getId()}
                    group={item}
                    actions={layerActions}
                    onActionClick={onActionClick}
                />
            );
        } else if (item instanceof View) {
            return (
                <ViewComponent
                    key={item.getItemDelegate().getId()}
                    group={item}
                    actions={layerActions}
                    onActionClick={onActionClick}
                />
            );
        }
    }
    if (item instanceof SharedSetting) {
        return <SharedSettingComponent key={item.getItemDelegate().getId()} sharedSetting={item} onRemove={() => {}} />;
    }
    throw new Error("Not implemented");
}
