/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * Needed for esvIntersection:
 * - identifier
 * - top
 * - base
 * - base_age
 * - top_age
 * - color_r
 * - color_g
 * - color_b
 * - strat_unit_level
 * - strat_unit_parent
 * - lithology_type
 */
export type StratigraphicUnit = {
    identifier: string;
    top: string;
    base: string;
    strat_unit_level: number;
    strat_unit_type: string;
    top_age: (number | null);
    base_age: (number | null);
    strat_unit_parent: (string | null);
    color_r: number;
    color_g: number;
    color_b: number;
    lithology_type: (number | string);
};

