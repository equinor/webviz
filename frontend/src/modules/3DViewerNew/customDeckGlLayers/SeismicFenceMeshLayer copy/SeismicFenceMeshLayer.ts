import { CompositeLayer, type GetPickingInfoParams, type Layer, type PickingInfo } from "@deck.gl/core";
import type { Geometry as LoadingGeometry } from "@lib/utils/geometry";
import { Geometry } from "@luma.gl/engine";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import type { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

import { SeismicFenceSectionMeshLayer, type SeismicFenceSection } from "./SeismicFenceSectionMeshLayer";

export type SeismicFenceMeshLayerPickingInfo = {
    properties?: { name: string; value: number }[];
} & PickingInfo;

export interface SeismicFenceMeshLayerProps extends ExtendedLayerProps {
    data: {
        sections: SeismicFenceSection[];
    };
    colorMapFunction: (value: number) => [number, number, number];
    hoverable?: boolean;
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;
    loadingGeometry?: LoadingGeometry;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
}

export class SeismicFenceMeshLayer extends CompositeLayer<SeismicFenceMeshLayerProps> {
    static layerName: string = "SeismicFenceMeshLayer";

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    state!: {
        geometry: Geometry;
        isHovered: boolean;
    };

    getPickingInfo({ info }: GetPickingInfoParams): SeismicFenceMeshLayerPickingInfo {
        const { zIncreaseDownwards } = this.props;
        if (!info.color) {
            return info;
        }

        return info;
    }

    onHover(pickingInfo: PickingInfo): boolean {
        this.setState({ ...this.state, isHovered: pickingInfo.index !== -1 });
        return false;
    }

    private calcBoundingBox(): BoundingBox3D {
        let xmin = Number.MAX_VALUE;
        let ymin = Number.MAX_VALUE;
        let zmin = Number.MAX_VALUE;
        let xmax = Number.MIN_VALUE;
        let ymax = Number.MIN_VALUE;
        let zmax = Number.MIN_VALUE;

        const zFactor = this.props.zIncreaseDownwards ? -1 : 1;

        for (const section of this.props.data.sections) {
            for (const point of section.boundingBox) {
                xmin = Math.min(xmin, point[0]);
                ymin = Math.min(ymin, point[1]);
                zmin = Math.min(zmin, zFactor * point[2]);
                xmax = Math.max(xmax, point[0]);
                ymax = Math.max(ymax, point[1]);
                zmax = Math.max(zmax, zFactor * point[2]);
            }
        }

        return [xmin, ymin, zmin, xmax, ymax, zmax];
    }

    renderLayers() {
        const { isLoading, zIncreaseDownwards, loadingGeometry, data } = this.props;

        const layers: Layer<any>[] = [];

        for (const [index, section] of data.sections.entries()) {
            layers.push(
                new SeismicFenceSectionMeshLayer({
                    id: `${this.props.id}-${index}`,
                    data: section,
                    colorMapFunction: this.props.colorMapFunction,
                    zIncreaseDownwards: zIncreaseDownwards,
                    isLoading: isLoading,
                    loadingGeometry: loadingGeometry,
                }),
            );
        }

        return layers;
    }
}
