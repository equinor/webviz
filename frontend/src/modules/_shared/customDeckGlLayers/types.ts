import { MeshAttribute, MeshAttributes } from "@loaders.gl/schema";
import { Geometry } from "@luma.gl/engine";

export type Mesh =
    | Geometry
    | {
          attributes: MeshAttributes;
          indices?: MeshAttribute;
      }
    | MeshAttributes;
