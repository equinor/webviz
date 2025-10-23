import type { QueryClient } from "@tanstack/react-query";

import type { EnsembleDetails_api, EnsembleParameter_api, EnsembleSensitivity_api, } from "@api";
import { SensitivityType_api, getEnsembleDetailsOptions, getParametersOptions, getSensitivitiesOptions } from "@api";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { calcFnv1aHash } from "@lib/utils/hashUtils";

import type { ContinuousParameter, DiscreteParameter, Parameter } from "../EnsembleParameters";
import { ParameterType } from "../EnsembleParameters";
import type { Sensitivity, SensitivityCase } from "../EnsembleSensitivities";
import { SensitivityType } from "../EnsembleSensitivities";
import { EnsembleSet } from "../EnsembleSet";
import { RegularEnsemble } from "../RegularEnsemble";
import type { RegularEnsembleIdent } from "../RegularEnsembleIdent";

import { tanstackDebugTimeOverride } from "./utils/debug";
import { fetchLatestEnsembleFingerprints } from "./utils/fetchEnsembleFingerprints";

type EnsembleApiData = {
    ensembleDetails: EnsembleDetails_api;
    parameters: EnsembleParameter_api[];
    sensitivities: EnsembleSensitivity_api[];
};
type EnsembleIdentStringToEnsembleApiDataMap = {
    [ensembleIdentString: string]: EnsembleApiData;
};

export type UserEnsembleSetting = {
    ensembleIdent: RegularEnsembleIdent;
    customName: string | null;
    color: string;
};

export type UserDeltaEnsembleSetting = {
    comparisonEnsembleIdent: RegularEnsembleIdent;
    referenceEnsembleIdent: RegularEnsembleIdent;
    customName: string | null;
    color: string;
};

export async function loadMetadataFromBackendAndCreateEnsembleSet(
    queryClient: QueryClient,
    userEnsembleSettings: UserEnsembleSetting[],
    userDeltaEnsembleSettings: UserDeltaEnsembleSetting[],
): Promise<EnsembleSet> {
    // Get ensemble idents to load
    const ensembleFingerprintsMap = new Map<string, string>();
    const ensembleIdentsToLoad: RegularEnsembleIdent[] = [];
    const uniqueIdentSet = new Set<string>();

    for (const ensembleSetting of userEnsembleSettings) {
        ensembleIdentsToLoad.push(ensembleSetting.ensembleIdent);
        uniqueIdentSet.add(ensembleSetting.ensembleIdent.toString());
    }

    for (const deltaEnsembleSetting of userDeltaEnsembleSettings) {
        const comparisonIdentString = deltaEnsembleSetting.comparisonEnsembleIdent.toString();
        if (!uniqueIdentSet.has(comparisonIdentString)) {
            ensembleIdentsToLoad.push(deltaEnsembleSetting.comparisonEnsembleIdent);
            uniqueIdentSet.add(comparisonIdentString);
        }
        const referenceIdentString = deltaEnsembleSetting.referenceEnsembleIdent.toString();
        if (!uniqueIdentSet.has(referenceIdentString)) {
            ensembleIdentsToLoad.push(deltaEnsembleSetting.referenceEnsembleIdent);
            uniqueIdentSet.add(referenceIdentString);
        }
    }

    // Loading fingerprints here in order to make use of caching in the browser
    const fingerprints = await fetchLatestEnsembleFingerprints(queryClient, ensembleIdentsToLoad);
    for (const item of fingerprints) {
        if (!item.fingerprint) {
            console.warn(
                "No fingerprint found for ensemble, will not use cache-busting:",
                item.ensembleIdent.toString(),
            );
            continue;
        }
        ensembleFingerprintsMap.set(item.ensembleIdent.toString(), item.fingerprint);
    }
    EnsembleFingerprintStore.setAll(ensembleFingerprintsMap);

    // Fetch from back-end
    const ensembleApiDataMap = await loadEnsembleApiDataMapFromBackend(
        queryClient,
        ensembleIdentsToLoad,
        ensembleFingerprintsMap,
    );

    // Create regular ensembles
    const outEnsembleArray: RegularEnsemble[] = [];
    for (const ensembleSetting of userEnsembleSettings) {
        const ensembleIdentString = ensembleSetting.ensembleIdent.toString();
        const ensembleApiData = ensembleApiDataMap[ensembleIdentString];
        if (!ensembleApiData) {
            console.error("Error fetching ensemble data, dropping ensemble:", ensembleSetting.ensembleIdent.toString());
            continue;
        }

        const parameterArray = buildParameterArrFromApiResponse(ensembleApiData.parameters);
        const sensitivityArray = buildSensitivityArrFromApiResponse(ensembleApiData.sensitivities);
        outEnsembleArray.push(
            new RegularEnsemble(
                ensembleApiData.ensembleDetails.fieldIdentifier,
                ensembleApiData.ensembleDetails.caseUuid,
                ensembleApiData.ensembleDetails.caseName,
                ensembleApiData.ensembleDetails.name,
                ensembleApiData.ensembleDetails.stratigraphicColumnIdentifier,
                ensembleApiData.ensembleDetails.realizations,
                parameterArray,
                sensitivityArray,
                ensembleSetting.color,
                ensembleSetting.customName,
            ),
        );
    }

    // Create delta ensembles
    // - Delta ensembles does not support parameters and sensitivities yet
    const outDeltaEnsembleArray: DeltaEnsemble[] = [];
    const emptyParameterArray: Parameter[] = [];
    const nullSensitivityArray = null;
    const emptyColor = "";
    for (const deltaEnsembleSetting of userDeltaEnsembleSettings) {
        const comparisonEnsembleIdentString = deltaEnsembleSetting.comparisonEnsembleIdent.toString();
        const referenceEnsembleIdentString = deltaEnsembleSetting.referenceEnsembleIdent.toString();

        const comparisonEnsembleApiData = ensembleApiDataMap[comparisonEnsembleIdentString];
        const referenceEnsembleApiData = ensembleApiDataMap[referenceEnsembleIdentString];
        if (!comparisonEnsembleApiData || !referenceEnsembleApiData) {
            console.error(
                "Error fetching delta ensemble data, dropping delta ensemble:",
                deltaEnsembleSetting.customName ?? `${comparisonEnsembleIdentString} - ${referenceEnsembleIdentString}`,
            );
            continue;
        }

        const comparisonEnsembleCustomName =
            userEnsembleSettings.find((elm) => elm.ensembleIdent.toString() === comparisonEnsembleIdentString)
                ?.customName ?? null;
        const referenceEnsembleCustomName =
            userEnsembleSettings.find((elm) => elm.ensembleIdent.toString() === referenceEnsembleIdentString)
                ?.customName ?? null;

        // Look for existing regular ensembles
        const existingComparisonEnsemble = outEnsembleArray.find((elm) =>
            elm.getIdent().equals(deltaEnsembleSetting.comparisonEnsembleIdent),
        );
        const existingReferenceEnsemble = outEnsembleArray.find((elm) =>
            elm.getIdent().equals(deltaEnsembleSetting.referenceEnsembleIdent),
        );

        // Create delta ensemble
        const comparisonEnsemble = existingComparisonEnsemble
            ? existingComparisonEnsemble
            : new RegularEnsemble(
                  comparisonEnsembleApiData.ensembleDetails.fieldIdentifier,
                  comparisonEnsembleApiData.ensembleDetails.caseUuid,
                  comparisonEnsembleApiData.ensembleDetails.caseName,
                  comparisonEnsembleApiData.ensembleDetails.name,
                  comparisonEnsembleApiData.ensembleDetails.stratigraphicColumnIdentifier,
                  comparisonEnsembleApiData.ensembleDetails.realizations,
                  emptyParameterArray,
                  nullSensitivityArray,
                  emptyColor,
                  comparisonEnsembleCustomName,
              );

        const referenceEnsemble = existingReferenceEnsemble
            ? existingReferenceEnsemble
            : new RegularEnsemble(
                  referenceEnsembleApiData.ensembleDetails.fieldIdentifier,
                  referenceEnsembleApiData.ensembleDetails.caseUuid,
                  referenceEnsembleApiData.ensembleDetails.caseName,
                  referenceEnsembleApiData.ensembleDetails.name,
                  comparisonEnsembleApiData.ensembleDetails.stratigraphicColumnIdentifier,
                  referenceEnsembleApiData.ensembleDetails.realizations,
                  emptyParameterArray,
                  nullSensitivityArray,
                  emptyColor,
                  referenceEnsembleCustomName,
              );

        outDeltaEnsembleArray.push(
            new DeltaEnsemble(
                comparisonEnsemble,
                referenceEnsemble,
                deltaEnsembleSetting.color,
                deltaEnsembleSetting.customName,
            ),
        );
    }

    return new EnsembleSet(outEnsembleArray, outDeltaEnsembleArray);
}

async function loadEnsembleApiDataMapFromBackend(
    queryClient: QueryClient,
    ensembleIdents: RegularEnsembleIdent[],
    ensembleFingerprintsMap: Map<string, string>,
): Promise<EnsembleIdentStringToEnsembleApiDataMap> {
    console.debug("loadEnsembleIdentStringToApiDataMapFromBackend", ensembleIdents);
    const STALE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);
    const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

    const ensembleDetailsPromiseArray: Promise<EnsembleDetails_api>[] = [];
    const parametersPromiseArray: Promise<EnsembleParameter_api[]>[] = [];
    const sensitivitiesPromiseArray: Promise<EnsembleSensitivity_api[]>[] = [];

    for (const ensembleIdent of ensembleIdents) {
        const caseUuid = ensembleIdent.getCaseUuid();
        const ensembleName = ensembleIdent.getEnsembleName();
        const fingerprint = ensembleFingerprintsMap.get(ensembleIdent.toString());

        const fingerprintHash = fingerprint ? calcFnv1aHash(fingerprint) : undefined;

        const ensembleDetailsPromise = queryClient.fetchQuery({
            ...getEnsembleDetailsOptions({
                query: { zCacheBust: fingerprintHash },
                path: {
                    case_uuid: caseUuid,
                    ensemble_name: ensembleName,
                },
            }),
            gcTime: CACHE_TIME,
            staleTime: STALE_TIME,
        });
        ensembleDetailsPromiseArray.push(ensembleDetailsPromise);

        const parametersPromise = queryClient.fetchQuery({
            ...getParametersOptions({
                query: {
                    case_uuid: caseUuid,
                    ensemble_name: ensembleName,
                    zCacheBust: fingerprintHash,
                },
            }),
            gcTime: CACHE_TIME,
            staleTime: STALE_TIME,
        });
        parametersPromiseArray.push(parametersPromise);

        const sensitivitiesPromise = queryClient.fetchQuery({
            ...getSensitivitiesOptions({
                query: {
                    case_uuid: caseUuid,
                    ensemble_name: ensembleName,
                    zCacheBust: fingerprintHash,
                },
            }),
            gcTime: CACHE_TIME,
            staleTime: STALE_TIME,
        });
        sensitivitiesPromiseArray.push(sensitivitiesPromise);
    }
    console.debug(`Issued ${ensembleDetailsPromiseArray.length} promise(s)`);

    const ensembleDetailsOutcomeArray = await Promise.allSettled(ensembleDetailsPromiseArray);
    const parametersOutcomeArray = await Promise.allSettled(parametersPromiseArray);
    const sensitivitiesOutcomeArray = await Promise.allSettled(sensitivitiesPromiseArray);

    const resMap: EnsembleIdentStringToEnsembleApiDataMap = {};
    for (let i = 0; i < ensembleDetailsOutcomeArray.length; i++) {
        const ensembleDetailsOutcome = ensembleDetailsOutcomeArray[i];
        console.debug(`ensembleDetailsOutcome[${i}]:`, ensembleDetailsOutcome.status);
        if (ensembleDetailsOutcome.status === "rejected") {
            console.error("Error fetching ensemble details, dropping ensemble:", ensembleIdents[i].toString());
            continue;
        }

        const ensembleDetails: EnsembleDetails_api = ensembleDetailsOutcome.value;
        if (
            ensembleDetails.caseUuid !== ensembleIdents[i].getCaseUuid() ||
            ensembleDetails.name !== ensembleIdents[i].getEnsembleName()
        ) {
            console.error("Got mismatched data from backend, dropping ensemble:", ensembleIdents[i].toString());
            continue;
        }

        const parametersOutcome = parametersOutcomeArray[i];
        console.debug(`parametersOutcome[${i}]:`, parametersOutcome.status);
        let parameterArray: EnsembleParameter_api[] = [];
        if (parametersOutcome.status === "fulfilled") {
            parameterArray = parametersOutcome.value;
        }

        const sensitivitiesOutcome = sensitivitiesOutcomeArray[i];
        console.debug(`sensitivitiesOutcome[${i}]:`, sensitivitiesOutcome.status);
        let sensitivityArray: EnsembleSensitivity_api[] = [];
        if (sensitivitiesOutcome.status === "fulfilled") {
            sensitivityArray = sensitivitiesOutcome.value;
        }

        resMap[ensembleIdents[i].toString()] = {
            ensembleDetails: ensembleDetails,
            parameters: parameterArray,
            sensitivities: sensitivityArray,
        };
    }

    return resMap;
}

function buildSensitivityArrFromApiResponse(apiSensitivityArray: EnsembleSensitivity_api[]): Sensitivity[] {
    const retSensitivityArray: Sensitivity[] = [];

    for (const apiSens of apiSensitivityArray) {
        const caseArray: SensitivityCase[] = [];
        for (const apiCase of apiSens.cases) {
            caseArray.push({
                name: apiCase.name,
                realizations: apiCase.realizations,
            });
        }

        const convertSensitivityType = (apiType: SensitivityType_api): SensitivityType => {
            switch (apiType) {
                case SensitivityType_api.MONTECARLO:
                    return SensitivityType.MONTECARLO;
                case SensitivityType_api.SCENARIO:
                    return SensitivityType.SCENARIO;
                default:
                    throw new Error(`Unhandled sensitivity type: ${apiType}`);
            }
        };

        retSensitivityArray.push({
            name: apiSens.name,
            type: convertSensitivityType(apiSens.type),
            cases: caseArray,
        });
    }

    return retSensitivityArray;
}

function buildParameterArrFromApiResponse(apiParameterArray: EnsembleParameter_api[]): Parameter[] {
    const retParameterArray: Parameter[] = [];

    for (const apiPar of apiParameterArray) {
        if (apiPar.is_discrete) {
            const retPar: DiscreteParameter = {
                type: ParameterType.DISCRETE,
                name: apiPar.name,
                groupName: apiPar.group_name ?? null,
                description: apiPar.descriptive_name ?? null,
                isConstant: apiPar.is_constant,
                realizations: apiPar.realizations,
                values: apiPar.values,
            };
            retParameterArray.push(retPar);
        } else {
            const retPar: ContinuousParameter = {
                type: ParameterType.CONTINUOUS,
                name: apiPar.name,
                groupName: apiPar.group_name ?? null,
                description: apiPar.descriptive_name ?? null,
                isConstant: apiPar.is_constant,
                isLogarithmic: apiPar.is_logarithmic,
                realizations: apiPar.realizations,
                values: apiPar.values as number[],
            };
            retParameterArray.push(retPar);
        }
    }

    return retParameterArray;
}
