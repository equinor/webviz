import type { SensitivityResponse } from "../../utils/sensitivityResponseCalculator";

export const numFormat = (number: number): string => {
    return Intl.NumberFormat("en", { 
        notation: "compact", 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(number);
};

export const computeLowLabel = (sensitivity: SensitivityResponse): string => {
    // Combine labels if they appear on the both side
    if (sensitivity.lowCaseReferenceDifference > 0 || sensitivity.highCaseReferenceDifference < 0) {
        return `${numFormat(sensitivity.lowCaseReferenceDifference)} <br> ${numFormat(
            sensitivity.highCaseReferenceDifference,
        )}`;
    }
    return `${numFormat(sensitivity.lowCaseReferenceDifference)}`;
};

export const computeHighLabel = (sensitivity: SensitivityResponse): string => {
    // Combine labels if they appear on the both side
    if (sensitivity.lowCaseReferenceDifference > 0 || sensitivity.highCaseReferenceDifference < 0) {
        return `${numFormat(sensitivity.lowCaseReferenceDifference)} <br> ${numFormat(
            sensitivity.highCaseReferenceDifference,
        )}`;
    }
    return `${numFormat(sensitivity.highCaseReferenceDifference)}`;
};