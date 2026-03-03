import type { QueryClient } from "@tanstack/react-query";

import type {
    EnsembleDetails_api,
    EnsembleParameter_api,
    EnsembleParametersAndSensitivities_api,
    EnsembleSensitivity_api,
} from "@api";
import { SensitivityType_api, getEnsembleDetailsOptions, getParametersAndSensitivitiesOptions } from "@api";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { tanstackDebugTimeOverride } from "@framework/utils/debug";
import { createDeltaEnsembleDisplayName, createRegularEnsembleDisplayName } from "@framework/utils/ensembleUiHelpers";
import { calcFnv1aHash } from "@lib/utils/hashUtils";

import type { ContinuousParameter, DiscreteParameter, Parameter } from "../EnsembleParameters";
import { ParameterType } from "../EnsembleParameters";
import type { Sensitivity, SensitivityCase } from "../EnsembleSensitivities";
import { SensitivityType } from "../EnsembleSensitivities";
import { EnsembleSet } from "../EnsembleSet";
import { RegularEnsemble } from "../RegularEnsemble";
import type { RegularEnsembleIdent } from "../RegularEnsembleIdent";

import { fetchLatestEnsembleFingerprints } from "./utils/fetchEnsembleFingerprints";

type EnsembleApiData = {
    ensembleDetails: EnsembleDetails_api;
    parameters: EnsembleParameter_api[];
    sensitivities: EnsembleSensitivity_api[];
};
type EnsembleIdentStringToEnsembleApiDataMap = {
    [ensembleIdentString: string]: EnsembleApiData;
};

export type EnsembleLoadingErrorInfoMap = {
    [ensembleIdentString: string]: { errorMessage: string; displayName: string };
};

export type UserEnsembleSetting = {
    ensembleIdent: RegularEnsembleIdent;
    customName: string | null;
    caseName?: string; // Optional for backward compat serialization – awaiting schema versioning
    color: string;
};

export type UserDeltaEnsembleSetting = {
    comparisonEnsembleIdent: RegularEnsembleIdent;
    referenceEnsembleIdent: RegularEnsembleIdent;
    comparisonEnsembleCaseName?: string; // Optional for backward compat serialization – awaiting schema versioning
    referenceEnsembleCaseName?: string; // Optional for backward compat serialization – awaiting schema versioning
    customName: string | null;
    color: string;
};

export async function loadMetadataFromBackendAndCreateEnsembleSet(
    queryClient: QueryClient,
    userEnsembleSettings: UserEnsembleSetting[],
    userDeltaEnsembleSettings: UserDeltaEnsembleSetting[],
): Promise<{
    ensembleSet: EnsembleSet;
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
}> {
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
    EnsembleFingerprintStore.update(ensembleFingerprintsMap);

    // Fetch from back-end
    const {
        ensembleIdentStringToEnsembleApiDataMap: ensembleApiDataMap,
        ensembleLoadingErrorInfoMap: ensembleLoadingErrorInfoMapFromApiDataLoad,
    } = await loadEnsembleApiDataMapFromBackend(queryClient, ensembleIdentsToLoad, ensembleFingerprintsMap);

    const ensembleLoadingErrorInfoMap = ensembleLoadingErrorInfoMapFromApiDataLoad;

    // Create regular ensembles
    const outEnsembleArray: RegularEnsemble[] = [];
    for (const ensembleSetting of userEnsembleSettings) {
        const ensembleIdentString = ensembleSetting.ensembleIdent.toString();
        const ensembleApiData = ensembleApiDataMap[ensembleIdentString];
        if (!ensembleApiData) {
            const displayName = createRegularEnsembleDisplayName(
                ensembleSetting.ensembleIdent,
                ensembleSetting.caseName,
                ensembleSetting.customName ?? undefined,
            );
            const existingErrorInfo = ensembleLoadingErrorInfoMap[ensembleIdentString];
            if (existingErrorInfo) {
                existingErrorInfo.displayName = displayName;
            } else {
                const errorMessage = "Error fetching ensemble data, dropping ensemble.";
                ensembleLoadingErrorInfoMap[ensembleIdentString] = {
                    errorMessage: errorMessage,
                    displayName: displayName,
                };
                console.error(errorMessage, ensembleSetting.ensembleIdent.toString());
            }
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
            const deltaEnsembleIdent = new DeltaEnsembleIdent(
                deltaEnsembleSetting.comparisonEnsembleIdent,
                deltaEnsembleSetting.referenceEnsembleIdent,
            );
            const errorMessage = "Error fetching comparison or reference ensemble data, dropping delta ensemble.";
            console.error(
                "Dropping delta ensemble:",
                deltaEnsembleSetting.customName ?? deltaEnsembleIdent.toString(),
                errorMessage,
            );
            ensembleLoadingErrorInfoMap[deltaEnsembleIdent.toString()] = {
                errorMessage: errorMessage,
                displayName: createDeltaEnsembleDisplayName(
                    deltaEnsembleSetting.comparisonEnsembleIdent,
                    deltaEnsembleSetting.referenceEnsembleIdent,
                    deltaEnsembleSetting.comparisonEnsembleCaseName,
                    deltaEnsembleSetting.referenceEnsembleCaseName,
                    deltaEnsembleSetting.customName ?? undefined,
                ),
            };
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

    return {
        ensembleSet: new EnsembleSet(outEnsembleArray, outDeltaEnsembleArray),
        ensembleLoadingErrorInfoMap: ensembleLoadingErrorInfoMap,
    };
}

async function loadEnsembleApiDataMapFromBackend(
    queryClient: QueryClient,
    ensembleIdents: RegularEnsembleIdent[],
    ensembleFingerprintsMap: Map<string, string>,
): Promise<{
    ensembleIdentStringToEnsembleApiDataMap: EnsembleIdentStringToEnsembleApiDataMap;
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
}> {
    console.debug("loadEnsembleIdentStringToApiDataMapFromBackend", ensembleIdents);
    const STALE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);
    const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

    const ensembleDetailsPromiseArray: Promise<EnsembleDetails_api>[] = [];
    const parametersAndSensitivitiesPromiseArray: Promise<EnsembleParametersAndSensitivities_api>[] = [];

    const ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap = {};

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

        const parametersAndSensitivitiesPromise = queryClient.fetchQuery({
            ...getParametersAndSensitivitiesOptions({
                query: {
                    case_uuid: caseUuid,
                    ensemble_name: ensembleName,
                    zCacheBust: fingerprintHash,
                },
            }),
            gcTime: CACHE_TIME,
            staleTime: STALE_TIME,
        });
        parametersAndSensitivitiesPromiseArray.push(parametersAndSensitivitiesPromise);
    }
    console.debug(`Issued ${ensembleDetailsPromiseArray.length} promise(s)`);

    const ensembleDetailsOutcomeArray = await Promise.allSettled(ensembleDetailsPromiseArray);
    const parametersAndSensitivitiesOutcomeArray = await Promise.allSettled(parametersAndSensitivitiesPromiseArray);

    const resMap: EnsembleIdentStringToEnsembleApiDataMap = {};
    for (let i = 0; i < ensembleDetailsOutcomeArray.length; i++) {
        const ensembleIdentString = ensembleIdents[i].toString();

        // Handle rejected ensemble details outcome
        const ensembleDetailsOutcome = ensembleDetailsOutcomeArray[i];
        console.debug(`ensembleDetailsOutcome[${i}]:`, ensembleDetailsOutcome.status);
        if (ensembleDetailsOutcome.status === "rejected") {
            const errorMessage = "Error fetching ensemble details, dropping ensemble.";
            console.error(errorMessage, ensembleIdentString);
            ensembleLoadingErrorInfoMap[ensembleIdentString] = {
                errorMessage: errorMessage,
                displayName: createRegularEnsembleDisplayName(ensembleIdents[i]),
            };
            continue;
        }

        // Handle ensemble details and validate
        const ensembleDetails: EnsembleDetails_api = ensembleDetailsOutcome.value;
        if (
            ensembleDetails.caseUuid !== ensembleIdents[i].getCaseUuid() ||
            ensembleDetails.name !== ensembleIdents[i].getEnsembleName()
        ) {
            const errorMessage = "Mismatched ensemble details data from backend, dropping ensemble.";
            console.error(errorMessage, ensembleIdentString);
            ensembleLoadingErrorInfoMap[ensembleIdentString] = {
                errorMessage: errorMessage,
                displayName: createRegularEnsembleDisplayName(ensembleIdents[i]),
            };
            continue;
        }

        // Handle rejected parameters and sensitivities outcome
        const parametersAndSensitivitiesOutcome = parametersAndSensitivitiesOutcomeArray[i];
        console.debug(`parametersAndSensitivitiesOutcome[${i}]:`, parametersAndSensitivitiesOutcome.status);
        if (parametersAndSensitivitiesOutcome.status === "rejected") {
            const errorMessage = "Error fetching ensemble parameters and sensitivities, dropping ensemble.";
            console.error(errorMessage, ensembleIdentString);
            ensembleLoadingErrorInfoMap[ensembleIdentString] = {
                errorMessage: errorMessage,
                displayName: createRegularEnsembleDisplayName(ensembleIdents[i]),
            };
            continue;
        }

        // Handle parameters and sensitivities and validate (Only validate parameters, as sensitivities can be empty)
        const parametersAndSensitivities = parametersAndSensitivitiesOutcome.value;
        const parameterArray = parametersAndSensitivities.parameters;
        const sensitivityArray = parametersAndSensitivities.sensitivities;
        if (parameterArray.length === 0) {
            const errorMessage = "No parameters found for ensemble, dropping ensemble.";
            console.error(errorMessage, ensembleIdentString);
            ensembleLoadingErrorInfoMap[ensembleIdentString] = {
                errorMessage: errorMessage,
                displayName: createRegularEnsembleDisplayName(ensembleIdents[i]),
            };
            continue;
        }

        resMap[ensembleIdentString] = {
            ensembleDetails: ensembleDetails,
            parameters: parameterArray,
            sensitivities: sensitivityArray,
        };
    }

    return {
        ensembleIdentStringToEnsembleApiDataMap: resMap,
        ensembleLoadingErrorInfoMap: ensembleLoadingErrorInfoMap,
    };
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
        if (apiPar.isDiscrete) {
            const retPar: DiscreteParameter = {
                type: ParameterType.DISCRETE,
                name: apiPar.name,
                groupName: apiPar.groupName ?? null,
                description: apiPar.descriptiveName ?? null,
                isConstant: apiPar.isConstant,
                realizations: apiPar.realizations,
                values: apiPar.values,
            };
            retParameterArray.push(retPar);
        } else {
            const retPar: ContinuousParameter = {
                type: ParameterType.CONTINUOUS,
                name: apiPar.name,
                groupName: apiPar.groupName ?? null,
                description: apiPar.descriptiveName ?? null,
                isConstant: apiPar.isConstant,
                isLogarithmic: apiPar.isLogarithmic,
                realizations: apiPar.realizations,
                values: apiPar.values as number[],
            };
            retParameterArray.push(retPar);
        }
    }

    return retParameterArray;
}
