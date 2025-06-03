import {
    CompositeLayer,
    type CompositeLayerProps,
    type Layer,
    type PickingInfo,
    type UpdateParameters,
} from "@deck.gl/core";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import type { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

import type { Geometry as LoadingGeometry } from "@lib/utils/geometry";

import { SeismicFenceSectionMeshLayer, type SeismicFenceSection } from "./SeismicFenceSectionMeshLayer";

export type SeismicFenceMeshLayerPickingInfo = {
    properties?: { name: string; value: number }[];
} & PickingInfo;

export type SeismicFenceMeshSectionWithLoadingGeometry = {
    id: string;
    section?: SeismicFenceSection;
    loadingGeometry?: LoadingGeometry;
};

export interface SeismicFenceMeshLayerProps extends ExtendedLayerProps {
    id: string;
    data: SeismicFenceMeshSectionWithLoadingGeometry[];
    colorMapFunction: (value: number) => [number, number, number, number];
    hoverable?: boolean;
    opacity?: number;
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
}

export class SeismicFenceMeshLayer extends CompositeLayer<SeismicFenceMeshLayerProps> {
    static layerName: string = "SeismicFenceMeshLayer";

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    state!: {
        isHovered: boolean;
    };

    onHover(pickingInfo: PickingInfo): boolean {
        this.setState({ isHovered: pickingInfo.index !== -1 });
        return false;
    }

    shouldUpdateState(
        params: UpdateParameters<Layer<SeismicFenceMeshLayerProps & Required<CompositeLayerProps>>>,
    ): boolean {
        const { changeFlags } = params;

        if (changeFlags.dataChanged) {
            return true;
        }

        if (this.props.isLoading && this.state.isHovered) {
            return true;
        }

        return false;
    }

    updateState(params: UpdateParameters<Layer<SeismicFenceMeshLayerProps & Required<CompositeLayerProps>>>): void {
        const { props } = params;

        if (params.changeFlags.dataChanged) {
            this.setState({ isHovered: false });
        }

        if (props.reportBoundingBox && params.changeFlags.dataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
    }

    private calcBoundingBox(): BoundingBox3D {
        let xmin = Number.MAX_VALUE;
        let ymin = Number.MAX_VALUE;
        let zmin = Number.MAX_VALUE;
        let xmax = Number.MIN_VALUE;
        let ymax = Number.MIN_VALUE;
        let zmax = Number.MIN_VALUE;

        const zFactor = this.props.zIncreaseDownwards ? -1 : 1;

        for (const section of this.props.data) {
            if (!section.section || !section.section.boundingBox) {
                continue;
            }
            for (const point of section.section.boundingBox) {
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
        const { isLoading, zIncreaseDownwards, data, opacity } = this.props;

        const layers: Layer<any>[] = [];

        for (const section of data) {
            layers.push(
                new SeismicFenceSectionMeshLayer({
                    id: `${this.props.id}-section-${section.id}`,
                    data: section.section,
                    colorMapFunction: this.props.colorMapFunction,
                    zIncreaseDownwards: zIncreaseDownwards,
                    isLoading: isLoading,
                    loadingGeometry: section.loadingGeometry,

                    opacity,
                }),
            );
        }

        return layers;
    }
}
