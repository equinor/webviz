import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { WellboreTrajectory_api } from "@api";
import { DEFAULT_WELLS_LAYER_PROPS } from "@modules/_shared/constants/wellsLayer";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import { wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

import type { TransformerArgs } from "../VisualizationAssembler";

export function makeDrilledWellTrajectoriesLayer({
    id,
    getData,
}: TransformerArgs<any, WellboreTrajectory_api[], any>): WellsLayer | null {
    const fieldWellboreTrajectoriesData = getData();

    if (!fieldWellboreTrajectoriesData) {
        return null;
    }

    // Filter out some wellbores that are known to be not working - this is a temporary solution
    const tempWorkingWellsData = fieldWellboreTrajectoriesData.filter(
        (el) => el.uniqueWellboreIdentifier !== "NO 34/4-K-3 AH",
    );

    const wellLayerDataFeatures = tempWorkingWellsData.map((well) => wellTrajectoryToGeojson(well));

    const wellsLayer = new AdjustedWellsLayer({
        ...DEFAULT_WELLS_LAYER_PROPS,
        id: id,
        data: {
            type: "FeatureCollection",
            features: wellLayerDataFeatures,
        },
    });

    return wellsLayer;
}
