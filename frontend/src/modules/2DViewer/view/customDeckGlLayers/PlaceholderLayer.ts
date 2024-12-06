import { Layer } from "@deck.gl/core";

type PlaceholderLayerProps = {
    id: string;
};

export class PlaceholderLayer extends Layer<PlaceholderLayerProps> {
    static layerName: string = "PlaceholderLayer";

    constructor(props: PlaceholderLayerProps) {
        super(props);
    }

    initializeState(): void {
        return;
    }

    render() {
        return null;
    }
}
