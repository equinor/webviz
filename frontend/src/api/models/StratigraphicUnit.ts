/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type StratigraphicUnit = {
    identifier: string;
    top: string;
    base: string;
    baseAge: number;
    topAge: number;
    colorR: number;
    colorG: number;
    colorB: number;
    stratUnitLevel: number;
    stratUnitParent: (string | null);
    lithologyType: (number | string);
};

