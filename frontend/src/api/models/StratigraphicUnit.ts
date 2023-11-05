/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Stratigraphic unit from SMDA
 *
 * Camel case attributes needed for esvIntersection component in front-end
 */
export type StratigraphicUnit = {
    identifier: string;
    top: string;
    base: string;
    stratUnitLevel: number;
    stratUnitType: string;
    topAge: number;
    baseAge: number;
    stratUnitParent?: (string | null);
    colorR: number;
    colorG: number;
    colorB: number;
    lithologyType?: (number | string);
};

