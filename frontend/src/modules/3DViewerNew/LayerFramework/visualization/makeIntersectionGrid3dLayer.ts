import { VisualizationFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/LayerFramework/visualization/utils/colors";
import { FenceMeshSection_trans, PolylineIntersection_trans } from "@modules/_shared/utils/wellbore";
import { TGrid3DColoringMode } from "@webviz/subsurface-viewer";
import { Grid3DLayer } from "@webviz/subsurface-viewer/dist/layers";

import { IntersectionRealizationGridSettings } from "../customLayerImplementations/IntersectionRealizationGridLayer/types";

interface PolyDataVtk {
    points: Float32Array;
    polys: Uint32Array;
    props: Float32Array;
}

function buildVtkStylePolyDataFromFenceSections(fenceSections: FenceMeshSection_trans[]): PolyDataVtk {
    // Calculate sizes of typed arrays
    let totNumVertices = 0;
    let totNumPolygons = 0;
    let totNumConnectivities = 0;
    for (const section of fenceSections) {
        totNumVertices += section.verticesUzFloat32Arr.length / 2;
        totNumPolygons += section.verticesPerPolyUintArr.length;
        totNumConnectivities += section.polyIndicesUintArr.length;
    }

    const pointsFloat32Arr = new Float32Array(3 * totNumVertices);
    const polysUint32Arr = new Uint32Array(totNumPolygons + totNumConnectivities);
    const polyPropsFloat32Arr = new Float32Array(totNumPolygons);

    let floatPointsDstIdx = 0;
    let polysDstIdx = 0;
    let propsDstIdx = 0;
    for (const section of fenceSections) {
        // uv to xyz
        const directionX = section.end_utm_x - section.start_utm_x;
        const directionY = section.end_utm_y - section.start_utm_y;
        const magnitude = Math.sqrt(directionX ** 2 + directionY ** 2);
        const unitDirectionX = directionX / magnitude;
        const unitDirectionY = directionY / magnitude;

        const connOffset = floatPointsDstIdx / 3;

        for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
            const u = section.verticesUzFloat32Arr[i];
            const z = section.verticesUzFloat32Arr[i + 1];
            const x = u * unitDirectionX + section.start_utm_x;
            const y = u * unitDirectionY + section.start_utm_y;

            pointsFloat32Arr[floatPointsDstIdx++] = x;
            pointsFloat32Arr[floatPointsDstIdx++] = y;
            pointsFloat32Arr[floatPointsDstIdx++] = z;
        }

        // Fix poly indexes for each section
        const numPolysInSection = section.verticesPerPolyUintArr.length;
        let srcIdx = 0;
        for (let i = 0; i < numPolysInSection; i++) {
            const numVertsInPoly = section.verticesPerPolyUintArr[i];
            polysUint32Arr[polysDstIdx++] = numVertsInPoly;

            for (let j = 0; j < numVertsInPoly; j++) {
                polysUint32Arr[polysDstIdx++] = section.polyIndicesUintArr[srcIdx++] + connOffset;
            }
        }

        polyPropsFloat32Arr.set(section.polyPropsFloat32Arr, propsDstIdx);
        propsDstIdx += numPolysInSection;
    }

    return {
        points: pointsFloat32Arr,
        polys: polysUint32Arr,
        props: polyPropsFloat32Arr,
    };
}

export function makeIntersectionLayer({
    id,
    data,
    colorScale,
    settings,
}: VisualizationFunctionArgs<IntersectionRealizationGridSettings, PolylineIntersection_trans>): Grid3DLayer {
    const polyData = buildVtkStylePolyDataFromFenceSections(data.fenceMeshSections);

    const grid3dIntersectionLayer = new Grid3DLayer({
        id,
        pointsData: polyData.points,
        polysData: polyData.polys,
        propertiesData: polyData.props,
        colorMapName: "Continuous",
        colorMapRange: [data.min_grid_prop_value, data.max_grid_prop_value],
        colorMapClampColor: true,
        coloringMode: TGrid3DColoringMode.Property,
        colorMapFunction: makeColorMapFunctionFromColorScale(
            colorScale,
            data.min_grid_prop_value,
            data.max_grid_prop_value
        ),
        ZIncreasingDownwards: false,
        gridLines: settings.showGridLines,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: false,
    });
    return grid3dIntersectionLayer;
}
