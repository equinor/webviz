export type State = {
    selectedVector: string;
    selectedVector2: string;
    highlightedTrace: number | undefined;
    xAxisRange: [number, number] | undefined;
    visualizationType: string;
}