import { Layer } from "@deck.gl/core";
import { SeismicSliceData_trans } from "@modules/3DViewerNew/settings/queries/queryDataTransforms";
import { VisualizationFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/LayerFramework/visualization/utils/colors";
import { MovableLayerWrapper } from "@modules/_shared/customDeckGlLayers/MovableLayerWrapper";
import { SeismicFenceMeshLayer } from "@modules/_shared/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";

/*
 * Generate a mesh for a seismic fence plot
 * @param numSamplesU The number of samples in the U direction, which is the first axis and often in depth direction
 * @param numSamplesV The number of samples in the V direction, which is the second axis and often in inline/crossline direction
 * @param transformUVToXYZ A function that takes the U and V coordinates (∈ [0,1]) and returns the X, Y, and Z coordinates
 *
 * @returns The vertices and indices of the mesh
 */
function generatePointFenceMesh(
    numSamplesU: number,
    numSamplesV: number,
    transformUVToXYZ: (u: number, v: number) => [number, number, number]
): {
    vertices: Float32Array;
    indices: Uint32Array;
} {
    const vertices = new Float32Array(numSamplesU * numSamplesV * 3);

    // Number of triangles to be drawn
    const numTriangles = (numSamplesU - 1) * (numSamplesV - 1) * 2;

    // Triangle strip indices
    const indices = new Uint32Array(numTriangles * 3);

    const stepU = 1.0 / (numSamplesU - 1);
    const stepV = 1.0 / (numSamplesV - 1);

    let verticesIndex = 0;
    let indicesIndex = 0;

    for (let v = 0; v < numSamplesV; v++) {
        for (let u = 0; u < numSamplesU; u++) {
            const [x, y, z] = transformUVToXYZ(u * stepU, v * stepV);
            vertices[verticesIndex++] = x;
            vertices[verticesIndex++] = y;
            vertices[verticesIndex++] = z;

            if (u > 0 && v > 0) {
                indices[indicesIndex++] = (v - 1) * numSamplesU + u - 1;
                indices[indicesIndex++] = (v - 1) * numSamplesU + u;
                indices[indicesIndex++] = v * numSamplesU + u - 1;

                indices[indicesIndex++] = v * numSamplesU + u - 1;
                indices[indicesIndex++] = (v - 1) * numSamplesU + u;
                indices[indicesIndex++] = v * numSamplesU + u;
            }
        }
    }

    return { vertices, indices };
}

export enum Plane {
    CROSSLINE = "CROSSLINE",
    INLINE = "INLINE",
    DEPTH = "DEPTH",
}

export function makeSeismicFenceMeshLayerFunction(plane: Plane) {
    return function makeSeismicFenceMeshLayer({
        id,
        name,
        data,
        colorScale,
        settings,
        isLoading,
        predictedNextBoundingBox,
    }: VisualizationFunctionArgs<any, SeismicSliceData_trans>): Layer<any> {
        let bbox = data.bbox_utm;
        let adjustedData = data;
        if (isLoading && predictedNextBoundingBox) {
            bbox = [
                [predictedNextBoundingBox.x[0], predictedNextBoundingBox.y[0], predictedNextBoundingBox.z[0]],
                [predictedNextBoundingBox.x[1], predictedNextBoundingBox.y[1], predictedNextBoundingBox.z[1]],
            ];
            adjustedData = {
                ...data,
                u_num_samples: 2,
                v_num_samples: 2,
            };
        }
        const properties = data.dataFloat32Arr;

        let startPosition: [number, number, number] = [0, 0, 0];
        let boundingBox: number[][] = [];

        let transformUVToXYZ: (u: number, v: number) => [number, number, number] = () => {
            throw new Error("transformUVToXYZ not implemented");
        };

        if (plane === Plane.CROSSLINE || plane === Plane.INLINE) {
            startPosition = [bbox[0][0], bbox[0][1], -data.u_min];
            boundingBox = [
                startPosition,
                [bbox[1][0], bbox[1][1], -data.u_min],
                [bbox[1][0], bbox[1][1], -data.u_max],
                [bbox[0][0], bbox[0][1], -data.u_max],
            ];
            transformUVToXYZ = (u: number, v: number): [number, number, number] => {
                const x = v * (bbox[1][0] - bbox[0][0]);
                const y = v * (bbox[1][1] - bbox[0][1]);
                const z = -(u * (data.u_max - data.u_min));
                return [x, y, z];
            };
        } else if (plane === Plane.DEPTH) {
            startPosition = [bbox[0][0], bbox[0][1], -settings.seismicDepthSlice];
            boundingBox = [
                startPosition,
                [bbox[1][0], bbox[1][1], -settings.seismicDepthSlice],
                [bbox[2][0], bbox[2][1], -settings.seismicDepthSlice],
                [bbox[3][0], bbox[3][1], -settings.seismicDepthSlice],
            ];
            transformUVToXYZ = (u: number, v: number): [number, number, number] => {
                const x = u * (bbox[1][0] - bbox[0][0]) + v * (bbox[3][0] - bbox[0][0]); // Diagonal across bounding box
                const y = u * (bbox[1][1] - bbox[0][1]) + v * (bbox[3][1] - bbox[0][1]); // Diagonal across bounding box
                const z = 0;
                return [x, y, z];
            };
        }

        const { vertices, indices } = generatePointFenceMesh(
            adjustedData.u_num_samples,
            adjustedData.v_num_samples,
            transformUVToXYZ
        );

        return new MovableLayerWrapper({
            wrappedLayer: new SeismicFenceMeshLayer({
                id,
                name,
                data: {
                    vertices,
                    indices,
                    properties,
                },
                startPosition,
                colorMapFunction: makeColorMapFunctionFromColorScale(colorScale, data.value_min, data.value_max, false),
                boundingBox,
                zIncreaseDownwards: true,
                isLoading,
            }),
        });
    };
}
