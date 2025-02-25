import { Layer, LayerContext, Material, UpdateParameters, picking, project32 } from "@deck.gl/core";
import { Vec3 } from "@lib/utils/vec3";
import * as vec3 from "@lib/utils/vec3";
import { Geometry, Model } from "@luma.gl/engine";
import { phongLighting } from "@luma.gl/shadertools";

import { Pipe } from "./Pipe";
import fragmentShader from "./shaders/fragmentShader.glsl?raw";
import vertexShader from "./shaders/vertexShader.glsl?raw";

export type PipeLayerProps = {
    id: string;
    data: Vec3[][];
    material?: Material;
};

export class PipeLayer extends Layer<PipeLayerProps> {
    static layerName: string = "PipeLayer";

    // @ts-ignore - This is how deck.gl expects the state to be defined
    state!: {
        models: Model[];
    };

    initializeState(context: LayerContext): void {
        this.state = {
            models: this.makeModels(context),
        };
    }

    draw(): void {
        const { models } = this.state;
        for (const model of models) {
            model.draw(this.context.renderPass);
        }
    }

    updateState(params: UpdateParameters<Layer<PipeLayerProps>>): void {
        if (params.changeFlags.dataChanged) {
            this.setState({
                models: this.makeModels(params.context),
            });
        }
    }

    makeModels(context: LayerContext): Model[] {
        const pipes = this.makePipes();
        const meshes = this.makeMeshes(pipes);

        const models: Model[] = [];
        for (const [idx, mesh] of meshes.entries()) {
            models.push(
                new Model(context.device, {
                    id: `${this.id}-mesh-${idx}`,
                    geometry: mesh,
                    modules: [project32, phongLighting, picking],
                    vs: vertexShader,
                    fs: fragmentShader,
                })
            );
        }

        return models;
    }

    private makePipes(): Pipe[] {
        const { data } = this.props;
        const circle = this.makeCircle(10, 16);

        const pipes: Pipe[] = [];
        for (const points of data) {
            pipes.push(new Pipe(points, circle));
        }

        return pipes;
    }

    private makeCircle(radius: number, segments: number): Vec3[] {
        const points: Vec3[] = [];
        if (segments < 2) {
            return points;
        }

        const pi2 = Math.PI * 2;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * pi2;
            points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0 });
        }

        return points;
    }

    private makeMeshes(pipes: Pipe[]): Geometry[] {
        const geometries: Geometry[] = [];
        for (const pipe of pipes) {
            const numContours = pipe.getContourCount();
            const numVerticesPerContour = pipe.getContours()[0].length;

            const vertices = new Float32Array((numContours + 2) * numVerticesPerContour * 3 + 2 * 3);
            const indices = new Uint32Array(
                (numContours - 1) * numVerticesPerContour * 6 + numVerticesPerContour * 2 * 3
            );
            const normals = new Float32Array((numContours + 2) * numVerticesPerContour * 3 + 2 * 3);

            let verticesIndex: number = 0;
            let indicesIndex: number = 0;
            let normalsIndex: number = 0;

            const startVertex = pipe.getPath()[0];
            vertices[verticesIndex++] = startVertex.x;
            vertices[verticesIndex++] = startVertex.y;
            vertices[verticesIndex++] = startVertex.z;

            const normal = vec3.normalize(vec3.cross(pipe.getNormals()[0][1], pipe.getNormals()[0][0]));
            normals[normalsIndex++] = normal.x;
            normals[normalsIndex++] = normal.y;
            normals[normalsIndex++] = normal.z;

            for (let j = 0; j < numVerticesPerContour; j++) {
                const vertex = pipe.getContours()[0][j];
                vertices[verticesIndex++] = vertex.x;
                vertices[verticesIndex++] = vertex.y;
                vertices[verticesIndex++] = vertex.z;

                normals[normalsIndex++] = normal.x;
                normals[normalsIndex++] = normal.y;
                normals[normalsIndex++] = normal.z;

                indices[indicesIndex++] = 0;
                indices[indicesIndex++] = j + 1;
                indices[indicesIndex++] = j + 2 > numVerticesPerContour ? 1 : j + 2;
            }

            for (let i = 0; i < numContours; i++) {
                const contour = pipe.getContours()[i];
                for (let j = 0; j < numVerticesPerContour; j++) {
                    const vertex = contour[j];
                    vertices[verticesIndex++] = vertex.x;
                    vertices[verticesIndex++] = vertex.y;
                    vertices[verticesIndex++] = vertex.z;

                    const normal = pipe.getNormals()[i][j];
                    normals[normalsIndex++] = normal.x;
                    normals[normalsIndex++] = normal.y;
                    normals[normalsIndex++] = normal.z;

                    if (i > 0) {
                        const index = 1 + (i + 1) * numVerticesPerContour + j;
                        if (j === numVerticesPerContour - 1) {
                            indices[indicesIndex++] = index - numVerticesPerContour;
                            indices[indicesIndex++] = index;
                            indices[indicesIndex++] = index - 2 * numVerticesPerContour + 1;
                            indices[indicesIndex++] = index - 2 * numVerticesPerContour + 1;
                            indices[indicesIndex++] = index;
                            indices[indicesIndex++] = (i + 1) * numVerticesPerContour + 1;
                        } else {
                            indices[indicesIndex++] = index - numVerticesPerContour;
                            indices[indicesIndex++] = index;
                            indices[indicesIndex++] = index - numVerticesPerContour + 1;
                            indices[indicesIndex++] = index - numVerticesPerContour + 1;
                            indices[indicesIndex++] = index;
                            indices[indicesIndex++] = index + 1;
                        }
                    }
                }
            }

            const endNormal = vec3.normalize(
                vec3.cross(
                    pipe.getNormals()[pipe.getNormals().length - 1][0],
                    pipe.getNormals()[pipe.getNormals().length - 1][1]
                )
            );
            for (let j = 0; j < numVerticesPerContour; j++) {
                const vertex = pipe.getContours()[numContours - 1][j];
                vertices[verticesIndex++] = vertex.x;
                vertices[verticesIndex++] = vertex.y;
                vertices[verticesIndex++] = vertex.z;

                normals[normalsIndex++] = endNormal.x;
                normals[normalsIndex++] = endNormal.y;
                normals[normalsIndex++] = endNormal.z;
            }

            const endVertex = pipe.getPath()[pipe.getPath().length - 1];
            vertices[verticesIndex++] = endVertex.x;
            vertices[verticesIndex++] = endVertex.y;
            vertices[verticesIndex++] = endVertex.z;

            normals[normalsIndex++] = endNormal.x;
            normals[normalsIndex++] = endNormal.y;
            normals[normalsIndex++] = endNormal.z;

            for (let j = 0; j < numVerticesPerContour; j++) {
                const index = numContours * numVerticesPerContour + 1;
                indices[indicesIndex++] = verticesIndex / 3 - 1;
                indices[indicesIndex++] = index + j;
                indices[indicesIndex++] = j + 1 >= numVerticesPerContour ? index : index + j + 1;
            }

            geometries.push(
                new Geometry({
                    topology: "triangle-list",
                    attributes: {
                        positions: vertices,
                        normals: {
                            size: 3,
                            value: normals,
                        },
                    },
                    indices: indices,
                })
            );
        }

        return geometries;
    }
}
