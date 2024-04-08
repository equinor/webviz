import { Layer, SchematicData } from "@equinor/esv-intersection";

export interface BoundingVolume {
    contains(point: number[]): boolean;
}

export enum IntersectionItemShape {
    POINT = "point",
    LINE = "line",
    LINE_SET = "lineset",
    POLYGON = "polygon",
    POLYGONS = "polygons",
    WELLBORE_PATH = "wellbore-path",
    FANCHART = "fanchart",
    RECTANGLE = "rectangle",
}

export enum HighlightItemShape {
    POINT = "point",
    LINE = "line",
    POLYGON = "polygon",
    POINTS = "points",
}

export type PolygonData = {
    vertices: Float32Array;
    polygonIndices: Uint32Array | Uint16Array | Uint8Array;
    polygonSizes: Uint32Array | Uint16Array | Uint8Array;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
};

export type IntersectionItem = {
    id: string;
} & (
    | {
          shape: IntersectionItemShape.POINT;
          data: number[];
      }
    | {
          shape: IntersectionItemShape.LINE;
          data: number[][];
      }
    | {
          shape: IntersectionItemShape.LINE_SET;
          data: number[][][];
      }
    | {
          shape: IntersectionItemShape.POLYGON;
          data: number[][];
      }
    | {
          shape: IntersectionItemShape.POLYGONS;
          data: PolygonData;
      }
    | {
          shape: IntersectionItemShape.WELLBORE_PATH;
      }
    | {
          shape: IntersectionItemShape.FANCHART;
          data: {
              hull: number[][];
              lines: number[][][];
          };
      }
    | {
          shape: IntersectionItemShape.RECTANGLE;
          data: number[][];
      }
);

export interface IntersectedItem {
    shape: IntersectionItemShape;
    point: number[];
}

export type HighlightItem = {
    color: string;
} & (
    | {
          shape: HighlightItemShape.POINT;
          point: number[];
      }
    | {
          shape: HighlightItemShape.LINE;
          line: number[][];
      }
    | {
          shape: HighlightItemShape.POLYGON;
          polygon: number[][];
      }
    | {
          shape: HighlightItemShape.POINTS;
          points: number[][];
      }
);

export type ReadoutItem = {
    layer: Layer<unknown>;
    index: number;
    point: number[];
    points?: number[][];
    md?: number;
    polygonIndex?: number;
    schematicType?: keyof SchematicData;
};

export interface IntersectionCalculator {
    calcIntersection(point: number[]): IntersectedItem | null;
}

export type LayerDataItem = {
    id: string;
    layer: Layer<unknown>;
    index: number;
    intersectionItem: IntersectionItem;
};
