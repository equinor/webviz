import type { LayerOptions, OnRescaleEvent, OnUpdateEvent } from "@equinor/esv-intersection";
import { CanvasLayer } from "@equinor/esv-intersection";
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

type LinePath = {
    color: string;
    dashSegments?: Iterable<number>;
    paths: Path2D[];
};

type FillPath = {
    color: string;
    path: Path2D;
};

export class SurfaceStatisticalFanchartsCanvasLayer<T extends SurfaceStatisticalFanchartsData> extends CanvasLayer<T> {
    private _rescaleEvent: OnRescaleEvent | null = null;
    private _linePaths: LinePath[] = [];
    private _fillPaths: FillPath[] = [];
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

            for (const fillPath of this._fillPaths) {
                this.drawPolygonPath(fillPath.path, fillPath.color);
            }
            for (const linePath of this._linePaths) {
                for (const path of linePath.paths) {
                    this.drawLinePath(path, linePath.color, linePath.dashSegments);
                }
            }
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
        this.ctx.lineWidth = Math.min(0.5, 2 / this._transform.k);
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
                const paths = this.makeFillPaths(fanchart.data.min, fanchart.data.max);
                for (const path of paths) {
                    this._fillPaths.push({
                        color: this.colorToCss(fanchart.color, 0.2),
                        path,
                    });
                }
            }
            if (fanchart.visibility?.p10p90 ?? true) {
                const paths = this.makeFillPaths(fanchart.data.p10, fanchart.data.p90);
                for (const path of paths) {
                    this._fillPaths.push({
                        color: this.colorToCss(fanchart.color, 0.4),
                        path,
                    });
                }
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
                    paths: this.makeLinePath(fanchart.data.mean),
                });
            }

            if (fanchart.visibility?.p50 ?? true) {
                this._linePaths.push({
                    color: this.colorToCss(fanchart.color, 1),
                    paths: this.makeLinePath(fanchart.data.p50),
                    dashSegments: [1, 1, 5, 1],
                });
            }
        }
    }

    private createClosedPolygonPath(topSegment: number[][], bottomSegment: number[][]): Path2D {
        const polygon = topSegment.concat(bottomSegment.slice().reverse());
        const path = new Path2D();
        path.moveTo(polygon[0][0], polygon[0][1]);
        for (let i = 1; i < polygon.length; i++) {
            path.lineTo(polygon[i][0], polygon[i][1]);
        }
        path.closePath();
        return path;
    }

    private makeFillPaths(topLine: (number | null)[][], bottomLine: (number | null)[][]): Path2D[] {
        if (topLine.length !== bottomLine.length) {
            throw new Error("Top and bottom lines must have the same number of points");
        }

        const paths: Path2D[] = [];

        let segmentTop: number[][] = [];
        let segmentBottom: number[][] = [];

        for (let i = 0; i < topLine.length; i++) {
            const topX = topLine[i][0];
            const topY = topLine[i][1];
            const bottomX = bottomLine[i][0];
            const bottomY = bottomLine[i][1];

            const isValidTop = topX !== null && topX !== undefined && topY !== null && topY !== undefined;
            const isValidBottom =
                bottomX !== null && bottomX !== undefined && bottomY !== null && bottomY !== undefined;

            if (isValidTop && isValidBottom) {
                // Add point to current segment
                segmentTop.push([topX, topY]);
                segmentBottom.push([bottomX, bottomY]);
            } else if (segmentTop.length > 0) {
                // End of continuous segment - create polygon
                paths.push(this.createClosedPolygonPath(segmentTop, segmentBottom));
                segmentTop = [];
                segmentBottom = [];
            }
        }

        // Handle final segment if it exists
        if (segmentTop.length > 0) {
            paths.push(this.createClosedPolygonPath(segmentTop, segmentBottom));
        }

        return paths;
    }

    private makeLinePath(line: (number | null)[][]): Path2D[] {
        if (line.length === 0) {
            return [];
        }

        const paths: Path2D[] = [];

        let segmentPath: Path2D | null = null;
        for (let i = 0; i < line.length; i++) {
            const x = line[i][0];
            const y = line[i][1];

            const isValid = x !== null && x !== undefined && y !== null && y !== undefined;
            if (isValid) {
                // Add point to current segment
                if (segmentPath) {
                    segmentPath.lineTo(x, y);
                }
                // Start new segment
                else {
                    segmentPath = new Path2D();
                    segmentPath.moveTo(x, y);
                }
            } else if (segmentPath) {
                // End of continuous segment - save path
                paths.push(segmentPath);
                segmentPath = null;
            }
        }

        if (segmentPath) {
            paths.push(segmentPath);
        }

        return paths;
    }
}
