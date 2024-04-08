import { CanvasLayer, LayerOptions, OnRescaleEvent, OnUpdateEvent } from "@equinor/esv-intersection";

import { formatCss, parse } from "culori";

export type SurfaceStatisticalFanchart = {
    id?: string;
    label?: string;
    color?: string;
    data: {
        mean: number[][];
        min: number[][];
        max: number[][];
        p10: number[][];
        p50: number[][];
        p90: number[][];
    };
    visibility?: {
        mean: boolean;
        minMax: boolean;
        p10p90: boolean;
        p50: boolean;
    };
};

export type SurfaceStatisticalFanchartsData = {
    fancharts: SurfaceStatisticalFanchart[];
};

type Path = {
    color: string;
    dashSegments?: Iterable<number>;
    path: Path2D;
};

export class SurfaceStatisticalFanchartsCanvasLayer<T extends SurfaceStatisticalFanchartsData> extends CanvasLayer<T> {
    private _rescaleEvent: OnRescaleEvent | null = null;
    private _linePaths: Path[] = [];
    private _fillPaths: Path[] = [];
    private _transform: OnRescaleEvent["transform"];

    constructor(id?: string, options?: LayerOptions<T>) {
        super(id, options);

        this._transform = { k: 1, x: 0, y: 0 };
        this.render = this.render.bind(this);
        this.generateFillPaths = this.generateFillPaths.bind(this);
        this.generateLinePaths = this.generateLinePaths.bind(this);
        this.updatePaths = this.updatePaths.bind(this);
        this.drawLinePath = this.drawLinePath.bind(this);
        this.drawPolygonPath = this.drawPolygonPath.bind(this);
    }

    override onUpdate(event: OnUpdateEvent<T>): void {
        super.onUpdate(event);
        this.updatePaths();
        this.render();
    }

    override onRescale(event: OnRescaleEvent): void {
        this._rescaleEvent = event;
        this.setTransform(event);
        this._transform = event.transform;
        this.render();
    }

    private updatePaths(): void {
        if (!this.data) {
            this._fillPaths = [];
            this._linePaths = [];
            return;
        }

        this.generateFillPaths();
        this.generateLinePaths();
    }

    private render() {
        if (!this.ctx || !this.data || !this._rescaleEvent) {
            return;
        }

        requestAnimationFrame(() => {
            this.clearCanvas();
            this._fillPaths.forEach((path) => this.drawPolygonPath(path.path, path.color));
            this._linePaths.forEach((path) => this.drawLinePath(path.path, path.color, path.dashSegments));
        });
    }

    private drawPolygonPath(path: Path2D, color: string): void {
        if (!this.ctx) {
            return;
        }

        this.ctx.fillStyle = color;
        this.ctx.fill(path);
    }

    private drawLinePath(path: Path2D, color: string, dashSegments?: Iterable<number>): void {
        if (!this.ctx) {
            return;
        }

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = Math.min(1, 2 / this._transform.k);
        if (dashSegments !== undefined) {
            this.ctx.setLineDash(dashSegments);
        } else {
            this.ctx.setLineDash([]);
        }
        this.ctx.stroke(path);
        this.ctx.restore();
    }

    private colorToCss(color: string | undefined, alpha: number): string {
        const col = parse(color ?? "-");
        if (col === undefined) {
            return `rgba(0, 0, 0, ${alpha})`;
        }
        col.alpha = alpha;
        return formatCss(col);
    }

    private generateFillPaths(): void {
        if (!this.data) {
            return;
        }

        this._fillPaths = [];

        for (const fanchart of this.data.fancharts) {
            if (fanchart.visibility?.minMax ?? true) {
                this._fillPaths.push({
                    color: this.colorToCss(fanchart.color, 0.2),
                    path: this.makeFillPath(this.createMinMaxFillPolygon(fanchart)),
                });
            }
            if (fanchart.visibility?.p10p90 ?? true) {
                this._fillPaths.push({
                    color: this.colorToCss(fanchart.color, 0.4),
                    path: this.makeFillPath(this.createP10P90FillPolygon(fanchart)),
                });
            }
        }
    }

    private generateLinePaths(): void {
        if (!this.data) {
            return;
        }

        this._linePaths = [];

        for (const fanchart of this.data.fancharts) {
            if (fanchart.visibility?.mean ?? true) {
                this._linePaths.push({
                    color: this.colorToCss(fanchart.color, 1),
                    path: this.makeLinePath(fanchart.data.mean),
                });
            }

            if (fanchart.visibility?.p50 ?? true) {
                this._linePaths.push({
                    color: this.colorToCss(fanchart.color, 1),
                    path: this.makeLinePath(fanchart.data.p50),
                    dashSegments: [1, 1, 5, 1],
                });
            }
        }
    }

    private createMinMaxFillPolygon(fanchart: SurfaceStatisticalFanchart): number[][] {
        const polygon = fanchart.data.min.concat(fanchart.data.max.slice().reverse());
        return polygon;
    }

    private createP10P90FillPolygon(fanchart: SurfaceStatisticalFanchart): number[][] {
        const polygon = fanchart.data.p10.concat(fanchart.data.p90.slice().reverse());
        return polygon;
    }

    private makeFillPath(polygon: number[][]): Path2D {
        const path = new Path2D();
        path.moveTo(polygon[0][0], polygon[0][1]);
        for (let i = 1; i < polygon.length; i++) {
            path.lineTo(polygon[i][0], polygon[i][1]);
        }
        path.closePath();
        return path;
    }

    private makeLinePath(line: number[][]): Path2D {
        const path = new Path2D();

        for (let i = 0; i < line.length; i++) {
            if (i === 0) {
                path.moveTo(line[i][0], line[i][1]);
                continue;
            }
            path.lineTo(line[i][0], line[i][1]);
        }
        return path;
    }
}
