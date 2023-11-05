import { NorthArrow3DLayer } from "@webviz/subsurface-viewer/dist/layers/";

export class NorthArrowLayer {
    private id: string = "north-arrow-layer";
    private visible: boolean = true;

    constructor(id?: string) {
        this.id = id || this.id;
    }

    public setVisible(visible: boolean) {
        this.visible = visible;
    }

    public getId() {
        return this.id;
    }

    public getLayer() {
        return new NorthArrow3DLayer({
            id: this.id,
            visible: this.visible,
        });
    }
}
