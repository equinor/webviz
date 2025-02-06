import { CompositeLayer, PickingInfo } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Geometry } from "@luma.gl/engine";

export enum DragDirection {
    X = "X",
    Y = "Y",
    Z = "Z",
    XY = "XY",
    XZ = "XZ",
    YZ = "YZ",
    XYZ = "XYZ",
}

export type DragHandleLayerProps = {
    dragDirection: DragDirection;
    position: [number, number, number];
};

function makeArrowMesh(): Geometry {
    const numCircleVertices = 20;
    const vertices = new Float32Array((numCircleVertices + 1) * 4 * 3); // 4x circle with midpoint
    const indices = new Uint32Array(numCircleVertices * 3 * 3 + numCircleVertices * 2 * 3);
    let triangleIndex = 0;
    let vertexIndex = 0;
    const coneRadius = 2;
    const shaftRadius = 1;
    const coneHeight = 3;
    const shaftHeight = 3;

    // The tip of the cone
    vertices[vertexIndex++] = 0;
    vertices[vertexIndex++] = 0;
    vertices[vertexIndex++] = coneHeight + shaftHeight;

    // Cone
    for (let i = 0; i < numCircleVertices; i++) {
        const angle = (i / numCircleVertices) * Math.PI * 2;
        vertices[vertexIndex++] = Math.cos(angle) * coneRadius;
        vertices[vertexIndex++] = Math.sin(angle) * coneRadius;
        vertices[vertexIndex++] = shaftHeight;

        indices[triangleIndex++] = 0;
        indices[triangleIndex++] = i + 1;
        indices[triangleIndex++] = i === numCircleVertices - 1 ? 1 : i + 2;
    }

    // The base of the cone
    const baseStartIndex = vertexIndex / 3;

    vertices[vertexIndex++] = 0;
    vertices[vertexIndex++] = 0;
    vertices[vertexIndex++] = shaftHeight;

    for (let i = 0; i < numCircleVertices; i++) {
        const angle = (i / numCircleVertices) * Math.PI * 2;
        vertices[vertexIndex++] = Math.cos(angle) * coneRadius;
        vertices[vertexIndex++] = Math.sin(angle) * coneRadius;
        vertices[vertexIndex++] = shaftHeight;

        indices[triangleIndex++] = baseStartIndex;
        indices[triangleIndex++] = baseStartIndex + i + 1;
        indices[triangleIndex++] = i === numCircleVertices - 1 ? baseStartIndex + 1 : baseStartIndex + i + 2;
    }

    // The shaft top of the arrow
    const shaftTopStartIndex = vertexIndex / 3;

    vertices[vertexIndex++] = 0;
    vertices[vertexIndex++] = 0;
    vertices[vertexIndex++] = shaftHeight;

    for (let i = 0; i < numCircleVertices; i++) {
        const angle = (i / numCircleVertices) * Math.PI * 2;
        vertices[vertexIndex++] = Math.cos(angle) * shaftRadius;
        vertices[vertexIndex++] = Math.sin(angle) * shaftRadius;
        vertices[vertexIndex++] = shaftHeight;
    }

    // The shaft bottom of the arrow
    const shaftBottomStartIndex = vertexIndex / 3;

    vertices[vertexIndex++] = 0;
    vertices[vertexIndex++] = 0;
    vertices[vertexIndex++] = 0;

    for (let i = 0; i < numCircleVertices; i++) {
        const angle = (i / numCircleVertices) * Math.PI * 2;
        vertices[vertexIndex++] = Math.cos(angle) * shaftRadius;
        vertices[vertexIndex++] = Math.sin(angle) * shaftRadius;
        vertices[vertexIndex++] = 0;

        indices[triangleIndex++] = shaftBottomStartIndex;
        indices[triangleIndex++] = shaftBottomStartIndex + i + 1;
        indices[triangleIndex++] =
            i === numCircleVertices - 1 ? shaftBottomStartIndex + 1 : shaftBottomStartIndex + i + 2;
    }

    // The sides of the shaft
    for (let i = 0; i < numCircleVertices; i++) {
        indices[triangleIndex++] = shaftTopStartIndex + i + 1;
        indices[triangleIndex++] =
            i === numCircleVertices - 1 ? shaftBottomStartIndex + 1 : shaftBottomStartIndex + i + 2;
        indices[triangleIndex++] = shaftBottomStartIndex + 1 + i;

        indices[triangleIndex++] = shaftTopStartIndex + i + 1;
        indices[triangleIndex++] = i === numCircleVertices - 1 ? shaftTopStartIndex + 1 : shaftTopStartIndex + i + 2;
        indices[triangleIndex++] =
            i === numCircleVertices - 1 ? shaftBottomStartIndex + 1 : shaftBottomStartIndex + i + 2;
    }

    return new Geometry({
        attributes: {
            positions: vertices,
        },
        topology: "triangle-list",
        indices: indices,
    });
}

export class DragHandleLayer extends CompositeLayer<DragHandleLayerProps> {
    static layerName: string = "DragHandleLayer";

    // @ts-expect-error - expected
    state!: {
        hoveredIndex: number;
    };

    initializeState(): void {
        this.state = {
            hoveredIndex: -1,
        };
    }

    onHover(info: PickingInfo): boolean {
        this.setState({
            hoveredIndex: info.index,
        });

        return true;
    }

    renderLayers() {
        const { position, dragDirection } = this.props;
        const { hoveredIndex } = this.state;

        const data: { position: number[]; orientation: number[] }[] = [];

        if (dragDirection === DragDirection.X) {
            data.push({ position: [position[0] + 10, position[1], position[2]], orientation: [90, 0, 0] });
            data.push({ position: [position[0] - 10, position[1], position[2]], orientation: [-90, 0, 0] });
        } else if (dragDirection === DragDirection.Y) {
            data.push({ position: [position[0], position[1] + 10, position[2]], orientation: [90, 90, 0] });
            data.push({ position: [position[0], position[1] - 10, position[2]], orientation: [90, -90, 0] });
        } else if (dragDirection === DragDirection.Z) {
            data.push({ position: [position[0], position[1], position[2] + 10], orientation: [0, 0, 0] });
            data.push({ position: [position[0], position[1], position[2] - 10], orientation: [180, 0, 0] });
        } else if (dragDirection === DragDirection.XY) {
            data.push({ position: [position[0] + 10, position[1], position[2]], orientation: [90, 0, 0] });
            data.push({ position: [position[0] - 10, position[1], position[2]], orientation: [-90, 0, 0] });
            data.push({ position: [position[0], position[1] + 10, position[2]], orientation: [0, 90, 0] });
            data.push({ position: [position[0], position[1] - 10, position[2]], orientation: [0, -90, 0] });
        } else if (dragDirection === DragDirection.XZ) {
            data.push({ position: [position[0] + 10, position[1], position[2]], orientation: [90, 0, 0] });
            data.push({ position: [position[0] - 10, position[1], position[2]], orientation: [-90, 0, 0] });
            data.push({ position: [position[0], position[1], position[2] + 10], orientation: [0, 0, 0] });
            data.push({ position: [position[0], position[1], position[2] - 10], orientation: [180, 0, 0] });
        } else if (dragDirection === DragDirection.YZ) {
            data.push({ position: [position[0], position[1] + 10, position[2]], orientation: [0, 90, 0] });
            data.push({ position: [position[0], position[1] - 10, position[2]], orientation: [0, -90, 0] });
            data.push({ position: [position[0], position[1], position[2] + 10], orientation: [0, 0, 0] });
            data.push({ position: [position[0], position[1], position[2] - 10], orientation: [180, 0, 0] });
        } else if (dragDirection === DragDirection.XYZ) {
            data.push({ position: [position[0] + 10, position[1], position[2]], orientation: [90, 0, 0] });
            data.push({ position: [position[0] - 10, position[1], position[2]], orientation: [-90, 0, 0] });
            data.push({ position: [position[0], position[1] + 10, position[2]], orientation: [90, 90, 0] });
            data.push({ position: [position[0], position[1] - 10, position[2]], orientation: [90, -90, 0] });
            data.push({ position: [position[0], position[1], position[2] + 10], orientation: [0, 0, 0] });
            data.push({ position: [position[0], position[1], position[2] - 10], orientation: [180, 0, 0] });
        }

        const layers = [
            new SimpleMeshLayer({
                id: "drag-handle-cone",
                data,
                mesh: makeArrowMesh(),
                getPosition: (d) => d.position,
                getColor: (d, ctx) => (ctx.index === hoveredIndex ? [255, 255, 255] : [0, 0, 255]),
                getOrientation: (d) => d.orientation,
                getScale: [10, 10, 10],
                pickable: true,
                updateTriggers: {
                    getColor: [hoveredIndex],
                },
            }),
        ];

        return layers;
    }
}
