import type { WellboreTrajectory_api } from "@api";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";
import type { Feature } from "geojson";

export function makeDrilledWellTrajectoriesLayer(
    args: TransformerArgs<any, WellboreTrajectory_api[], any>,
): AdjustedWellsLayer | null {
    const { id, getData, name } = args;

    const fieldWellboreTrajectoriesData = getData();

    if (!fieldWellboreTrajectoriesData) {
        return null;
    }

    const tempWorkingWellsData = fieldWellboreTrajectoriesData.filter(
        (el) => el.uniqueWellboreIdentifier !== "NO 34/4-K-3 AH",
    );

    const wellLayerDataFeatures = tempWorkingWellsData.map((well) => wellTrajectoryToGeojson(well));

    function getLineStyleWidth(object: Feature): number {
        if (object.properties && "lineWidth" in object.properties) {
            return object.properties.lineWidth as number;
        }
        return 2;
    }

    function getWellHeadStyleWidth(object: Feature): number {
        if (object.properties && "wellHeadSize" in object.properties) {
            return object.properties.wellHeadSize as number;
        }
        return 1;
    }

    function getColor(object: Feature): [number, number, number, number] {
        if (object.properties && "color" in object.properties) {
            return object.properties.color as [number, number, number, number];
        }
        return [50, 50, 50, 100];
    }

    const boundingBox = makeDrilledWellTrajectoriesBoundingBox(args);

    if (!boundingBox) {
        return null;
    }

    const wellsLayer = new AdjustedWellsLayer({
        id,
        data: {
            type: "FeatureCollection",
            features: wellLayerDataFeatures,
        },
        name,
        refine: false,
        lineStyle: { width: getLineStyleWidth, color: getColor },
        wellHeadStyle: { size: getWellHeadStyleWidth, color: getColor },
        pickable: true,
        wellNameVisible: true,
        ZIncreasingDownwards: true,
    });

    return wellsLayer;
}
