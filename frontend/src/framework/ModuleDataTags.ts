export enum ModuleDataTagId {
    SURFACE = "surface",
    GRID3D = "grid3d",
    GROUP_TREE = "group-tree",
    DRILLED_WELLS = "drilled-wells",
    SUMMARY = "summary",
    INPLACE_VOLUMES = "inplace-volumes",
    PARAMETERS = "parameters",
    PVT = "pvt",
    RFT = "rft",
    OBSERVATIONS = "observations",
    SEISMIC = "seismic",
    WELL_COMPLETIONS = "well-completions",
    VFP = "vfp",
    POLYGONS = "polygons",
}

export type ModuleDataTag = {
    id: ModuleDataTagId;
    name: string;
    description: string;
};

export const ModuleDataTags: ModuleDataTag[] = [
    {
        id: ModuleDataTagId.SURFACE,
        name: "Surface",
        description: "Regular 2D grid",
    },
    {
        id: ModuleDataTagId.GRID3D,
        name: "3D grid model",
        description: "3D grid model",
    },
    {
        id: ModuleDataTagId.POLYGONS,
        name: "Polygons",
        description: "Polygons",
    },
    {
        id: ModuleDataTagId.GROUP_TREE,
        name: "Group tree",
        description: "Group tree data",
    },
    {
        id: ModuleDataTagId.DRILLED_WELLS,
        name: "Drilled wells",
        description: "Drilled wells as available in SMDA",
    },
    {
        id: ModuleDataTagId.SUMMARY,
        name: "Summary",
        description: "Summary data from the simulator",
    },
    {
        id: ModuleDataTagId.INPLACE_VOLUMES,
        name: "In-place volumes",
        description: "In-place volumes table data",
    },
    {
        id: ModuleDataTagId.PARAMETERS,
        name: "Parameters",
        description: "Model parameters",
    },
    {
        id: ModuleDataTagId.PVT,
        name: "PVT",
        description: "PVT data",
    },
    {
        id: ModuleDataTagId.RFT,
        name: "RFT",
        description: "RFT data",
    },
    {
        id: ModuleDataTagId.OBSERVATIONS,
        name: "Observations",
        description: "Observations",
    },
    {
        id: ModuleDataTagId.SEISMIC,
        name: "Seismic",
        description: "Seismic data",
    },
    {
        id: ModuleDataTagId.WELL_COMPLETIONS,
        name: "Well completions",
        description: "Well completions",
    },
];
