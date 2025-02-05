import { SeismicCrosslineData_trans } from "@modules/3DViewerNew/settings/queries/queryDataTransforms";
import { VisualizationFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/LayerFramework/visualization/utils/colors";
import { SeismicFenceMeshLayer } from "@modules/_shared/customDeckGlLayers/SeismicFenceMeshLayer";

function generatePointFenceMesh(
    startPoint: number[],
    endPoint: number[],
    numSamplesXY: number,
    minDepth: number,
    maxDepth: number,
    numDepthSamples: number,
    propertyArray: Float32Array
): {
    vertices: Float32Array;
    indices: Uint16Array;
    properties: Float32Array;
    minPropValue: number;
    maxPropValue: number;
} {
    const vertices = new Float32Array(numSamplesXY * numDepthSamples * 3);
    const properties = new Float32Array(numSamplesXY * numDepthSamples);

    // Number of triangles to be drawn
    const numTriangles = (numSamplesXY - 1) * (numDepthSamples - 1) * 2;

    // Triangle strip indices
    const indices = new Uint16Array(numTriangles * 3);

    const stepX = (endPoint[0] - startPoint[0]) / (numSamplesXY - 1);
    const stepY = (endPoint[1] - startPoint[1]) / (numSamplesXY - 1);
    const stepZ = (maxDepth - minDepth) / (numDepthSamples - 1);

    let verticesIndex = 0;
    let indicesIndex = 0;
    let propertiesIndex = 0;
    let minPropValue = Infinity;
    let maxPropValue = -Infinity;

    for (let i = 0; i < numDepthSamples; i++) {
        /*
        if (i > 1) {
            // Draw a degenerated triangle to move to the next row
            indices[indicesIndex++] = (i - 1) * numSamplesXY + numSamplesXY - 1;
            indices[indicesIndex++] = i * numSamplesXY;
        }
            */
        for (let j = 0; j < numSamplesXY; j++) {
            vertices[verticesIndex++] = startPoint[0] + j * stepX;
            vertices[verticesIndex++] = startPoint[1] + j * stepY;
            vertices[verticesIndex++] = -(minDepth + i * stepZ);

            const propValue = propertyArray[j * numDepthSamples + i];
            properties[propertiesIndex++] = propValue;
            minPropValue = Math.min(minPropValue, propValue);
            maxPropValue = Math.max(maxPropValue, propValue);

            /*
            if (i > 0) {
                indices[indicesIndex++] = (i - 1) * numSamplesXY + j;
                indices[indicesIndex++] = i * numSamplesXY + j;
            }
                */

            if (i > 0 && j > 0) {
                // Three indices for the triangle
                indices[indicesIndex++] = (i - 1) * numSamplesXY + j;
                indices[indicesIndex++] = i * numSamplesXY + j;
                indices[indicesIndex++] = (i - 1) * numSamplesXY + j + 1;

                // Three indices for the triangle
                indices[indicesIndex++] = i * numSamplesXY + j;
                indices[indicesIndex++] = i * numSamplesXY + j + 1;
                indices[indicesIndex++] = (i - 1) * numSamplesXY + j + 1;
            }
        }
    }

    return { vertices, indices, properties, minPropValue, maxPropValue };
}

export function makeRealizationSeismicCrosslineLayer({
    id,
    data,
    colorScale,
}: VisualizationFunctionArgs<any, SeismicCrosslineData_trans>): SeismicFenceMeshLayer {
    const startPoint = [data.start_utm_x, data.start_utm_y];
    const endPoint = [data.end_utm_x, data.end_utm_y];
    const numSamples = data.inline_no_samples;
    const minDepth = data.z_min;
    const maxDepth = data.z_max;
    const numDepthSamples = data.z_samples;
    const propertyArray = data.dataFloat32Arr;

    const { vertices, indices, properties, minPropValue, maxPropValue } = generatePointFenceMesh(
        startPoint,
        endPoint,
        numSamples,
        minDepth,
        maxDepth,
        numDepthSamples,
        propertyArray
    );

    return new SeismicFenceMeshLayer({
        id,
        data: {
            vertices,
            indices,
            properties,
        },
        propertyRange: [minPropValue, maxPropValue],
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScale, minPropValue, maxPropValue, false),
    });
}
