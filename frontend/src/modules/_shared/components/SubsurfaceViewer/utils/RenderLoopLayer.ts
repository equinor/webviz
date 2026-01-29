import { Layer } from "@deck.gl/core";

type RenderLoopLayerProps = {
    id: string;
    data: any[];
    onRender?: () => void;
};

export class RenderLoopLayer extends Layer<RenderLoopLayerProps> {
    static layerName: string = "PlaceholderLayer";

    constructor(props: RenderLoopLayerProps) {
        super(props);
        this.draw();
    }

    initializeState(): void {
        return;
    }

    getNeedsRedraw(): string | false {
        return "always";
    }

    shouldUpdateState(): boolean {
        return true;
    }

    _drawLayer(): void {
        this.draw();
    }

    draw() {
        this.props.onRender?.();
    }
}
