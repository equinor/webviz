import { InplaceVolumetricsIdentifier_api } from "@api";

export enum SubplotBy {
    NONE = "none",
    SOURCE = "source",
    FLUID_ZONE = "fluidZone",
    IDENTIFIER = "identifier",
}

export type SubplotByInfo =
    | {
          subplotBy: Exclude<SubplotBy, SubplotBy.IDENTIFIER>;
      }
    | {
          subplotBy: SubplotBy.IDENTIFIER;
          identifier: InplaceVolumetricsIdentifier_api;
      };
