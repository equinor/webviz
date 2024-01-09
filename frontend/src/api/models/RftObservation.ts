/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A specific RFT (Repeat Formation Tester) observation.
 *
 * Attributes:
 * value (float): The measured value of the observation.
 * comment (Optional[str]): An optional comment associated with the observation.
 * error (float): The measurement error associated with the observation.
 * zone (str): The zone or region associated with the observation.
 * md_msl (float): Measured depth from mean sea level.
 * x (float): X utm coordinate of the observation.
 * y (float): Y utm coordinate of the observation.
 * z (float): Z utm coordinate of the observation.
 */
export type RftObservation = {
    value: number;
    comment: (string | null);
    error: number;
    zone: string;
    md_msl: number;
    'x': number;
    'y': number;
    'z': number;
};

