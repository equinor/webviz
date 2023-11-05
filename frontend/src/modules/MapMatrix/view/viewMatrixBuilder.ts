import { SurfaceDataPng_api, WellBoreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { Axes2DLayer, ColormapLayer, WellsLayer } from "@modules/_shared/components/SubsurfaceViewer/layers";
import { ViewportType, ViewsType } from "@webviz/subsurface-viewer";

import { IndexedSurfaceData } from "../hooks/useSurfaceDataAsPngQuery";
import { ViewSpecification } from "../types";

type ViewportTypeWithLayerIds = ViewportType & { layerIds: string[] };

type ViewAnnotationData = {
    id: string;
    viewSpecification: ViewSpecification;
    colorMin: number;
    colorMax: number;
};
export class ViewMatrixBuilder {
    private viewSpecifications: ViewSpecification[];
    private layers: Layer[] = [];
    private indexedSurfaceData: IndexedSurfaceData[];
    private wellTrajectoryData: WellBoreTrajectory_api[];
    private filterTvdAbove: number | null;
    private filterTvdBelow: number | null;
    private bounds: [number, number, number, number] | null = null;
    private viewPorts: ViewportTypeWithLayerIds[];
    private viewAnnotationsData: ViewAnnotationData[] = [];

    constructor(
        viewSpecifications: ViewSpecification[],
        indexedSurfaceData: IndexedSurfaceData[],
        wellTrajectoryData: WellBoreTrajectory_api[],
        filterTvdAbove: number | null,
        filterTvdBelow: number | null
    ) {
        this.viewSpecifications = viewSpecifications;
        this.indexedSurfaceData = indexedSurfaceData;
        this.wellTrajectoryData = wellTrajectoryData;
        this.filterTvdAbove = filterTvdAbove;
        this.filterTvdBelow = filterTvdBelow;
        this.viewPorts = this.initializeViewPorts();
    }

    private initializeViewPorts() {
        const viewPorts: ViewportTypeWithLayerIds[] = [];
        for (let i = 0; i < this.viewSpecifications.length; i++) {
            viewPorts.push({
                id: `${i}view`,
                show3D: false,
                isSync: true,
                layerIds: [],
                name: `View ${i}`,
            });
        }
        return viewPorts;
    }
    private addLayerIdToViewPort(viewIndex: number, layerId: string) {
        if (!this.viewPorts[viewIndex].layerIds.includes(layerId)) {
            this.viewPorts[viewIndex].layerIds.push(layerId);
        }
    }

    private addColorMapLayer(
        surfaceData: SurfaceDataPng_api,
        id: string,
        colorMin: number | null,
        colorMax: number | null,
        colorPaletteId: string
    ) {
        const colorMapLayer = new ColormapLayer(id);
        colorMapLayer.setData({
            base64ImageString: surfaceData.base64_encoded_image,
            xMin: surfaceData.x_min_surf_orient,
            yMin: surfaceData.y_min_surf_orient,
            xMax: surfaceData.x_max_surf_orient,
            yMax: surfaceData.y_max_surf_orient,
            rotDeg: surfaceData.rot_deg,
            valueMin: surfaceData.val_min,
            valueMax: surfaceData.val_max,
        });
        colorMapLayer.setColorRange(colorMin || surfaceData.val_min, colorMax || surfaceData.val_max);
        colorMapLayer.setColorPaletteId(colorPaletteId);

        const bounds: [number, number, number, number] = [
            surfaceData.x_min,
            surfaceData.y_min,
            surfaceData.x_max,
            surfaceData.y_max,
        ];
        if (!this.bounds) {
            this.bounds = bounds;
        }
        this.layers.push(colorMapLayer.getLayer());
    }

    private addWellLayer(id: string) {
        if (this.wellTrajectoryData.length > 0) {
            const wellLayer = new WellsLayer({ id: id, render2D: true });
            wellLayer.setData(this.wellTrajectoryData, this.filterTvdAbove, this.filterTvdBelow);
            this.layers.push(wellLayer.getLayer());
        }
    }
    private addAxesLayer(id: string) {
        const axes2DLayer = new Axes2DLayer(id);
        this.layers.push(axes2DLayer.getLayer());
    }
    public buildViewMatrix() {
        this.layers = [];
        this.viewAnnotationsData = [];
        this.viewPorts = this.initializeViewPorts();
        this.viewSpecifications.forEach((viewSpec, index) => {
            const surfaceData = this.indexedSurfaceData[index]?.surfaceData;
            const valueMin = surfaceData?.val_min || 0;
            const valueMax = surfaceData?.val_max || 1;
            const colorRange = viewSpec.colorRange ?? [null, null];
            if (surfaceData) {
                const surfaceLayerId = `surface-${index}`;
                this.addColorMapLayer(
                    surfaceData,
                    surfaceLayerId,
                    colorRange[0],
                    colorRange[1],
                    viewSpec.colorPaletteId || ""
                );
                this.addLayerIdToViewPort(index, surfaceLayerId);
            }
            this.viewAnnotationsData.push({
                id: `${index}view`,
                viewSpecification: viewSpec,
                colorMin: colorRange[0] || valueMin,
                colorMax: colorRange[1] || valueMax,
            });

            this.addLayerIdToViewPort(index, "well-layer");
            this.addLayerIdToViewPort(index, "axes-layer");
        });
        this.addWellLayer("well-layer");
        this.addAxesLayer("axes-layer");
    }

    public getLayers(): Layer[] {
        return this.layers;
    }
    public getViewLayout(): ViewsType {
        const numSubplots = this.viewSpecifications.length;
        const numColumns = Math.ceil(Math.sqrt(numSubplots));
        const numRows = Math.ceil(numSubplots / numColumns);
        return { layout: [numRows, numColumns], showLabel: true, viewports: this.viewPorts };
    }
    public getViewAnnotationsData(): ViewAnnotationData[] {
        return this.viewAnnotationsData;
    }
    public getBounds(): [number, number, number, number] | null {
        return this.bounds;
    }
}
