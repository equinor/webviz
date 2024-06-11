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

/*
export const layersAccessAtom = atom<Layer[]>((get) => {
    const layers = get(layersAtom);
    const adjustedLayers: Layer[] = [];

    for (const layer of layers) {
        if (layer.type === LayerType.GRID) {
            adjustedLayers.push(fixupGridLayer(layer as GridLayer, get));
        }
        if (layer.type === LayerType.SEISMIC) {
            adjustedLayers.push(fixupSeismicLayer(layer as SeismicLayer, get));
        }
    }

    return adjustedLayers;
});

function fixupGridLayer(layer: GridLayer, get: Getter): GridLayer {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const adjustedSettings = cloneDeep(layer.settings);

    if (!gridModelInfos.data) {
        return layer;
    }

    if (
        layer.settings.modelName === null ||
        !gridModelInfos.data.map((gridModelInfo) => gridModelInfo.grid_name).includes(layer.settings.modelName)
    ) {
        adjustedSettings.modelName = gridModelInfos.data[0]?.grid_name || null;
    }

    const gridModelInfo = gridModelInfos.data.find((info) => info.grid_name === adjustedSettings.modelName);

    if (adjustedSettings.modelName) {
        if (
            layer.settings.parameterName === null ||
            !gridModelInfos.data
                .find((gridModelInfo) => gridModelInfo.grid_name === adjustedSettings.modelName)
                ?.property_info_arr.some((propertyInfo) => propertyInfo.property_name === layer.settings.parameterName)
        ) {
            adjustedSettings.parameterName =
                gridModelInfos.data.find((gridModelInfo) => gridModelInfo.grid_name === adjustedSettings.modelName)
                    ?.property_info_arr[0]?.property_name || null;
        }
    }

    if (adjustedSettings.modelName && adjustedSettings.parameterName) {
        if (
            layer.settings.parameterDateOrInterval === null ||
            !gridModelInfos.data
                .find((gridModelInfo) => gridModelInfo.grid_name === adjustedSettings.modelName)
                ?.property_info_arr.some(
                    (propertyInfo) =>
                        propertyInfo.property_name === adjustedSettings.parameterName &&
                        propertyInfo.iso_date_or_interval === layer.settings.parameterDateOrInterval
                )
        ) {
            adjustedSettings.parameterDateOrInterval =
                gridModelInfos.data
                    .find((gridModelInfo) => gridModelInfo.grid_name === adjustedSettings.modelName)
                    ?.property_info_arr.find(
                        (propertyInfo) => propertyInfo.property_name === adjustedSettings.parameterName
                    )?.iso_date_or_interval || null;
        }
    }

    let boundingBox = cloneDeep(layer.boundingBox);
    if (gridModelInfo) {
        boundingBox = {
            x: [gridModelInfo.bbox.xmin, gridModelInfo.bbox.xmax],
            y: [gridModelInfo.bbox.ymin, gridModelInfo.bbox.ymax],
        };
    }

    return {
        ...layer,
        settings: adjustedSettings,
        boundingBox,
    };
}

function fixupSeismicLayer(layer: SeismicLayer, get: Getter): SeismicLayer {
    const adjustedSettings = cloneDeep(layer.settings);
    const availableSeismicAttributes = get(availableSeismicAttributesAtom);
    const availableSeismicDateOrIntervalStrings = get(availableSeismicDateOrIntervalStringsAtom);

    if (!availableSeismicAttributes.some((el) => el === layer.settings.attribute) || !layer.settings.attribute) {
        adjustedSettings.attribute = availableSeismicAttributes[0] || null;
    }

    if (
        !availableSeismicDateOrIntervalStrings.some((el) => el === layer.settings.dateOrInterval) ||
        !layer.settings.dateOrInterval
    ) {
        adjustedSettings.dateOrInterval = availableSeismicDateOrIntervalStrings[0] || null;
    }

    return {
        ...layer,
        settings: adjustedSettings,
    };
}

function makeInitialLayerSettings(type: LayerType): Record<string, unknown> {
    switch (type) {
        case LayerType.GRID:
            return {
                modelName: null,
                parameterName: null,
                parameterDateOrInterval: null,
                colorScale: new ColorScale({
                    colorPalette: new ColorPalette({
                        name: "Blue to Yellow",
                        colors: [
                            "#115f9a",
                            "#1984c5",
                            "#22a7f0",
                            "#48b5c4",
                            "#76c68f",
                            "#a6d75b",
                            "#c9e52f",
                            "#d0ee11",
                            "#f4f100",
                        ],
                        id: "blue-to-yellow",
                    }),
                    gradientType: ColorScaleGradientType.Sequential,
                    type: ColorScaleType.Continuous,
                    steps: 10,
                }),
            };
        case LayerType.SEISMIC:
            return {
                surveyType: SeismicSurveyType.THREE_D,
                dataType: SeismicDataType.SIMULATED,
                attribute: null,
                dateOrInterval: null,
            };
        default:
            return {};
    }
}

*/

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

/*
export const layersAtom = atomWithReducer<BaseLayer<any, any>[], LayerActions>([], (prev: BaseLayer<any, any>[], action: LayerActions) => {
    const queryClient = get(queryClientAtom);
    switch (action.type) {
        case LayerActionType.ADD_LAYER:
            return [
                ...prev,
                
            ];
        case LayerActionType.REMOVE_LAYER:
            return prev.filter((layer) => layer.id !== action.payload.id);
        case LayerActionType.TOGGLE_LAYER_VISIBILITY:
            return prev.map((layer) =>
                layer.id === action.payload.id ? { ...layer, visible: !layer.visible } : layer
            );
        case LayerActionType.TOGGLE_LAYER_SETTINGS_VISIBILITY:
            return prev.map((layer) =>
                layer.id === action.payload.id ? { ...layer, showSettings: !layer.showSettings } : layer
            );
        case LayerActionType.UPDATE_SETTING:
            return prev.map((layer) =>
                layer.id === action.payload.id
                    ? { ...layer, settings: { ...layer.settings, ...action.payload.settings } }
                    : layer
            );
        default:
            return prev;
    }
});
*/

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
