import { CanvasLayer, OnMountEvent, OnRescaleEvent, OnUpdateEvent, SeismicCanvasData } from "@equinor/esv-intersection";

export type SeismicLayerData = SeismicCanvasData & {
    minFenceDepth: number;
    maxFenceDepth: number;
    minFenceX: number;
    maxFenceX: number;
    numTraces: number;
    numSamplesPerTrace: number;
    fenceTracesFloat32Array: Float32Array;
    propertyName: string;
    propertyUnit: string;
};

export class SeismicLayer extends CanvasLayer<SeismicLayerData> {
    override onMount(event: OnMountEvent): void {
        super.onMount(event);
    }

    override onUpdate(event: OnUpdateEvent<SeismicLayerData>): void {
        super.onUpdate(event);

        this.clearCanvas();

        this.render();
    }

    override onRescale(event: OnRescaleEvent): void {
        super.onRescale(event);
        this.setTransform(event);
        this.render();
    }

    render(): void {
        if (!this.data || !this.ctx || !this.data.image) {
            return;
        }
        const { ctx } = this;
        const { options, image } = this.data;

        this.clearCanvas();

        ctx.drawImage(image, options.x, options.y, options.width, options.height);
    }
}
