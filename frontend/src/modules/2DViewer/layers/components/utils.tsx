import { SurfaceDef_api } from "@api";
import { SortableListItemProps } from "@lib/components/SortableList";
import { Vec2, rotatePoint2Around } from "@lib/utils/vec2";

import { GroupComponent } from "./GroupComponent";
import { LayerComponent } from "./LayerComponent";
import { SharedSettingComponent } from "./SharedSettingComponent";
import { LayersActionGroup } from "./layersActions";

import { SharedSetting } from "../SharedSetting";
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
        return (
            <GroupComponent
                key={item.getItemDelegate().getId()}
                group={item}
                actions={layerActions}
                onActionClick={onActionClick}
            />
        );
    }
    if (item instanceof SharedSetting) {
        return <SharedSettingComponent key={item.getItemDelegate().getId()} sharedSetting={item} onRemove={() => {}} />;
    }
    throw new Error("Not implemented");
}

export function calcBoundsForRotationAroundUpperLeftCorner(surfDef: SurfaceDef_api): [number, number, number, number] {
    const width = (surfDef.npoints_x - 1) * surfDef.inc_x;
    const height = (surfDef.npoints_y - 1) * surfDef.inc_y;
    const orgRotPoint: Vec2 = { x: surfDef.origin_utm_x, y: surfDef.origin_utm_y };
    const orgTopLeft: Vec2 = { x: surfDef.origin_utm_x, y: surfDef.origin_utm_y + height };

    const transTopLeft: Vec2 = rotatePoint2Around(orgTopLeft, orgRotPoint, (surfDef.rot_deg * Math.PI) / 180);
    const tLeft = transTopLeft.x;
    const tBottom = transTopLeft.y - height;
    const tRight = transTopLeft.x + width;
    const tTop = transTopLeft.y;

    const bounds: [number, number, number, number] = [tLeft, tBottom, tRight, tTop];

    return bounds;
}
