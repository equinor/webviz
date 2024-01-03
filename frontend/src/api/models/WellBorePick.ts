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
export type WellBorePick = {
    northing: number;
    easting: number;
    tvd: number;
    tvd_msl: number;
    md: number;
    md_msl: number;
    unique_wellbore_identifier: string;
    pick_identifier: string;
    confidence: (string | null);
    depth_reference_point: string;
    md_unit: string;
};

