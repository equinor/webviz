import React from "react";

import { type Layer } from "@deck.gl/core";
import type { BoundingBox3D } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import {
    accumulatePolylineIds,
    type AccumulatedData,
} from "@modules/3DViewer/DataProviderFramework/accumulators/polylineIdsAccumulator";
import { makeIntersectionRealizationGridBoundingBox } from "@modules/3DViewer/DataProviderFramework/boundingBoxes/makeIntersectionRealizationGridBoundingBox";
import { makeIntersectionRealizationSeismicBoundingBox } from "@modules/3DViewer/DataProviderFramework/boundingBoxes/makeIntersectionRealizationSeismicBoundingBox";
import { makeRealizationSeismicSlicesBoundingBox } from "@modules/3DViewer/DataProviderFramework/boundingBoxes/makeRealizationSeismicSlicesBoundingBox";
import { RealizationGridProvider } from "@modules/3DViewer/DataProviderFramework/customDataProviderImplementations/RealizationGridProvider";
import { RealizationSeismicSlicesProvider } from "@modules/3DViewer/DataProviderFramework/customDataProviderImplementations/RealizationSeismicSlicesProvider";
import { CustomDataProviderType } from "@modules/3DViewer/DataProviderFramework/customDataProviderTypes";
import { makeDrilledWellTrajectoriesHoverVisualizationFunctions } from "@modules/3DViewer/DataProviderFramework/visualization/makeDrilledWellTrajectoriesHoverVisualizationFunctions";
import { makeDrilledWellTrajectoriesLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeDrilledWellTrajectoriesLayer";
import { makeIntersectionRealizationGridLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeIntersectionRealizationGridLayer";
import { makeRealizationSurfaceLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeRealizationSurfaceLayer";
import { makeSeismicIntersectionMeshLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeSeismicIntersectionMeshLayer";
import { makeSeismicSlicesLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeSeismicSlicesLayer";
import type { Interfaces } from "@modules/3DViewer/interfaces";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { DrilledWellborePicksProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { IntersectionRealizationGridProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { IntersectionRealizationSeismicProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import { RealizationPolygonsProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/StatisticalSurfaceProvider";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { makeColorScaleAnnotation } from "@modules/_shared/DataProviderFramework/visualization/annotations/makeColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeSurfaceLayerBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { makeRealizationGridLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationGridLayer";
import { makeRealizationPolygonsLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationPolygonsLayer";
import { makeStatisticalSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeStatisticalSurfaceLayer";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ViewportTypeExtended, ViewsTypeExtended } from "@modules/_shared/types/deckgl";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";
import { PreferredViewLayout } from "../typesAndEnums";

import { InteractionWrapper } from "./InteractionWrapper";

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<
    VisualizationTarget.DECK_GL,
    Record<string, never>,
    Record<string, never>,
    AccumulatedData
>();

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_SURFACE_3D,
    RealizationSurfaceProvider,
    {
        transformToVisualization: makeRealizationSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.STATISTICAL_SURFACE,
    StatisticalSurfaceProvider,
    {
        transformToVisualization: makeStatisticalSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_POLYGONS,
    RealizationPolygonsProvider,
    {
        transformToVisualization: makeRealizationPolygonsLayer,
        transformToBoundingBox: makePolygonDataBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_GRID_3D,
    RealizationGridProvider,
    {
        transformToVisualization: makeRealizationGridLayer,
        transformToBoundingBox: makeRealizationGridBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELLBORE_PICKS,
    DrilledWellborePicksProvider,
    {
        transformToVisualization: makeDrilledWellborePicksLayer,
        transformToBoundingBox: makeDrilledWellborePicksBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELL_TRAJECTORIES,
    DrilledWellTrajectoriesProvider,
    {
        transformToVisualization: makeDrilledWellTrajectoriesLayer,
        transformToBoundingBox: makeDrilledWellTrajectoriesBoundingBox,
        transformToHoverVisualization: makeDrilledWellTrajectoriesHoverVisualizationFunctions,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_SEISMIC_SLICES,
    RealizationSeismicSlicesProvider,
    {
        transformToVisualization: makeSeismicSlicesLayer,
        transformToAnnotations: makeColorScaleAnnotation,
        transformToBoundingBox: makeRealizationSeismicSlicesBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    {
        transformToVisualization: makeIntersectionRealizationGridLayer,
        transformToAnnotations: makeColorScaleAnnotation,
        reduceAccumulatedData: accumulatePolylineIds,
        transformToBoundingBox: makeIntersectionRealizationGridBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_OBSERVED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    {
        transformToVisualization: makeSeismicIntersectionMeshLayer,
        transformToAnnotations: makeColorScaleAnnotation,
        transformToBoundingBox: makeIntersectionRealizationSeismicBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_SIMULATED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    {
        transformToVisualization: makeSeismicIntersectionMeshLayer,
        transformToAnnotations: makeColorScaleAnnotation,
        transformToBoundingBox: makeIntersectionRealizationSeismicBoundingBox,
    },
);

export type LayersWrapperProps = {
    fieldId: string;
    layerManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    workbenchServices: WorkbenchServices;
};

export function DataProvidersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [changingFields, setChangingFields] = React.useState<boolean>(false);
    const [prevFieldId, setPrevFieldId] = React.useState<string | null>(null);
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, DataProviderManagerTopic.DATA_REVISION);

    const assemblerProduct = VISUALIZATION_ASSEMBLER.make(props.layerManager, {
        initialAccumulatedData: { polylineIds: [] },
    });

    const viewports: ViewportTypeExtended[] = [];
    const deckGlLayers: Layer<any>[] = [];
    const globalAnnotations = assemblerProduct.annotations;
    const globalColorScales = globalAnnotations.filter((el) => "colorScale" in el);
    const globalLayerIds: string[] = ["placeholder", "axes"];
    const usedPolylineIds = assemblerProduct.accumulatedData.polylineIds;

    for (const item of assemblerProduct.children) {
        if (item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW) {
            const colorScales = item.annotations.filter((el) => "colorScale" in el);
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
                color: item.color,
                isSync: true,
                show3D: true,
                layerIds,
                colorScales,
            });
        } else if (item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
            deckGlLayers.push(item.visualization);
            globalLayerIds.push(item.visualization.id);
        }
    }

    const views: ViewsTypeExtended = {
        layout: [0, 0],
        showLabel: false,
        viewports: viewports.map((viewport) => ({
            ...viewport,
            layerIds: [...globalLayerIds, ...viewport.layerIds!],
            colorScales: [...globalColorScales, ...viewport.colorScales!],
        })),
    };

    const numViews = assemblerProduct.children.filter(
        (item) => item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW,
    ).length;

    if (numViews) {
        const numCols = Math.ceil(Math.sqrt(numViews));
        const numRows = Math.ceil(numViews / numCols);
        views.layout = [numCols, numRows];
    }

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        views.layout = [views.layout[1], views.layout[0]];
    }

    statusWriter.setLoading(assemblerProduct.numLoadingDataProviders > 0);

    for (const message of assemblerProduct.aggregatedErrorMessages) {
        statusWriter.addError(message);
    }

    let bounds: BoundingBox3D | undefined = undefined;
    if (assemblerProduct.combinedBoundingBox) {
        bounds = [
            assemblerProduct.combinedBoundingBox.min.x,
            assemblerProduct.combinedBoundingBox.min.y,
            assemblerProduct.combinedBoundingBox.min.z,
            assemblerProduct.combinedBoundingBox.max.x,
            assemblerProduct.combinedBoundingBox.max.y,
            assemblerProduct.combinedBoundingBox.max.z,
        ];
    }

    deckGlLayers.push(
        new PlaceholderLayer({ id: "placeholder" }),
        new AxesLayer({ id: "axes", bounds, ZIncreasingDownwards: true }),
    );

    deckGlLayers.reverse();

    // We are using this pattern (emptying the layers list + setting a new key for the InteractionWrapper)
    // as a workaround due to subsurface-viewer's bounding box model not respecting the removal of layers.
    // In case of a field change, the total accumulated bounding box would become very large and homing wouldn't work properly.
    //
    // This is a temporary solution until the subsurface-viewer is updated to handle
    // bounding boxes more correctly.
    //
    // See: https://github.com/equinor/webviz-subsurface-components/pull/2573
    if (prevFieldId !== props.fieldId) {
        setChangingFields(true);
        setPrevFieldId(props.fieldId);
    }

    const finalLayers: Layer<any>[] = [];
    if (changingFields && assemblerProduct.numLoadingDataProviders === 0) {
        setChangingFields(false);
    }

    if (!changingFields) {
        finalLayers.push(...deckGlLayers);
    }

    // -----------------------------------------------------------------------------

    return (
        <InteractionWrapper
            key={`interaction-wrapper-${props.fieldId}`}
            views={views}
            fieldId={props.fieldId}
            layers={finalLayers}
            workbenchSession={props.workbenchSession}
            workbenchSettings={props.workbenchSettings}
            workbenchServices={props.workbenchServices}
            usedPolylineIds={usedPolylineIds}
            assemblerProduct={assemblerProduct}
        />
    );
}
