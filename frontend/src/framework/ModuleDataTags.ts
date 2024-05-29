import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";

import { defaultColorPalettes } from "./WorkbenchSettings";

const colorSet = new ColorSet(
    defaultColorPalettes.find((el) => el.getId() === "retro-metro") ??
        new ColorPalette({ name: "", colors: [], id: "" })
);

export enum ModuleDataTagId {
    SURFACE = "surface",
    GRID3D = "grid3d",
    DRILLED_WELLS = "drilled-wells",
    SUMMARY = "summary",
    INPLACE_VOLUMETRICS = "inplace-volumetrics",
    PVT = "pvt",
    RFT = "rft",
    OBSERVATIONS = "observations",
    SEISMIC = "seismic",
    WELL_COMPLETIONS = "well-completions",
}

export type ModuleDataTag = {
    id: ModuleDataTagId;
    name: string;
    description: string;
    color: string;
};

export const ModuleDataTags: ModuleDataTag[] = [
    {
        id: ModuleDataTagId.SURFACE,
        name: "Surface",
        description: "Regular 2D grid",
        color: colorSet.getFirstColor(),
    },
    {
        id: ModuleDataTagId.GRID3D,
        name: "3D grid model",
        description: "3D grid model",
        color: colorSet.getNextColor(),
    },
    {
        id: ModuleDataTagId.DRILLED_WELLS,
        name: "Drilled wells",
        description: "Drilled wells as available in SMDA",
        color: colorSet.getNextColor(),
    },
    {
        id: ModuleDataTagId.SUMMARY,
        name: "Summary",
        description: "Summary data from the simulator",
        color: colorSet.getNextColor(),
    },
    {
        id: ModuleDataTagId.INPLACE_VOLUMETRICS,
        name: "In-place volumetrics",
        description: "In-place volumetrics",
        color: colorSet.getNextColor(),
    },
    {
        id: ModuleDataTagId.PVT,
        name: "PVT",
        description: "PVT data",
        color: colorSet.getNextColor(),
    },
    {
        id: ModuleDataTagId.RFT,
        name: "RFT",
        description: "RFT data",
        color: colorSet.getNextColor(),
    },
    {
        id: ModuleDataTagId.OBSERVATIONS,
        name: "Observations",
        description: "Observations",
        color: colorSet.getNextColor(),
    },
    {
        id: ModuleDataTagId.SEISMIC,
        name: "Seismic",
        description: "Seismic data",
        color: colorSet.getNextColor(),
    },
    {
        id: ModuleDataTagId.WELL_COMPLETIONS,
        name: "Well completions",
        description: "Well completions",
        color: colorSet.getNextColor(),
    },
];
