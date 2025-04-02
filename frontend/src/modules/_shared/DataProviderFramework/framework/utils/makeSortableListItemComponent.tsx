import type { ActionGroup } from "../../Actions";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { isDataProvider } from "../DataProvider/DataProvider";
import { DataProviderComponent } from "../DataProvider/DataProviderComponent";
import { DeltaSurface } from "../DeltaSurface/DeltaSurface";
import { DeltaSurfaceComponent } from "../DeltaSurface/DeltaSurfaceComponent";
import { isGroup } from "../Group/Group";
import { GroupComponent } from "../Group/GroupComponent";
import { isSettingsGroup } from "../SettingsGroup/SettingsGroup";
import { SettingsGroupComponent } from "../SettingsGroup/SettingsGroupComponent";
import { isSharedSetting } from "../SharedSetting/SharedSetting";
import { SharedSettingComponent } from "../SharedSetting/SharedSettingComponent";

export function makeSortableListItemComponent(
    item: Item,
    makeLayerActionsForGroup: (group: ItemGroup) => ActionGroup[],
    onActionClick?: (identifier: string, group: ItemGroup) => void,
): React.ReactElement {
    if (isDataProvider(item)) {
        return <DataProviderComponent key={item.getItemDelegate().getId()} dataProvider={item} />;
    }
    if (isSettingsGroup(item)) {
        return (
            <SettingsGroupComponent
                key={item.getItemDelegate().getId()}
                group={item}
                makeActionsForGroup={makeLayerActionsForGroup}
                onActionClick={onActionClick}
            />
        );
    }
    if (isGroup(item)) {
        return (
            <GroupComponent
                key={item.getItemDelegate().getId()}
                group={item}
                makeActionsForGroup={makeLayerActionsForGroup}
                onActionClick={onActionClick}
            />
        );
    }
    if (item instanceof DeltaSurface) {
        return (
            <DeltaSurfaceComponent
                key={item.getItemDelegate().getId()}
                deltaSurface={item}
                makeActionsForGroup={makeLayerActionsForGroup}
                onActionClick={onActionClick}
            />
        );
    }
    if (isSharedSetting(item)) {
        return <SharedSettingComponent key={item.getItemDelegate().getId()} sharedSetting={item} />;
    }

    throw new Error(`Unsupported item type: ${item.constructor.name}`);
}
