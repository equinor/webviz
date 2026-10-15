import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import { LabelOrientation } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";

import type { WellboreTrajectory_api } from "@api";
import { DEFAULT_WELLS_LAYER_PROPS_BY_VIEW_MODE, PLANNED_WELL_COLOR } from "@modules/_shared/constants/wellsLayer";
import { WebvizWellsLayer } from "@modules/_shared/customDeckGlLayers/WebvizWellsLayer";
import {
    trajectoryDistanceRadial,
    trajectoryDistanceXY,
    wellTrajectoryToGeojson,
} from "@modules/_shared/utils/wellbore";

import type { TransformerArgs } from "../VisualizationAssembler";

import { createSimplifiedTrajectory } from "./drilledWellTrajectoriesUtils";

export type PlannedWellTrajectoriesTransArgs = TransformerArgs<any, WellboreTrajectory_api[], any>;

export type PlannedWellTrajectoriesLayerOptions = {
    viewMode: "2D" | "3D";
};

export function makePlannedWellTrajectoriesLayer(
    args: PlannedWellTrajectoriesTransArgs,
    options: PlannedWellTrajectoriesLayerOptions,
): WellsLayer | null {
    const { id, name, getData } = args;

    const plannedWellboreTrajectoriesData = getData();

    if (!plannedWellboreTrajectoriesData) {
        return null;
    }

    // 2D simplifies on XY distance only; 3D must use full 3D distance so near-vertical sections keep their shape.
    const computeDistance = options.viewMode === "2D" ? trajectoryDistanceXY : trajectoryDistanceRadial;

    const wellLayerDataFeatures = plannedWellboreTrajectoriesData.map((well) => {
        const simplifiedWell = createSimplifiedTrajectory(well, computeDistance);
        const feature = wellTrajectoryToGeojson(simplifiedWell);
        feature.properties.color = PLANNED_WELL_COLOR;
        // Suffix the name so the hover readout/label makes clear this is a planned (not drilled) well.
        feature.properties.name = `${feature.properties.name} (planned)`;
        return feature;
    });

    const wellLabel = { ...DEFAULT_WELLS_LAYER_PROPS_BY_VIEW_MODE[options.viewMode].wellLabel };
    if (options.viewMode === "2D" && wellLayerDataFeatures.length < 200) {
        wellLabel.orientation = LabelOrientation.TANGENT;
    }

    const wellsLayer = new WebvizWellsLayer({
        ...DEFAULT_WELLS_LAYER_PROPS_BY_VIEW_MODE[options.viewMode],
        id,
        name,
        data: {
            type: "FeatureCollection",
            features: wellLayerDataFeatures,
        },
    });

    return wellsLayer;
}
