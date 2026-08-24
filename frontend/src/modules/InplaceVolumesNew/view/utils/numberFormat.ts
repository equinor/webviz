import type { NumberFormatOptions } from "@modules/_shared/utils/numberFormatting";

// Shared by plot labels, hover texts and the statistics table so all numbers use the same SI prefixes.
export const INPLACE_VOLUMES_NUMBER_FORMAT: NumberFormatOptions = {
    maxNumDecimalPlaces: 2,
    unitSystem: "si",
};
