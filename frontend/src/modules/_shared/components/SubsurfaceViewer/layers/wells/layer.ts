import { WellBoreTrajectory_api } from "@api";
import { WellsLayer as ATWellsLayer } from "@webviz/subsurface-viewer/dist/layers/";

import { FeatureCollection } from "geojson";

import { createWellsFeatureCollection } from "./data";

export class WellsLayer {
    private wellData: FeatureCollection = { type: "FeatureCollection", features: [] };
    private id: string = "wells-layer";
    private wellNamesVisible: boolean = false;
    private depthTest: boolean = true;

    constructor(options: { render2D: boolean; id?: string }) {
        this.id = options.id || this.id;
        if (options.render2D) {
            this.depthTest = false;
        }
    }
    public setData(
        wellTrajectories: WellBoreTrajectory_api[],
        filterTvdAbove: number | null,
        filterTvdBelow: number | null,
        selectedWell?: string
    ) {
        this.wellData = createWellsFeatureCollection(wellTrajectories, filterTvdAbove, filterTvdBelow, selectedWell);
    }

    public getId() {
        return this.id;
    }
    public showWellNames(show: boolean) {
        this.wellNamesVisible = show;
    }

    public getLayer(): ATWellsLayer {
        return new ATWellsLayer({
            id: this.id,
            data: this.wellData,
            refine: false,
            lineStyle: { width: 4 },
            wellHeadStyle: { size: 1 },
            pickable: true,
            autoHighlight: true,
            opacity: 1,
            outline: true,
            lineWidthScale: 1,
            pointRadiusScale: 1,
            logRadius: 10,
            logCurves: true,
            visible: true,
            wellNameVisible: this.wellNamesVisible,
            wellNameAtTop: true,
            wellNameSize: 14,
            wellNameColor: [0, 0, 0, 255],
            selectedWell: "@@#editedData.selectedWells",
            depthTest: this.depthTest,
            ZIncreasingDownwards: true,
            simplifiedRendering: false,
        });
    }
}
