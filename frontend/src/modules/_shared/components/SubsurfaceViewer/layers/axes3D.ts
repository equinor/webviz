import { AxesLayer as ATAxes3DLayer } from "@webviz/subsurface-viewer/dist/layers/";

export class Axes3DLayer {
    private id: string = "axes-layer3D";
    private visible: boolean = true;
    private bounds: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];

    constructor(id?: string) {
        this.id = id || this.id;
    }
    public setBounds(bounds: [number, number, number, number, number, number]) {
        this.bounds = bounds;
    }
    public getId() {
        return this.id;
    }
    public setVisible(visible: boolean) {
        this.visible = visible;
    }
    public getLayer() {
        return new ATAxes3DLayer({
            id: this.id,
            bounds: this.bounds,
            visible: this.visible,
        });
    }
}
