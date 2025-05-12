import React from "react";

import { View as DeckGlView, type Layer } from "@deck.gl/core";
import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import * as bbox from "@lib/utils/boundingBox";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { makeDrilledWellTrajectoriesLayer } from "@modules/3DViewerNew/DataProviderFramework/visualization/makeDrilledWellTrajectoriesLayer";
import { makeIntersectionLayer } from "@modules/3DViewerNew/DataProviderFramework/visualization/makeIntersectionGrid3dLayer";
import { makeRealizationSurfaceLayer } from "@modules/3DViewerNew/DataProviderFramework/visualization/makeRealizationSurfaceLayer";
import {
    Plane,
    makeSeismicFenceMeshLayerFunction,
} from "@modules/3DViewerNew/DataProviderFramework/visualization/makeSeismicFenceMeshLayer";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import type { ViewportType } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { InteractionWrapper } from "./InteractionWrapper";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";
import {
    VisualizationAssembler,
    VisualizationItemType,
    type VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { RealizationSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationSurfaceProvider";
import { makeColorScaleAnnotation } from "@modules/2DViewer/DataProviderFramework/annotations/makeColorScaleAnnotation";
import { StatisticalSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/StatisticalSurfaceProvider";
import { RealizationPolygonsProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationPolygonsProvider";
import { makeRealizationPolygonsLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationPolygonsLayer";
import { IntersectionRealizationGridProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { RealizationGridProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationGridProvider";
import { makeRealizationGridLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationGridLayer";
import { DrilledWellborePicksProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicksProvider";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { DrilledWellTrajectoriesProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { RealizationSeismicDepthSliceProvider } from "@modules/3DViewerNew/DataProviderFramework/customDataProviderImplementations/RealizationSeismicDepthProvider";
import { RealizationSeismicInlineProvider } from "@modules/3DViewerNew/DataProviderFramework/customDataProviderImplementations/RealizationSeismicInlineProvider";
import { RealizationSeismicCrosslineProvider } from "@modules/3DViewerNew/DataProviderFramework/customDataProviderImplementations/RealizationSeismicCrosslineProvider";
import {
    DataProviderManagerTopic,
    type DataProviderManager,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { makeStatisticalSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeStatisticalSurfaceLayer";

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<VisualizationTarget.DECK_GL>();

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_SURFACE_3D,
    RealizationSurfaceProvider,
    {
        transformToVisualization: makeRealizationSurfaceLayer,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.STATISTICAL_SURFACE_3D,
    StatisticalSurfaceProvider,
    {
        transformToVisualization: makeStatisticalSurfaceLayer,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_POLYGONS,
    RealizationPolygonsProvider,
    {
        transformToVisualization: makeRealizationPolygonsLayer,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    {
        transformToVisualization: makeIntersectionLayer,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(DataProviderType.REALIZATION_GRID, RealizationGridProvider, {
    transformToVisualization: makeRealizationGridLayer,
    transformToAnnotations: makeColorScaleAnnotation,
});
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELLBORE_PICKS,
    DrilledWellborePicksProvider,
    {
        transformToVisualization: makeDrilledWellborePicksLayer,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELL_TRAJECTORIES,
    DrilledWellTrajectoriesProvider,
    {
        transformToVisualization: makeDrilledWellTrajectoriesLayer,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_SEISMIC_DEPTH_SLICE,
    RealizationSeismicDepthSliceProvider,
    {
        transformToVisualization: makeSeismicFenceMeshLayerFunction(Plane.DEPTH),
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_SEISMIC_INLINE,
    RealizationSeismicInlineProvider,
    {
        transformToVisualization: makeSeismicFenceMeshLayerFunction(Plane.INLINE),
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_SEISMIC_CROSSLINE,
    RealizationSeismicCrosslineProvider,
    {
        transformToVisualization: makeSeismicFenceMeshLayerFunction(Plane.CROSSLINE),
    },
);

export type LayersWrapperProps = {
    fieldIdentifier: string | null;
    layerManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<bbox.BBox | null>(null);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, DataProviderManagerTopic.DATA_REVISION);

    const viewports: ViewportType[] = [];
    const deckGlLayers: Layer<any>[] = [];
    const viewportAnnotations: React.ReactNode[] = [];
    const globalLayerIds: string[] = ["placeholder"];

    let numLoadingLayers = 0;

    const assemblerProduct = VISUALIZATION_ASSEMBLER.make(props.layerManager);

    const globalAnnotations = assemblerProduct.annotations;

    const numViews = assemblerProduct.children.filter(
        (item) => item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW,
    ).length;

    let numCols = Math.ceil(Math.sqrt(numViews));
    let numRows = Math.ceil(numViews / numCols);

    for (const item of assemblerProduct.children) {
        if (item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW) {
            const layerIds: string[] = [];
            for (const child of item.children) {
                if (child.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
                    const layer = child.visualization;
                    layerIds.push(layer.id);
                    deckGlLayers.push(layer);
                }
            }
            viewports.push({
                id: item.id,
                name: item.name,
                isSync: true,
                show3D: true,
                layerIds,
            });

            viewportAnnotations.push(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                /* @ts-expect-error */
                <DeckGlView key={item.id} id={item.id}>
                    <ColorLegendsContainer
                        colorScales={[...item.annotations.filter((el) => "colorScale" in el), ...globalAnnotations]}
                        height={((mainDivSize.height / 3) * 2) / numCols - 20}
                        position="left"
                    />
                    <div className="font-bold text-lg flex gap-2 justify-center items-center">
                        <div className="flex gap-2 items-center bg-white/50 p-2 backdrop-blur-sm rounded-sm">
                            <div
                                className="rounded-full h-3 w-3 border border-white"
                                style={{ backgroundColor: item.color ?? undefined }}
                            />
                            <div className="">{item.name}</div>
                        </div>
                    </div>
                </DeckGlView>,
            );
        } else if (item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
            deckGlLayers.push(item.visualization);
            globalLayerIds.push(item.visualization.id);
        }
    }

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        [numCols, numRows] = [numRows, numCols];
    }

    if (assemblerProduct.combinedBoundingBox !== null) {
        if (prevBoundingBox !== null) {
            if (!bbox.outerBoxcontainsInnerBox(prevBoundingBox, assemblerProduct.combinedBoundingBox)) {
                setPrevBoundingBox(assemblerProduct.combinedBoundingBox);
            }
        } else {
            setPrevBoundingBox(assemblerProduct.combinedBoundingBox);
        }
    }

    numLoadingLayers = assemblerProduct.numLoadingDataProviders;
    statusWriter.setLoading(assemblerProduct.numLoadingDataProviders > 0);

    for (const message of assemblerProduct.aggregatedErrorMessages) {
        statusWriter.addError(message);
    }

    deckGlLayers.push(new PlaceholderLayer({ id: "placeholder" }));
    deckGlLayers.push(
        new AxesLayer({
            id: "axes-layer",
            visible: true,
            ZIncreasingDownwards: true,
        }),
    );

    deckGlLayers.reverse();

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                <InteractionWrapper
                    fieldIdentifier={props.fieldIdentifier}
                    views={{
                        layout: [numCols, numRows],
                        viewports: viewports.map((viewport) => ({
                            ...viewport,
                            layerIds: [...(viewport.layerIds ?? []), ...globalLayerIds],
                        })),
                        showLabel: false,
                    }}
                    viewportAnnotations={viewportAnnotations}
                    layers={deckGlLayers}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            </div>
        </div>
    );
}
