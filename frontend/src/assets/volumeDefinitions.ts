export type VolumeDefinition = {
    description: string;
    unit?: string;
    // eclsum?: [string, string]; // string[]
};

export type VolumeDefinitionsType = Record<string, VolumeDefinition>;

// This is a simple example of a volume definitions object - in order of priority.
// See the original file for the full list of volume definitions:
// - https://github.com/equinor/webviz-subsurface/blob/master/webviz_subsurface/_abbreviations/abbreviation_data/volume_terminology.json
// - `eclsum` not included
export const ORDERED_VOLUME_DEFINITIONS: VolumeDefinitionsType = {
    STOIIP: { description: "Stock tank oil initially in place", unit: "Sm³" },
    GIIP: { description: "Gas initially in place", unit: "Sm³" },
    STOIIP_TOTAL: { description: "Stock tank oil initially in place (total)", unit: "Sm³" },
    GIIP_TOTAL: { description: "Gas initially in place (total)", unit: "Sm³" },
    ASSOCIATEDGAS: { description: "Associated gas", unit: "Sm³" },
    ASSOCIATEDOIL: { description: "Associated oil", unit: "Sm³" },
    BULK: { description: "Bulk volume", unit: "m³" },
    NET: { description: "Net volume", unit: "m³" },
    PORV: { description: "Pore volume", unit: "m³" },
    HCPV: { description: "Hydro carbon pore volume", unit: "m³" },
    PORO: { description: "Porosity" },
    SW: { description: "Water saturation" },
    NTG: { description: "Net to gross" },
    BO: { description: "Oil formation volume factor" },
    BG: { description: "Gas formation volume factor" },
};
