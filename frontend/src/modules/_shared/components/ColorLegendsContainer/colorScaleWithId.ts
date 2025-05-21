import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

export type ColorScaleWithId = {
    id: string;
    colorScale: ColorScaleWithName;
};

export function isColorScaleWithId(colorScale: any): colorScale is ColorScaleWithId {
    const actualNumberOfObjectKeys = Object.keys(colorScale).length;
    const expectedNumberOfObjectKeys = 2;
    const isValidNumberOfKeys = actualNumberOfObjectKeys === expectedNumberOfObjectKeys;

    return (
        colorScale &&
        isValidNumberOfKeys &&
        typeof colorScale.id === "string" &&
        colorScale.colorScale instanceof ColorScaleWithName
    );
}
