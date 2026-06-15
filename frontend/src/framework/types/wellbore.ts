export interface Wellbore {
    type: "smda";
    uwi: string;
    uuid: string;
}

export enum ProductionPhase {
    OIL = "oil",
    GAS = "gas",
    WATER = "water",
}

export enum InjectionPhase {
    WATER = "water",
    GAS = "gas",
}

export type FlowDataColors = {
    oil?: string;
    gas?: string;
    water?: string;
};
