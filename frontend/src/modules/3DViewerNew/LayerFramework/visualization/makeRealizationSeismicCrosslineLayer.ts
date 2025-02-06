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
    numDepthSamples: number
): {
    vertices: Float32Array;
    indices: Uint32Array;
} {
    const vertices = new Float32Array(numSamplesXY * numDepthSamples * 3);

    // Number of triangles to be drawn
    const numTriangles = (numSamplesXY - 1) * (numDepthSamples - 1) * 2;

    // Triangle strip indices
    const indices = new Uint32Array(numTriangles * 3);

    const stepX = (endPoint[0] - startPoint[0]) / (numSamplesXY - 1);
    const stepY = (endPoint[1] - startPoint[1]) / (numSamplesXY - 1);
    const stepZ = (maxDepth - minDepth) / (numDepthSamples - 1);

    let verticesIndex = 0;
    let indicesIndex = 0;

    for (let col = 0; col < numSamplesXY; col++) {
        /*
        if (i > 1) {
            // Draw a degenerated triangle to move to the next row
            indices[indicesIndex++] = (i - 1) * numSamplesXY + numSamplesXY - 1;
            indices[indicesIndex++] = i * numSamplesXY;
        }
            */
        for (let row = 0; row < numDepthSamples; row++) {
            vertices[verticesIndex++] = col * stepX;
            vertices[verticesIndex++] = col * stepY;
            vertices[verticesIndex++] = -(row * stepZ);

            if (row > 0 && col > 0) {
                indices[indicesIndex++] = (col - 1) * numDepthSamples + row - 1;
                indices[indicesIndex++] = (col - 1) * numDepthSamples + row;
                indices[indicesIndex++] = col * numDepthSamples + row - 1;

                indices[indicesIndex++] = col * numDepthSamples + row - 1;
                indices[indicesIndex++] = (col - 1) * numDepthSamples + row;
                indices[indicesIndex++] = col * numDepthSamples + row;
            }
        }
    }

    return { vertices, indices };
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
    const properties = data.dataFloat32Arr;

    const { vertices, indices } = generatePointFenceMesh(
        startPoint,
        endPoint,
        numSamples,
        minDepth,
        maxDepth,
        numDepthSamples
    );

    return new SeismicFenceMeshLayer({
        id,
        data: {
            vertices,
            indices,
            properties,
        },
        startPosition: [startPoint[0], startPoint[1], -minDepth],
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScale, data.value_min, data.value_max, false),
    });
}
