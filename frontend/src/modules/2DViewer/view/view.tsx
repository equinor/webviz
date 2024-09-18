import React from "react";

import { Layer as DeckGlLayer, View as DeckGlView } from "@deck.gl/core/typed";
import { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Rect2D, rectContainsPoint } from "@lib/utils/geometry";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import { useQueryClient } from "@tanstack/react-query";
import { ViewportType } from "@webviz/subsurface-viewer";
import { ViewStateType, ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { Axes2DLayer } from "@webviz/subsurface-viewer/dist/layers";

import { Toolbar } from "./components/Toolbar";
import { makeLayer } from "./layerFactory";

import { Interfaces } from "../interfaces";
import { ColorScale } from "../layers/ColorScale";
import { LayerManager, LayerManagerTopic } from "../layers/LayerManager";
import { usePublishSubscribeTopicValue } from "../layers/PublishSubscribeHandler";
import { View as ViewGroup } from "../layers/View";
import { GroupBaseTopic, GroupDelegate } from "../layers/delegates/GroupDelegate";
import { Item, Layer, LayerStatus, instanceofGroup, instanceofLayer } from "../layers/interfaces";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const id = React.useId();

    const [prevBounds, setPrevBounds] = React.useState<[number, number, number, number] | null>(null);
    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);

    const queryClient = useQueryClient();
    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");
    const items: Item[] = usePublishSubscribeTopicValue(
        layerManager?.getGroupDelegate() || new GroupDelegate(null),
        GroupBaseTopic.CHILDREN
    );

    usePublishSubscribeTopicValue(
        layerManager ?? new LayerManager(props.workbenchSession, props.workbenchSettings, queryClient),
        LayerManagerTopic.LAYER_DATA_REVISION
    );

    usePublishSubscribeTopicValue(
        layerManager?.getGroupDelegate() || new GroupDelegate(null),
        GroupBaseTopic.TREE_REVISION_NUMBER
    );

    const results = extractGroupsAndLayers(items);

    const numCols = Math.ceil(Math.sqrt(results.groupLayersMap.size));
    const numRows = Math.ceil(results.groupLayersMap.size / numCols);

    const viewports: ViewportType[] = [];
    const viewerLayers: DeckGlLayer[] = [];
    const viewportAnnotations: React.ReactNode[] = [];

    const views: ViewsType = {
        layout: [numRows, numCols],
        viewports: viewports,
        showLabel: true,
    };

    for (const [group, layers] of results.groupLayersMap) {
        viewports.push({
            id: group,
            name: results.groupMeta.get(group)?.name ?? group,
            isSync: true,
            layerIds: [
                ...layers.map((layer) => (layer as unknown as DeckGlLayer).id),
                ...results.globalLayers.map((layer) => layer.id),
                "axes",
            ],
        });
        viewerLayers.push(...layers);
        viewportAnnotations.push(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={group} id={group}>
                <div className="font-bold text-lg flex gap-2 justify-center items-center">
                    <div className="flex gap-2 items-center bg-white p-2 backdrop-blur bg-opacity-50 rounded">
                        <div
                            className="rounded-full h-3 w-3 border border-white"
                            style={{ backgroundColor: results.groupMeta.get(group)?.color ?? undefined }}
                        />
                        <div className="">{results.groupMeta.get(group)?.name ?? group}</div>
                    </div>
                </div>
            </DeckGlView>
        );
    }
    viewerLayers.push(...results.globalLayers.toReversed());
    viewerLayers.push(
        new Axes2DLayer({
            id: "axes",
            axisColor: [80, 80, 80],
            backgroundColor: [250, 250, 250],
        })
    );

    if (results.bounds !== null) {
        if (prevBounds !== null) {
            const oldBoundingRect: Rect2D | null = {
                x: prevBounds[0],
                y: prevBounds[1],
                width: prevBounds[2] - prevBounds[0],
                height: prevBounds[3] - prevBounds[1],
            };

            const newBoundingRect: Rect2D = {
                x: results.bounds[0],
                y: results.bounds[1],
                width: results.bounds[2] - results.bounds[0],
                height: results.bounds[3] - results.bounds[1],
            };

            if (
                !(
                    rectContainsPoint(oldBoundingRect, newBoundingRect) ||
                    rectContainsPoint(newBoundingRect, oldBoundingRect)
                )
            ) {
                setPrevBounds(results.bounds);
            }
        } else {
            setPrevBounds(results.bounds);
        }
    }

    function handleFitInViewClick() {
        if (prevBounds === null) {
            return;
        }
        const targetX = (prevBounds[0] + prevBounds[2]) / 2;
        const targetY = (prevBounds[1] + prevBounds[3]) / 2;
        const targetZ = 10.0;

        setCameraPositionSetByAction({
            rotationOrbit: 100,
            rotationX: 90,
            target: [targetX, targetY, targetZ],
            zoom: NaN,
        });
    }

    function handleVerticalScaleDecrease() {
        setVerticalScale((prev) => prev - 0.1);
    }

    function handleVerticalScaleIncrease() {
        setVerticalScale((prev) => prev + 0.1);
    }

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <Toolbar
                onFitInView={handleFitInViewClick}
                onVerticalScaleDecrease={handleVerticalScaleDecrease}
                onVerticalScaleIncrease={handleVerticalScaleIncrease}
                verticalScale={verticalScale}
            />
            <ColorLegendsContainer
                colorScales={results.colorScales}
                height={mainDivSize.height / 2 - 50}
                position="left"
            />
            <SubsurfaceViewerWithCameraState
                id={`subsurface-viewer-${id}`}
                views={views}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
                bounds={prevBounds ?? undefined}
                layers={viewerLayers}
                scale={{
                    visible: true,
                    incrementValue: 100,
                    widthPerUnit: 100,
                    cssStyle: {
                        right: 10,
                        top: 10,
                    },
                }}
                verticalScale={verticalScale}
            >
                {viewportAnnotations}
            </SubsurfaceViewerWithCameraState>
        </div>
    );
}

export type GroupMeta = {
    name: string;
    color: string | null;
};

function extractGroupsAndLayers(items: Item[]): {
    groupLayersMap: Map<string, DeckGlLayer[]>;
    groupMeta: Map<string, GroupMeta>;
    globalLayers: DeckGlLayer[];
    bounds: [number, number, number, number] | null;
    colorScales: { id: string; colorScale: ColorScaleWithName }[];
} {
    const groupLayersMap: Map<string, DeckGlLayer[]> = new Map();
    const groupMeta: Map<string, GroupMeta> = new Map();
    const globalLayers: DeckGlLayer[] = [];
    let bounds: [number, number, number, number] | null = null;
    const colorScales: { id: string; colorScale: ColorScaleWithName }[] = [];

    for (const item of items) {
        if (!item.getItemDelegate().isVisible()) {
            continue;
        }

        if (instanceofLayer(item)) {
            if (item.getLayerDelegate().getStatus() !== LayerStatus.SUCCESS) {
                continue;
            }

            const colorScale = findColorScale(item);
            if (colorScale) {
                colorScales.push(colorScale);
            }

            const layer = makeLayer(item, colorScale?.colorScale);
            if (!layer) {
                continue;
            }

            bounds = findBounds(item, bounds);

            globalLayers.push(layer);
        }
        if (instanceofGroup(item)) {
            if (item instanceof ViewGroup) {
                groupMeta.set(item.getItemDelegate().getId(), {
                    name: item.getItemDelegate().getName(),
                    color: item.getGroupDelegate().getColor(),
                });

                const {
                    layers: children,
                    bounds: newBounds,
                    colorScales: newColorScales,
                } = recursivelyExtractLayers(item.getGroupDelegate().getChildren());
                groupLayersMap.set(item.getItemDelegate().getId(), children);

                if (!bounds) {
                    bounds = newBounds;
                } else if (newBounds) {
                    bounds = [
                        Math.min(bounds[0], newBounds[0]),
                        Math.min(bounds[1], newBounds[1]),
                        Math.max(bounds[2], newBounds[2]),
                        Math.max(bounds[3], newBounds[3]),
                    ];
                }
                colorScales.push(...newColorScales);
            }
        }
    }

    return { groupLayersMap, groupMeta, globalLayers, bounds, colorScales };
}

function findColorScale(layer: Layer<any, any>): { id: string; colorScale: ColorScaleWithName } | null {
    const colorScaleItemArr = layer
        .getItemDelegate()
        .getParentGroup()
        ?.getAncestorAndSiblingItems((item) => item instanceof ColorScale);
    if (!colorScaleItemArr || colorScaleItemArr.length === 0) {
        return null;
    }

    const colorScaleItem = colorScaleItemArr[0];
    if (!(colorScaleItem instanceof ColorScale)) {
        return null;
    }

    return {
        id: layer.getItemDelegate().getId(),
        colorScale: ColorScaleWithName.fromColorScale(
            colorScaleItem.getColorScale(),
            layer.getItemDelegate().getName()
        ),
    };
}

function findBounds(
    layer: Layer<any, any>,
    currentBounds: [number, number, number, number] | null
): [number, number, number, number] | null {
    const boundingBox = layer.getLayerDelegate().getBoundingBox();
    if (!boundingBox) {
        return currentBounds;
    }

    const [xMin, xMax] = boundingBox.x;
    const [yMin, yMax] = boundingBox.y;

    if (!currentBounds) {
        return [xMin, yMin, xMax, yMax];
    }

    return [
        Math.min(xMin, currentBounds[0]),
        Math.min(yMin, currentBounds[1]),
        Math.max(xMax, currentBounds[2]),
        Math.max(yMax, currentBounds[3]),
    ];
}

function recursivelyExtractLayers(items: Item[]): {
    layers: DeckGlLayer[];
    bounds: [number, number, number, number] | null;
    colorScales: { id: string; colorScale: ColorScaleWithName }[];
} {
    const layers: DeckGlLayer[] = [];
    let bounds: [number, number, number, number] | null = null;
    const colorScales: { id: string; colorScale: ColorScaleWithName }[] = [];

    for (const item of items) {
        if (!item.getItemDelegate().isVisible()) {
            continue;
        }

        if (instanceofLayer(item)) {
            const colorScale = findColorScale(item);
            if (colorScale) {
                colorScales.push(colorScale);
            }

            const layer = makeLayer(item, colorScale?.colorScale);
            if (!layer) {
                continue;
            }

            bounds = findBounds(item, bounds);

            layers.push(layer);
        }
        if (instanceofGroup(item)) {
            if (item instanceof ViewGroup) {
                continue;
            }
            const { layers: childLayers, bounds: childBounds } = recursivelyExtractLayers(
                item.getGroupDelegate().getChildren()
            );
            layers.push(...childLayers);

            if (!bounds) {
                bounds = childBounds;
            } else if (childBounds) {
                bounds = [
                    Math.min(bounds[0], childBounds[0]),
                    Math.min(bounds[1], childBounds[1]),
                    Math.max(bounds[2], childBounds[2]),
                    Math.max(bounds[3], childBounds[3]),
                ];
            }
        }
    }

    return { layers: layers.reverse(), bounds, colorScales };
}
