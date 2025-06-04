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
    sections: Array<SeismicFenceWithId>;
    colorMapFunction: SeismicFenceMeshLayerProps["colorMapFunction"];
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;

    // Non-public property:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
};

export class SeismicSlicesLayer extends CompositeLayer<SeismicSlicesLayerProps> {
    static layerName = "SeismicSlicesLayer";

    updateState({ changeFlags, props }: UpdateParameters<this>): void {
        if (props.reportBoundingBox && changeFlags.dataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
    }

    renderLayers(): Layer[] {
        const { id, sections, colorMapFunction, zIncreaseDownwards, isLoading } = this.props;
        return sections.map((section) => {
            return new SeismicFenceMeshLayer({
                id: `${id}-${section.id}`,
                data: section.fence,
                loadingGeometry: section.loadingGeometry,
                colorMapFunction,
                zIncreaseDownwards,
                isLoading,
            });
        });
    }

    private calcBoundingBox(): BoundingBox3D {
        const { sections, zIncreaseDownwards } = this.props;

        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
        let zmin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let zmax = Number.NEGATIVE_INFINITY;

        const zSign = zIncreaseDownwards ? -1 : 1;

        for (const section of sections) {
            if (!section.fence || !section.fence.traceXYPointsArray) {
                continue; // Skip sections without valid fence data
            }
            const { traceXYPointsArray, minDepth, maxDepth } = section.fence;

            for (let i = 0; i < traceXYPointsArray.length; i += 2) {
                const x = traceXYPointsArray[i];
                const y = traceXYPointsArray[i + 1];
                xmin = Math.min(xmin, x);
                ymin = Math.min(ymin, y);
                xmax = Math.max(xmax, x);
                ymax = Math.max(ymax, y);
            }

            const z1 = zSign * minDepth;
            const z2 = zSign * maxDepth;

            zmin = Math.min(zmin, z1, z2);
            zmax = Math.max(zmax, z1, z2);
        }

        return [xmin, ymin, zmin, xmax, ymax, zmax];
    }
}
