import type { ActionGroup } from "../../Actions";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { isContextBoundary } from "../ContextBoundary/ContextBoundary";
import { ContextBoundaryComponent } from "../ContextBoundary/ContextBoundaryComponent";
import { isDataProvider } from "../DataProvider/DataProvider";
import { DataProviderComponent } from "../DataProvider/DataProviderComponent";
import { DeltaSurface } from "../DeltaSurface/DeltaSurface";
import { DeltaSurfaceComponent } from "../DeltaSurface/DeltaSurfaceComponent";
import { isGroup } from "../Group/Group";
import { GroupComponent } from "../Group/GroupComponent";
import { isSharedSetting } from "../SharedSetting/SharedSetting";
import { SharedSettingComponent } from "../SharedSetting/SharedSettingComponent";

export function makeSortableListItemComponent(
    item: Item,
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[],
    onActionClick?: (identifier: string, group: ItemGroup) => void,
): React.ReactElement {
    if (isDataProvider(item)) {
        return <DataProviderComponent key={item.getItemDelegate().getId()} dataProvider={item} />;
    }
    if (isContextBoundary(item)) {
        return (
            <ContextBoundaryComponent
                key={item.getItemDelegate().getId()}
                group={item}
                makeActionsForGroup={makeActionsForGroup}
                onActionClick={onActionClick}
            />
        );
    }
    if (isGroup(item)) {
        return (
            <GroupComponent
                key={item.getItemDelegate().getId()}
                group={item}
                makeActionsForGroup={makeActionsForGroup}
                onActionClick={onActionClick}
            />
        );
    }
    if (item instanceof DeltaSurface) {
        return (
            <DeltaSurfaceComponent
                key={item.getItemDelegate().getId()}
                deltaSurface={item}
                makeActionsForGroup={makeActionsForGroup}
                onActionClick={onActionClick}
            />
        );
    }
    if (isSharedSetting(item)) {
        return <SharedSettingComponent key={item.getItemDelegate().getId()} sharedSetting={item} />;
    }

    throw new Error(`Unsupported item type: ${item.constructor.name}`);
}
