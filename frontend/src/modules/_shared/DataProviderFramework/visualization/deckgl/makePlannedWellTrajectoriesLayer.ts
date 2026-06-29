import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { WellboreTrajectory_api } from "@api";
import { DEFAULT_WELLS_LAYER_PROPS } from "@modules/_shared/constants/wellsLayer";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import { wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

import type { TransformerArgs } from "../VisualizationAssembler";

// Distinct color for planned wells so they are easy to tell apart from the (gray) official/drilled
// trajectories and the (red) hovered well.
const PLANNED_WELL_COLOR: [number, number, number] = [150, 60, 210];

export function makePlannedWellTrajectoriesLayer({
    id,
    name,
    getData,
}: TransformerArgs<any, WellboreTrajectory_api[], any>): WellsLayer | null {
    const plannedWellboreTrajectoriesData = getData();

    if (!plannedWellboreTrajectoriesData) {
        return null;
    }

    const wellLayerDataFeatures = plannedWellboreTrajectoriesData.map((well) => {
        const feature = wellTrajectoryToGeojson(well);
        feature.properties.color = PLANNED_WELL_COLOR;
        // Suffix the name so the hover readout/label makes clear this is a planned (not drilled) well.
        feature.properties.name = `${feature.properties.name} (planned)`;
        return feature;
    });

    const wellsLayer = new AdjustedWellsLayer({
        ...DEFAULT_WELLS_LAYER_PROPS,
        id,
        name,
        data: {
            type: "FeatureCollection",
            features: wellLayerDataFeatures,
        },
    });

    return wellsLayer;
}
