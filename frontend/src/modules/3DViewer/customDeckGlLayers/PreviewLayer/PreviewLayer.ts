import { CompositeLayer, type Layer, type LayersList } from "@deck.gl/core";
import type { BoundingBox3D, ExtendedLayerProps } from "@webviz/subsurface-viewer";

import { type Geometry, ShapeType } from "@lib/utils/geometry";
import * as vec3 from "@lib/utils/vec3";

import { BoxLayer } from "./_private/BoxLayer";

export type PreviewLayerProps = ExtendedLayerProps & {
    data: {
        geometry: Geometry;
    };
    zIncreaseDownwards?: boolean;

    // Non-public property:
    reportBoundingBox?: React.Dispatch<{
        layerBoundingBox: BoundingBox3D;
    }>;
};

export class PreviewLayer extends CompositeLayer<PreviewLayerProps> {
    static layerName = "PreviewLayer";

    initializeState(): void {
        if (this.props.reportBoundingBox) {
            this.props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
    }

    updateState({ changeFlags, props }: { changeFlags: any; props: PreviewLayerProps }): void {
        if (props.reportBoundingBox && changeFlags.dataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
    }

    private calcBoundingBox(): BoundingBox3D {
        const { data, zIncreaseDownwards } = this.props;

        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
        let zmin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let zmax = Number.NEGATIVE_INFINITY;

        for (const shape of data.geometry.shapes) {
            if (shape.type === ShapeType.BOX) {
                const { centerPoint, dimensions } = shape;
                const halfDimensions = vec3.create(dimensions.width / 2, dimensions.height / 2, dimensions.depth / 2);

                const vecU = vec3.scale(shape.normalizedEdgeVectors.u, halfDimensions.x);
                const vecV = vec3.scale(shape.normalizedEdgeVectors.v, halfDimensions.y);
                const vecW = vec3.cross(vecU, vecV);
                const corners = [
                    vec3.add(centerPoint, vecU, vecV, vecW),
                    vec3.add(centerPoint, vecU, vecV, vec3.negate(vecW)),
                    vec3.add(centerPoint, vecU, vec3.negate(vecV), vecW),
                    vec3.add(centerPoint, vecU, vec3.negate(vecV), vec3.negate(vecW)),
                    vec3.add(centerPoint, vec3.negate(vecU), vecV, vecW),
                    vec3.add(centerPoint, vec3.negate(vecU), vecV, vec3.negate(vecW)),
                    vec3.add(centerPoint, vec3.negate(vecU), vec3.negate(vecV), vecW),
                    vec3.add(centerPoint, vec3.negate(vecU), vec3.negate(vecV), vec3.negate(vecW)),
                ];

                for (const corner of corners) {
                    xmin = Math.min(xmin, corner.x);
                    ymin = Math.min(ymin, corner.y);
                    zmin = Math.min(zmin, corner.z * (zIncreaseDownwards ? -1 : 1));
                    xmax = Math.max(xmax, corner.x);
                    ymax = Math.max(ymax, corner.y);
                    zmax = Math.max(zmax, corner.z * (zIncreaseDownwards ? -1 : 1));
                }
            }
        }

        return [xmin, ymin, zmin, xmax, ymax, zmax];
    }

    renderLayers(): LayersList {
        const { data } = this.props;

        const layers: Layer<any>[] = [];

        const zFactor = this.props.zIncreaseDownwards ? -1 : 1;

        for (const [idx, shape] of data.geometry.shapes.entries()) {
            if (shape.type === ShapeType.BOX) {
                layers.push(
                    new BoxLayer(
                        this.getSubLayerProps({
                            id: `${idx}`,
                            data: {
                                centerPoint: vec3.toArray(
                                    vec3.multiplyElementWise(shape.centerPoint, vec3.create(1, 1, zFactor)),
                                ),
                                dimensions: [
                                    shape.dimensions.width,
                                    shape.dimensions.height,
                                    shape.dimensions.depth * zFactor,
                                ],
                                normalizedEdgeVectors: [
                                    vec3.toArray(
                                        vec3.multiplyElementWise(
                                            shape.normalizedEdgeVectors.u,
                                            vec3.create(1, 1, zFactor),
                                        ),
                                    ),
                                    vec3.toArray(
                                        vec3.multiplyElementWise(
                                            shape.normalizedEdgeVectors.v,
                                            vec3.create(1, 1, zFactor),
                                        ),
                                    ),
                                ],
                            },
                        }),
                    ),
                );
            }
        }

        return layers;
    }
}
