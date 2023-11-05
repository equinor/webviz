import { ViewportType, ViewsType } from "@webviz/subsurface-viewer";

export class ViewLayout {
    private viewPorts: ViewportType[] = [];
    private viewAnnotationData: [] = [];
    private numColumns: number = 1;
    private numRows: number = 1;
    private showLabel: boolean = true;

    constructor(numSubplots: number) {
        this.numColumns = Math.ceil(Math.sqrt(numSubplots));
        this.numRows = Math.ceil(numSubplots / this.numColumns);
    }

    private getLayoutTarget(index: number): [number, number] {
        const row = Math.floor(index / this.numColumns);
        const column = index % this.numColumns;
        return [row, column];
    }
    public setShowLabel(showLabel: boolean) {
        this.showLabel = showLabel;
    }

    public addViewPort(viewPort: ViewportType) {
        this.viewPorts.push(viewPort);
    }
    private defaultViewPort(): ViewportType {
        return {
            id: "default-viewport",
        };
    }
    public getViewLayout(): ViewsType {
        const viewPorts = this.viewPorts.length ? this.viewPorts : [this.defaultViewPort()];
        return { layout: [this.numRows, this.numColumns], showLabel: this.showLabel, viewports: viewPorts };
    }
}
