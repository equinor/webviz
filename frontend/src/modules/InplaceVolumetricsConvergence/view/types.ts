import { InplaceVolumetricsIdentifier_api } from "@api";

export enum SubplotBy {
    ENSEMBLE = "ensemble",
    TABLE_NAME = "table-name",
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
