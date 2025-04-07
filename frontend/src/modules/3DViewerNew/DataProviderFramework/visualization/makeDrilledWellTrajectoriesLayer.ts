import type { WellboreTrajectory_api } from "@api";
import * as bbox from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { WellsLayer, WellsLayerData } from "@modules/_shared/customDeckGlLayers/WellsLayer/WellsLayer";

export function makeDrilledWellTrajectoriesLayer(
    args: TransformerArgs<any, WellboreTrajectory_api[], any>,
): WellsLayer | null {
    const { id, getData, name } = args;

    const fieldWellboreTrajectoriesData = getData();

    if (!fieldWellboreTrajectoriesData) {
        return null;
    }

    const wellsLayerData: WellsLayerData = [];
    for (const wellboreData of fieldWellboreTrajectoriesData) {
        const properties = {
            uuid: wellboreData.wellboreUuid,
            name: wellboreData.uniqueWellboreIdentifier,
            mdArray: wellboreData.mdArr,
        };
        const coordinates: [number, number, number][] = wellboreData.eastingArr.map((easting, index) => {
            return [easting, wellboreData.northingArr[index], -wellboreData.tvdMslArr[index]];
        });
        wellsLayerData.push({ properties, coordinates });
    }

    const boundingBox = makeDrilledWellTrajectoriesBoundingBox(args);

    if (!boundingBox) {
        return null;
    }

    const wellsLayer = new WellsLayer({
        id: id,
        name,
        data: wellsLayerData,
        zIncreaseDownwards: true,
        boundingBox: bbox.toNumArray(boundingBox),
    });

    return wellsLayer;
}
