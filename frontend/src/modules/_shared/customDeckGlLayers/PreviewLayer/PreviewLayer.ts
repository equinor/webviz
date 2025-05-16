import { CompositeLayer, type Layer, type LayersList } from "@deck.gl/core";

import { type Geometry, ShapeType } from "@lib/utils/geometry";
import * as vec3 from "@lib/utils/vec3";

import { BoxLayer } from "./_private/BoxLayer";

export type PreviewLayerProps = {
    id: string;
    data: {
        geometry: Geometry;
    };
    zIncreaseDownwards?: boolean;
};

export class PreviewLayer extends CompositeLayer<PreviewLayerProps> {
    static layerName = "PreviewLayer";

    renderLayers(): LayersList {
        const { data } = this.props;

        const layers: Layer<any>[] = [];

        const zFactor = this.props.zIncreaseDownwards ? -1 : 1;

        for (const [idx, shape] of data.geometry.shapes.entries()) {
            if (shape.type === ShapeType.BOX) {
                layers.push(
                    new BoxLayer({
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
                                    vec3.multiplyElementWise(shape.normalizedEdgeVectors.u, vec3.create(1, 1, zFactor)),
                                ),
                                vec3.toArray(
                                    vec3.multiplyElementWise(shape.normalizedEdgeVectors.v, vec3.create(1, 1, zFactor)),
                                ),
                            ],
                        },
                    }),
                );
            }
        }

        return layers;
    }
}
