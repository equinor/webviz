import { Axes2DLayer as ATAxes2DLayer } from "@webviz/subsurface-viewer/dist/layers/";

export class Axes2DLayer {
    private id: string = "axes-layer2D";

    constructor(id?: string) {
        this.id = id || this.id;
    }

    public getId() {
        return this.id;
    }

    public getLayer() {
        return new ATAxes2DLayer({
            id: this.id,
            marginH: 80,
            marginV: 30,
            isLeftRuler: true,
            isRightRuler: false,
            isBottomRuler: false,
            isTopRuler: true,
            backgroundColor: [255, 255, 255, 255],
        });
    }
}
