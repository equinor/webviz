import { CompositeLayer, type Layer, type UpdateParameters } from "@deck.gl/core";
import type { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer/dist/layers/utils/layerTools";

import type { Geometry } from "@lib/utils/geometry";

import {
    SeismicFenceMeshLayer,
    type SeismicFence,
    type SeismicFenceMeshLayerProps,
} from "./SeismicFenceMeshLayer/SeismicFenceMeshLayer";

export type SeismicFenceWithId = {
    id: string;
    fence?: SeismicFence;
    loadingGeometry?: Geometry;
};

export type SeismicSlicesLayerProps = ExtendedLayerProps & {
    data: Array<SeismicFenceWithId>;
    colorMapFunction: SeismicFenceMeshLayerProps["colorMapFunction"];
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;

    // Non-public property:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
};

export class SeismicSlicesLayer extends CompositeLayer<SeismicSlicesLayerProps> {
    static layerName = "SeismicSlicesLayer";

    updateState({ changeFlags, props }: UpdateParameters<this>): void {
        if (props.reportBoundingBox && changeFlags.propsOrDataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
    }

    renderLayers(): Layer[] {
        const { id, data: sections, colorMapFunction, zIncreaseDownwards, isLoading } = this.props;
        return sections.map((section) => {
            return new SeismicFenceMeshLayer(
                super.getSubLayerProps({
                    id: `${id}-${section.id}`,
                    data: section.fence,
                    loadingGeometry: section.loadingGeometry,
                    colorMapFunction,
                    zIncreaseDownwards,
                    isLoading,
                }),
            );
        });
    }

    private calcBoundingBox(): BoundingBox3D {
        const { data: sections, zIncreaseDownwards } = this.props;

        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
        let zmin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let zmax = Number.NEGATIVE_INFINITY;

        const zSign = zIncreaseDownwards ? -1 : 1;

        for (const section of sections) {
            if (!section.fence || !section.fence.traceXYZPointsArray) {
                if (section.loadingGeometry) {
                    // If the fence is not loaded, we can use the loading geometry to calculate the bounding box.
                    const { boundingBox } = section.loadingGeometry;
                    xmin = Math.min(xmin, boundingBox.min.x);
                    ymin = Math.min(ymin, boundingBox.min.y);
                    zmin = Math.min(zmin, boundingBox.min.z * zSign);
                    xmax = Math.max(xmax, boundingBox.max.x);
                    ymax = Math.max(ymax, boundingBox.max.y);
                    zmax = Math.max(zmax, boundingBox.max.z * zSign);
                }
                continue;
            }
            const { traceXYZPointsArray } = section.fence;

            for (let i = 0; i < traceXYZPointsArray.length; i += 3) {
                const x = traceXYZPointsArray[i];
                const y = traceXYZPointsArray[i + 1];
                const z = zSign * traceXYZPointsArray[i + 2];
                xmin = Math.min(xmin, x);
                ymin = Math.min(ymin, y);
                zmin = Math.min(zmin, z);
                xmax = Math.max(xmax, x);
                ymax = Math.max(ymax, y);
                zmax = Math.max(zmax, z);
            }
        }

        return [xmin, ymin, zmin, xmax, ymax, zmax];
    }
}
