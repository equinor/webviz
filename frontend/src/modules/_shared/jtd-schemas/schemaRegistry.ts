import { InplaceVolumesIndexWithValuesAsStringsSchema } from "./definitions/InplaceVolumesIndexWithValues";
import { Point2DSchema } from "./definitions/Point2D";
import { Point3DSchema } from "./definitions/Point3D";
import { ViewStateSchema } from "./definitions/ViewState";

export const schemaRegistry = {
    ViewState: ViewStateSchema,
    Point2D: Point2DSchema,
    Point3D: Point3DSchema,
    InplaceVolumesIndexWithValues: InplaceVolumesIndexWithValuesAsStringsSchema,
};
