import React from "react";

import { View as DeckGlView, Layer } from "@deck.gl/core/typed";
import { ModuleViewProps } from "@framework/Module";
import { useQueryClient } from "@tanstack/react-query";
import { ViewportType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer, { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { Axes2DLayer } from "@webviz/subsurface-viewer/dist/layers";

import { makeLayer } from "./layerFactory";

import { Interfaces } from "../interfaces";
import { LayerManager, LayerManagerTopic } from "../layers/LayerManager";
import { usePublishSubscribeTopicValue } from "../layers/PublishSubscribeHandler";
import { View as ViewGroup } from "../layers/View";
import { GroupBaseTopic, GroupDelegate } from "../layers/delegates/GroupDelegate";
import { Item, LayerStatus, instanceofGroup, instanceofLayer } from "../layers/interfaces";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
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

    const results = extractGroupsAndLayers(items);

    const numCols = Math.ceil(Math.sqrt(results.groupLayersMap.size));
    const numRows = Math.ceil(results.groupLayersMap.size / numCols);

    const viewports: ViewportType[] = [];
    const viewerLayers: Layer[] = [];
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
                ...layers.map((layer) => (layer as unknown as Layer).id),
                ...results.globalLayers.map((layer) => layer.id),
                "axes",
            ],
        });
        viewerLayers.push(...layers);
        viewportAnnotations.push(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={group} id={group}>
                <div className="w-full font-bold text-lg flex gap-2 justify-center items-center">
                    <div
                        className="rounded-full h-3 w-3"
                        style={{ backgroundColor: results.groupMeta.get(group)?.color ?? undefined }}
                    />
                    <div className="">{results.groupMeta.get(group)?.name ?? group}</div>
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

    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer
                id="deckgl"
                views={views}
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
            >
                {viewportAnnotations}
            </SubsurfaceViewer>
        </div>
    );
}

export type GroupMeta = {
    name: string;
    color: string | null;
};

function extractGroupsAndLayers(items: Item[]): {
    groupLayersMap: Map<string, Layer[]>;
    groupMeta: Map<string, GroupMeta>;
    globalLayers: Layer[];
} {
    const groupLayersMap: Map<string, Layer[]> = new Map();
    const groupMeta: Map<string, GroupMeta> = new Map();
    const globalLayers: Layer[] = [];

    for (const item of items) {
        if (!item.getItemDelegate().isVisible()) {
            continue;
        }

        if (instanceofLayer(item)) {
            if (item.getLayerDelegate().getStatus() !== LayerStatus.SUCCESS) {
                continue;
            }

            const layer = makeLayer(item);
            if (!layer) {
                continue;
            }

            globalLayers.push(layer);
        }
        if (instanceofGroup(item)) {
            if (item instanceof ViewGroup) {
                groupMeta.set(item.getItemDelegate().getId(), {
                    name: item.getItemDelegate().getName(),
                    color: item.getGroupDelegate().getColor(),
                });

                const children = recursivelyExtractLayers(item.getGroupDelegate().getChildren());
                groupLayersMap.set(item.getItemDelegate().getId(), children);
            }
        }
    }

    return { groupLayersMap, groupMeta, globalLayers };
}

function recursivelyExtractLayers(items: Item[]): Layer[] {
    const layers: Layer[] = [];

    for (const item of items) {
        if (!item.getItemDelegate().isVisible()) {
            continue;
        }

        if (instanceofLayer(item)) {
            const layer = makeLayer(item);
            if (!layer) {
                continue;
            }

            layers.push(layer);
        }
        if (instanceofGroup(item)) {
            if (item instanceof ViewGroup) {
                continue;
            }
            layers.push(...recursivelyExtractLayers(item.getGroupDelegate().getChildren()));
        }
    }

    return layers.reverse();
}
