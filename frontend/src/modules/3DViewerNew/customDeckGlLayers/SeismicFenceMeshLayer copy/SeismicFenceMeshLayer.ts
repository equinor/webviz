import { CompositeLayer, type GetPickingInfoParams, type Layer, type PickingInfo } from "@deck.gl/core";
import type { Geometry as LoadingGeometry } from "@lib/utils/geometry";
import { Geometry } from "@luma.gl/engine";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import type { ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

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

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg);
    }
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

    renderLayers() {
        const { isLoading, zIncreaseDownwards, loadingGeometry, data } = this.props;

        const layers: Layer<any>[] = [];

        for (const [index, section] of data.sections.entries()) {
            layers.push(new SeismicFenceSectionMeshLayer({
                id: `${this.props.id}-${index}`,
                data: section,
                colorMapFunction: this.props.colorMapFunction,
                zIncreaseDownwards: zIncreaseDownwards,
                isLoading: isLoading,
                loadingGeometry: loadingGeometry,
            }));
        }

        return layers;
    }
}
