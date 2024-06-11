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
    CROSS = "cross",
    POINT = "point",
    LINE = "line",
    POLYGON = "polygon",
    POLYGONS = "polygons",
    POINTS = "points",
}

export type PolygonData = {
    vertices: Float32Array;
    polygonIndices: Uint32Array | Uint16Array | Uint8Array;
    polygonSizes: Uint32Array | Uint16Array | Uint8Array;
    polygonCellIndices: Uint32Array | Uint16Array | Uint8Array;
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
    paintOrder: number;
} & (
    | {
          shape: HighlightItemShape.CROSS;
          center: number[];
      }
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
          shape: HighlightItemShape.POLYGONS;
          polygons: number[][][];
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

export enum AdditionalInformationKey {
    GLOBAL_POLYGON_INDEX = "polygon-index",
    IJK = "ijk",
    PROP_VALUE = "prop-value",
    MD = "md",
    MEAN = "mean",
    MIN = "min",
    MAX = "max",
    P10 = "p10",
    P90 = "p90",
    P50 = "p50",
    SCHEMATIC_INFO = "schematic-info",
    X = "x",
    Y = "y",
    R = "r",
    G = "g",
    B = "b",
    LABEL = "label",
}

export type PropValue = {
    name: string;
    unit: string;
    value: number;
};

export type SchematicInfo = {
    label: string;
    value: string | number;
}[];

export type AdditionalInformation = {
    [AdditionalInformationKey.B]?: number;
    [AdditionalInformationKey.G]?: number;
    [AdditionalInformationKey.R]?: number;
    [AdditionalInformationKey.X]?: number;
    [AdditionalInformationKey.Y]?: number;
    [AdditionalInformationKey.MEAN]?: number;
    [AdditionalInformationKey.MIN]?: number;
    [AdditionalInformationKey.MAX]?: number;
    [AdditionalInformationKey.P10]?: number;
    [AdditionalInformationKey.P90]?: number;
    [AdditionalInformationKey.P50]?: number;
    [AdditionalInformationKey.GLOBAL_POLYGON_INDEX]?: number;
    [AdditionalInformationKey.IJK]?: [number, number, number];
    [AdditionalInformationKey.PROP_VALUE]?: PropValue;
    [AdditionalInformationKey.MD]?: number;
    [AdditionalInformationKey.LABEL]?: string;
    [AdditionalInformationKey.SCHEMATIC_INFO]?: SchematicInfo;
};
