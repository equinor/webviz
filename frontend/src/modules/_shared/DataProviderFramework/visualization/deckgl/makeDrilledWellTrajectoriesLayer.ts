import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import { LabelOrientation } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type {
    WellFeature as BaseWellFeature,
    GeoJsonWellProperties as BaseWellProperties,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";
import type { Feature } from "geojson";

import type { WellboreTrajectory_api } from "@api";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import { wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

import type { TransformerArgs } from "../VisualizationAssembler";

export type GeoWellProperties = BaseWellProperties & {
    uuid: string;
    uwi: string;
    lineWidth: number;
    wellHeadSize: number;
};
export type GeoWellFeature = BaseWellFeature & { properties: GeoWellProperties };

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

    const wellsLayer = new AdjustedWellsLayer({
        id: id,
        data: {
            type: "FeatureCollection",
            features: wellLayerDataFeatures,
        },
        refine: false,
        lineStyle: { width: getLineStyleWidth, color: getColor },
        wellHeadStyle: { size: getWellHeadStyleWidth, color: getColor },
        wellLabel: {
            getSize: 9,
            background: true,
            autoPosition: true,
            orientation: LabelOrientation.HORIZONTAL,
        },
        pickable: true,
        ZIncreasingDownwards: true,
        outline: false,
        lineWidthScale: 2,
    });

    return wellsLayer;
}
