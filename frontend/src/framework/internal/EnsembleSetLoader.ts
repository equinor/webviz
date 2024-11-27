import { EnsembleDetails_api, EnsembleParameter_api, EnsembleSensitivity_api } from "@api";
import { apiService } from "@framework/ApiService";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { UserDeltaEnsembleSetting, UserEnsembleSetting } from "@framework/Workbench";
import { QueryClient } from "@tanstack/react-query";

import { Ensemble } from "../Ensemble";
import { EnsembleIdent } from "../EnsembleIdent";
import { ContinuousParameter, DiscreteParameter, Parameter, ParameterType } from "../EnsembleParameters";
import { Sensitivity, SensitivityCase } from "../EnsembleSensitivities";
import { EnsembleSet } from "../EnsembleSet";

type EnsembleApiData = {
    ensembleDetails: EnsembleDetails_api;
    parameters: EnsembleParameter_api[];
    sensitivities: EnsembleSensitivity_api[];
};
type EnsembleIdentStringToApiDataMap = {
    [ensembleIdentString: string]: EnsembleApiData;
};

export async function loadMetadataFromBackendAndCreateEnsembleSet(
    queryClient: QueryClient,
    userEnsembleSettings: UserEnsembleSetting[],
    userDeltaEnsembleSettings: UserDeltaEnsembleSetting[]
): Promise<EnsembleSet> {
    // Get ensemble idents to load
    const ensembleIdentsToLoad: EnsembleIdent[] = userEnsembleSettings.map((setting) => setting.ensembleIdent);
    for (const deltaEnsembleSetting of userDeltaEnsembleSettings) {
        if (!ensembleIdentsToLoad.includes(deltaEnsembleSetting.firstEnsembleIdent)) {
            ensembleIdentsToLoad.push(deltaEnsembleSetting.firstEnsembleIdent);
        }
        if (!ensembleIdentsToLoad.includes(deltaEnsembleSetting.secondEnsembleIdent)) {
            ensembleIdentsToLoad.push(deltaEnsembleSetting.secondEnsembleIdent);
        }
    }

    // Fetch from back-end
    const ensembleIdentStringToApiDataMap = await loadEnsembleIdentStringToApiDataMapFromBackend(
        queryClient,
        ensembleIdentsToLoad
    );

    // Create regular ensembles
    const outEnsembleArray: Ensemble[] = [];
    for (const ensembleSetting of userEnsembleSettings) {
        const ensembleIdentString = ensembleSetting.ensembleIdent.toString();
        const ensembleApiData = ensembleIdentStringToApiDataMap[ensembleIdentString];
        if (!ensembleApiData) {
            console.error("Error fetching ensemble data, dropping ensemble:", ensembleSetting.ensembleIdent.toString());
            continue;
        }

        const parameterArray = buildParameterArrFromApiResponse(ensembleApiData.parameters);
        const sensitivityArray = buildSensitivityArrFromApiResponse(ensembleApiData.sensitivities);
        outEnsembleArray.push(
            new Ensemble(
                ensembleApiData.ensembleDetails.field_identifier,
                ensembleApiData.ensembleDetails.case_uuid,
                ensembleApiData.ensembleDetails.case_name,
                ensembleApiData.ensembleDetails.name,
                ensembleApiData.ensembleDetails.realizations,
                parameterArray,
                sensitivityArray,
                ensembleSetting.color,
                ensembleSetting.customName
            )
        );
    }

    // Create delta ensembles
    // - Delta ensembles does not support parameters and sensitivities yet
    const outDeltaEnsembleArray: DeltaEnsemble[] = [];
    const emptyParameterArray: Parameter[] = [];
    const nullSensitiveArray = null;
    const emptyColor = "";
    for (const deltaEnsembleSetting of userDeltaEnsembleSettings) {
        const firstEnsembleIdentString = deltaEnsembleSetting.firstEnsembleIdent.toString();
        const secondEnsembleIdentString = deltaEnsembleSetting.secondEnsembleIdent.toString();

        const firstEnsembleApiData = ensembleIdentStringToApiDataMap[firstEnsembleIdentString];
        const secondEnsembleApiData = ensembleIdentStringToApiDataMap[secondEnsembleIdentString];
        if (!firstEnsembleApiData || !secondEnsembleApiData) {
            console.error(
                "Error fetching delta ensemble data, dropping delta ensemble:",
                deltaEnsembleSetting.customName ?? `${firstEnsembleIdentString} - ${secondEnsembleIdentString}`
            );
            continue;
        }

        const firstEnsembleCustomName =
            userEnsembleSettings.find((elm) => elm.ensembleIdent.toString() === firstEnsembleIdentString)?.customName ??
            null;
        const secondEnsembleCustomName =
            userEnsembleSettings.find((elm) => elm.ensembleIdent.toString() === secondEnsembleIdentString)
                ?.customName ?? null;

        const firstEnsemble = new Ensemble(
            firstEnsembleApiData.ensembleDetails.field_identifier,
            firstEnsembleApiData.ensembleDetails.case_uuid,
            firstEnsembleApiData.ensembleDetails.case_name,
            firstEnsembleApiData.ensembleDetails.name,
            firstEnsembleApiData.ensembleDetails.realizations,
            emptyParameterArray,
            nullSensitiveArray,
            emptyColor,
            firstEnsembleCustomName
        );

        const secondEnsemble = new Ensemble(
            secondEnsembleApiData.ensembleDetails.field_identifier,
            secondEnsembleApiData.ensembleDetails.case_uuid,
            secondEnsembleApiData.ensembleDetails.case_name,
            secondEnsembleApiData.ensembleDetails.name,
            secondEnsembleApiData.ensembleDetails.realizations,
            emptyParameterArray,
            nullSensitiveArray,
            emptyColor,
            secondEnsembleCustomName
        );

        outDeltaEnsembleArray.push(
            new DeltaEnsemble(
                firstEnsemble,
                secondEnsemble,
                deltaEnsembleSetting.color,
                deltaEnsembleSetting.customName
            )
        );
    }

    return new EnsembleSet(outEnsembleArray, outDeltaEnsembleArray);
}

async function loadEnsembleIdentStringToApiDataMapFromBackend(
    queryClient: QueryClient,
    ensembleIdents: EnsembleIdent[]
): Promise<EnsembleIdentStringToApiDataMap> {
    console.debug("loadEnsembleIdentStringToApiDataMapFromBackend", ensembleIdents);

    const STALE_TIME = 5 * 60 * 1000;
    const CACHE_TIME = 5 * 60 * 1000;

    const ensembleDetailsPromiseArray: Promise<EnsembleDetails_api>[] = [];
    const parametersPromiseArray: Promise<EnsembleParameter_api[]>[] = [];
    const sensitivitiesPromiseArray: Promise<EnsembleSensitivity_api[]>[] = [];

    for (const ensembleIdent of ensembleIdents) {
        const caseUuid = ensembleIdent.getCaseUuid();
        const ensembleName = ensembleIdent.getEnsembleName();

        const ensembleDetailsPromise = queryClient.fetchQuery({
            queryKey: ["getEnsembleDetails", caseUuid, ensembleName],
            queryFn: () => apiService.explore.getEnsembleDetails(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        ensembleDetailsPromiseArray.push(ensembleDetailsPromise);

        const parametersPromise = queryClient.fetchQuery({
            queryKey: ["getParameters", caseUuid, ensembleName],
            queryFn: () => apiService.parameters.getParameters(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        parametersPromiseArray.push(parametersPromise);

        const sensitivitiesPromise = queryClient.fetchQuery({
            queryKey: ["getSensitivities", caseUuid, ensembleName],
            queryFn: () => apiService.parameters.getSensitivities(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        sensitivitiesPromiseArray.push(sensitivitiesPromise);
    }
    console.debug(`Issued ${ensembleDetailsPromiseArray.length} promise(s)`);

    const ensembleDetailsOutcomeArray = await Promise.allSettled(ensembleDetailsPromiseArray);
    const parametersOutcomeArray = await Promise.allSettled(parametersPromiseArray);
    const sensitivitiesOutcomeArray = await Promise.allSettled(sensitivitiesPromiseArray);

    const resMap: EnsembleIdentStringToApiDataMap = {};
    for (let i = 0; i < ensembleDetailsOutcomeArray.length; i++) {
        const ensembleDetailsOutcome = ensembleDetailsOutcomeArray[i];
        console.debug(`ensembleDetailsOutcome[${i}]:`, ensembleDetailsOutcome.status);
        if (ensembleDetailsOutcome.status === "rejected") {
            console.error("Error fetching ensemble details, dropping ensemble:", ensembleIdents[i].toString());
            continue;
        }

        const ensembleDetails: EnsembleDetails_api = ensembleDetailsOutcome.value;
        if (
            ensembleDetails.case_uuid !== ensembleIdents[i].getCaseUuid() ||
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

        retSensitivityArray.push({
            name: apiSens.name,
            type: apiSens.type,
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
                groupName: apiPar.group_name,
                description: apiPar.descriptive_name,
                isConstant: apiPar.is_constant,
                realizations: apiPar.realizations,
                values: apiPar.values,
            };
            retParameterArray.push(retPar);
        } else {
            const retPar: ContinuousParameter = {
                type: ParameterType.CONTINUOUS,
                name: apiPar.name,
                groupName: apiPar.group_name,
                description: apiPar.descriptive_name,
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
