import { ColorScaleComponent } from "./ColorScaleComponent";
import { DeltaSurfaceComponent } from "./DeltaSurfaceComponent";
import { LayerComponent } from "./LayerComponent";
import { LayersActionGroup } from "./LayersActions";
import { SettingsGroupComponent } from "./SettingsGroupComponent";
import { SharedSettingComponent } from "./SharedSettingComponent";
import { ViewComponent } from "./ViewComponent";

import { ColorScale } from "../ColorScale";
import { DeltaSurface } from "../DeltaSurface";
import { SettingsGroup } from "../SettingsGroup";
import { SharedSetting } from "../SharedSetting";
import { View } from "../View";
import { Group, Item, instanceofLayer } from "../interfaces";

export function makeSortableListItemComponent(
    item: Item,
    layerActions?: LayersActionGroup[],
    onActionClick?: (identifier: string, group: Group) => void
): React.ReactElement {
    if (instanceofLayer(item)) {
        return <LayerComponent key={item.getItemDelegate().getId()} layer={item} />;
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
    if (item instanceof View) {
        return (
            <ViewComponent
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
    if (item instanceof ColorScale) {
        return <ColorScaleComponent key={item.getItemDelegate().getId()} colorScale={item} />;
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
