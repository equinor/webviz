/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WellboreCasing } from '../models/WellboreCasing';
import type { WellboreCompletion } from '../models/WellboreCompletion';
import type { WellboreGeoData } from '../models/WellboreGeoData';
import type { WellboreGeoHeader } from '../models/WellboreGeoHeader';
import type { WellboreHeader } from '../models/WellboreHeader';
import type { WellboreLogCurveData } from '../models/WellboreLogCurveData';
import type { WellboreLogCurveHeader } from '../models/WellboreLogCurveHeader';
import type { WellborePerforation } from '../models/WellborePerforation';
import type { WellborePick } from '../models/WellborePick';
import type { WellboreTrajectory } from '../models/WellboreTrajectory';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WellService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Drilled Wellbore Headers
     * Get wellbore headers for all wells in the field
     * @param fieldIdentifier Official field identifier
     * @returns WellboreHeader Successful Response
     * @throws ApiError
     */
    public getDrilledWellboreHeaders(
        fieldIdentifier: string,
    ): CancelablePromise<Array<WellboreHeader>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/drilled_wellbore_headers/',
            query: {
                'field_identifier': fieldIdentifier,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Well Trajectories
     * Get well trajectories for field
     * @param fieldIdentifier Official field identifier
     * @param wellboreUuids Optional subset of wellbore uuids
     * @returns WellboreTrajectory Successful Response
     * @throws ApiError
     */
    public getWellTrajectories(
        fieldIdentifier: string,
        wellboreUuids?: Array<string>,
    ): CancelablePromise<Array<WellboreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/well_trajectories/',
            query: {
                'field_identifier': fieldIdentifier,
                'wellbore_uuids': wellboreUuids,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Pick Identifiers
     * Get wellbore pick identifiers for field and stratigraphic column
     * @param fieldIdentifier Official field identifier
     * @param stratColumnIdentifier Stratigraphic column identifier
     * @returns string Successful Response
     * @throws ApiError
     */
    public getWellborePickIdentifiers(
        fieldIdentifier: string,
        stratColumnIdentifier: string,
    ): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_pick_identifiers/',
            query: {
                'field_identifier': fieldIdentifier,
                'strat_column_identifier': stratColumnIdentifier,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Picks For Pick Identifier
     * Get wellbore picks for field and pick identifier
     * @param fieldIdentifier Official field identifier
     * @param pickIdentifier Pick identifier
     * @returns WellborePick Successful Response
     * @throws ApiError
     */
    public getWellborePicksForPickIdentifier(
        fieldIdentifier: string,
        pickIdentifier: string,
    ): CancelablePromise<Array<WellborePick>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_picks_for_pick_identifier/',
            query: {
                'field_identifier': fieldIdentifier,
                'pick_identifier': pickIdentifier,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Picks For Wellbore
     * Get wellbore picks for field and pick identifier
     * @param fieldIdentifier Official field identifier
     * @param wellboreUuid Wellbore uuid
     * @returns WellborePick Successful Response
     * @throws ApiError
     */
    public getWellborePicksForWellbore(
        fieldIdentifier: string,
        wellboreUuid: string,
    ): CancelablePromise<Array<WellborePick>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_picks_for_wellbore/',
            query: {
                'field_identifier': fieldIdentifier,
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Completions
     * Get well bore completions for a single well bore
     * @param wellboreUuid Wellbore uuid
     * @returns WellboreCompletion Successful Response
     * @throws ApiError
     */
    public getWellboreCompletions(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellboreCompletion>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_completions/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Casings
     * Get well bore casings for a single well bore
     * @param wellboreUuid Wellbore uuid
     * @returns WellboreCasing Successful Response
     * @throws ApiError
     */
    public getWellboreCasings(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellboreCasing>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_casings/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Perforations
     * Get well bore casing for a single well bore
     * @param wellboreUuid Wellbore uuid
     * @returns WellborePerforation Successful Response
     * @throws ApiError
     */
    public getWellborePerforations(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellborePerforation>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_perforations/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Log Curve Headers
     * Get all log curve headers for a single well bore
     * @param wellboreUuid Wellbore uuid
     * @returns WellboreLogCurveHeader Successful Response
     * @throws ApiError
     */
    public getWellboreLogCurveHeaders(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellboreLogCurveHeader>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_log_curve_headers/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Log Curve Data
     * Get log curve data
     * @param wellboreUuid Wellbore uuid
     * @param logCurveName Log curve name
     * @returns WellboreLogCurveData Successful Response
     * @throws ApiError
     */
    public getLogCurveData(
        wellboreUuid: string,
        logCurveName: string,
    ): CancelablePromise<WellboreLogCurveData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/log_curve_data/',
            query: {
                'wellbore_uuid': wellboreUuid,
                'log_curve_name': logCurveName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Geology Headers
     * Gets headers for geological interproation data for a given wellbore
     * @param wellboreUuid Wellbore uuid
     * @returns WellboreGeoHeader Successful Response
     * @throws ApiError
     */
    public getWellboreGeologyHeaders(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellboreGeoHeader>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_geology_headers',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Geology Data
     * Gets geological data entries for a given geology header
     * @param wellboreUuid Wellbore uuid
     * @param geologyHeaderUuid Geology header uuid
     * @returns WellboreGeoData Successful Response
     * @throws ApiError
     */
    public getWellboreGeologyData(
        wellboreUuid: string,
        geologyHeaderUuid: string,
    ): CancelablePromise<Array<WellboreGeoData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_geology_data',
            query: {
                'wellbore_uuid': wellboreUuid,
                'geology_header_uuid': geologyHeaderUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
