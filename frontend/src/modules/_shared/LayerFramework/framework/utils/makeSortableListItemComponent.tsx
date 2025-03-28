import type { LayersActionGroup } from "../../LayersActions";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entitites";
import { DataLayer } from "../DataLayer/DataLayer";
import { DataLayerComponent } from "../DataLayer/DataLayerComponent";
import { DeltaSurface } from "../DeltaSurface/DeltaSurface";
import { DeltaSurfaceComponent } from "../DeltaSurface/DeltaSurfaceComponent";
import { Group } from "../Group/Group";
import { GroupComponent } from "../Group/GroupComponent";
import { SettingsGroup } from "../SettingsGroup/SettingsGroup";
import { SettingsGroupComponent } from "../SettingsGroup/SettingsGroupComponent";
import { SharedSetting } from "../SharedSetting/SharedSetting";
import { SharedSettingComponent } from "../SharedSetting/SharedSettingComponent";

export function makeSortableListItemComponent(
    item: Item,
    layerActions?: LayersActionGroup[],
    onActionClick?: (identifier: string, group: ItemGroup) => void
): React.ReactElement {
    if (item instanceof DataLayer) {
        return <DataLayerComponent key={item.getItemDelegate().getId()} layer={item} />;
    }
    if (item instanceof SettingsGroup) {
        return (
            <SettingsGroupComponent
                key={item.getItemDelegate().getId()}
                group={item}
                actions={layerActions}
                onActionClick={onActionClick}
            />
        );
    }
    if (item instanceof Group) {
        return (
            <GroupComponent
                key={item.getItemDelegate().getId()}
                group={item}
                actions={layerActions ? filterAwayViewActions(layerActions) : undefined}
                onActionClick={onActionClick}
            />
        );
    }
    if (item instanceof DeltaSurface) {
        return (
            <DeltaSurfaceComponent
                key={item.getItemDelegate().getId()}
                deltaSurface={item}
                actions={layerActions ? filterAwayNonSurfaceActions(layerActions) : undefined}
                onActionClick={onActionClick}
            />
        );
    }
    if (item instanceof SharedSetting) {
        return <SharedSettingComponent key={item.getItemDelegate().getId()} sharedSetting={item} />;
    }

    throw new Error(`Unsupported item type: ${item.constructor.name}`);
}

function filterAwayViewActions(actions: LayersActionGroup[]): LayersActionGroup[] {
    return actions.map((group) => ({
        ...group,
        children: group.children.filter((child) => child.label !== "View"),
    }));
}

function filterAwayNonSurfaceActions(actions: LayersActionGroup[]): LayersActionGroup[] {
    const result: LayersActionGroup[] = [];

    for (const group of actions) {
        if (group.label === "Shared Settings") {
            result.push(group);
            continue;
        }
        if (group.label !== "Layers") {
            continue;
        }
        const children = group.children.filter((child) => child.label.includes("Surface"));
        if (children.length > 0) {
            result.push({
                ...group,
                children,
            });
        }
    }

    return result;
}
