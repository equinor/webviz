import { LayersActionGroup } from "../../LayersActions";
import { Group, Item, instanceofLayer } from "../../interfaces";
import { LayerComponent } from "../../layers/LayerComponent";
import { ColorScale } from "../ColorScale/ColorScale";
import { ColorScaleComponent } from "../ColorScale/ColorScaleComponent";
import { DeltaSurface } from "../DeltaSurface/DeltaSurface";
import { DeltaSurfaceComponent } from "../DeltaSurface/DeltaSurfaceComponent";
import { SettingsGroup } from "../SettingsGroup/SettingsGroup";
import { SettingsGroupComponent } from "../SettingsGroup/SettingsGroupComponent";
import { SharedSetting } from "../SharedSetting/SharedSetting";
import { SharedSettingComponent } from "../SharedSetting/SharedSettingComponent";
import { View } from "../View/View";
import { ViewComponent } from "../View/ViewComponent";

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
