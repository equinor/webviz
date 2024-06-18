import {
    LAYER_TYPE_TO_STRING_MAPPING,
    LayerActionType,
    LayerActions,
    LayerType,
} from "@modules/Intersection/typesAndEnums";
import { BaseLayer } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { SeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { SurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { WellpicksLayer } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { QueryClient } from "@tanstack/query-core";

import { Getter, WritableAtom, atom } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

function makeUniqueLayerName(name: string, layers: BaseLayer<any, any>[]): string {
    let potentialName = name;
    let i = 1;
    while (layers.some((layer) => layer.getName() === potentialName)) {
        potentialName = `${name} (${i})`;
        i++;
    }
    return potentialName;
}

function makeLayer(type: LayerType, name: string, queryClient: QueryClient): BaseLayer<any, any> {
    switch (type) {
        case LayerType.GRID:
            return new GridLayer(name, queryClient);
        case LayerType.SEISMIC:
            return new SeismicLayer(name, queryClient);
        case LayerType.SURFACES:
            return new SurfaceLayer(name, queryClient);
        case LayerType.WELLPICKS:
            return new WellpicksLayer(name, queryClient);
        default:
            throw new Error(`Layer type ${type} not supported`);
    }
}

export function atomWithReducerAndGetter<Value, Action>(
    initialValue: Value,
    reducer: (value: Value, action: Action, get: Getter) => Value
): WritableAtom<Value, [Action], void> {
    const valueAtom = atom(initialValue);

    return atom(
        (get) => {
            return get(valueAtom);
        },
        (get, set, action) => {
            const newValue = reducer(get(valueAtom), action, get);
            set(valueAtom, newValue);
        }
    );
}

export const layersAtom = atomWithReducerAndGetter<BaseLayer<any, any>[], LayerActions>(
    [],
    (prev: BaseLayer<any, any>[], action: LayerActions, get: Getter) => {
        const queryClient = get(queryClientAtom);
        if (action.type === LayerActionType.ADD_LAYER) {
            return [
                ...prev,
                makeLayer(
                    action.payload.type,
                    makeUniqueLayerName(LAYER_TYPE_TO_STRING_MAPPING[action.payload.type], prev),
                    queryClient
                ),
            ];
        }
        if (action.type === LayerActionType.REMOVE_LAYER) {
            return prev.filter((layer) => layer.getId() !== action.payload.id);
        }
        if (action.type === LayerActionType.TOGGLE_LAYER_VISIBILITY) {
            const layer = prev.find((layer) => layer.getId() === action.payload.id);
            if (!layer) {
                return prev;
            }
            layer.setIsVisible(!layer.getIsVisible());
            return prev;
        }

        if (action.type === LayerActionType.UPDATE_SETTING) {
            const layer = prev.find((layer) => layer.getId() === action.payload.id);
            if (!layer) {
                return prev;
            }
            layer.maybeUpdateSettings(action.payload.settings);
            return prev;
        }

        if (action.type === LayerActionType.CHANGE_ORDER) {
            return action.payload.orderedIds
                .map((id) => prev.find((layer) => layer.getId() === id))
                .filter(Boolean) as BaseLayer<any, any>[];
        }

        if (action.type === LayerActionType.MOVE_LAYER) {
            const layer = prev.find((layer) => layer.getId() === action.payload.id);
            if (!layer) {
                return prev;
            }
            const index = prev.indexOf(layer);
            const moveToIndex = action.payload.moveToIndex;
            if (index === moveToIndex) {
                return prev;
            }

            if (moveToIndex <= 0) {
                return [layer, ...prev.filter((el) => el.getId() !== action.payload.id)];
            }

            if (moveToIndex >= prev.length - 1) {
                return [...prev.filter((el) => el.getId() !== action.payload.id), layer];
            }

            const newLayers = [...prev];
            newLayers.splice(index, 1);
            newLayers.splice(moveToIndex, 0, layer);

            return newLayers;
        }

        return prev;
    }
);
