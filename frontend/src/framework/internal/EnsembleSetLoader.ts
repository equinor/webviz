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
    const outEnsembleArr: Ensemble[] = [];
    for (const ensembleSetting of userEnsembleSettings) {
        const ensembleIdentString = ensembleSetting.ensembleIdent.toString();
        const ensembleApiData = ensembleIdentStringToApiDataMap[ensembleIdentString];
        if (!ensembleApiData) {
            console.error("Error fetching ensemble data, dropping ensemble:", ensembleSetting.ensembleIdent.toString());
            continue;
        }

        const parameterArr = buildParameterArrFromApiResponse(ensembleApiData.parameters);
        const sensitivityArr = buildSensitivityArrFromApiResponse(ensembleApiData.sensitivities);
        outEnsembleArr.push(
            new Ensemble(
                ensembleApiData.ensembleDetails.field_identifier,
                ensembleApiData.ensembleDetails.case_uuid,
                ensembleApiData.ensembleDetails.case_name,
                ensembleApiData.ensembleDetails.name,
                ensembleApiData.ensembleDetails.realizations,
                parameterArr,
                sensitivityArr,
                ensembleSetting.color,
                ensembleSetting.customName
            )
        );
    }

    // Create delta ensembles
    // - Delta ensembles does not support parameters and sensitivities yet
    const outDeltaEnsembleArr: DeltaEnsemble[] = [];
    const emptyParameterArr: Parameter[] = [];
    const nullSensitiveArr = null;
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
            emptyParameterArr,
            nullSensitiveArr,
            emptyColor,
            firstEnsembleCustomName
        );

        const secondEnsemble = new Ensemble(
            secondEnsembleApiData.ensembleDetails.field_identifier,
            secondEnsembleApiData.ensembleDetails.case_uuid,
            secondEnsembleApiData.ensembleDetails.case_name,
            secondEnsembleApiData.ensembleDetails.name,
            secondEnsembleApiData.ensembleDetails.realizations,
            emptyParameterArr,
            nullSensitiveArr,
            emptyColor,
            secondEnsembleCustomName
        );

        outDeltaEnsembleArr.push(
            new DeltaEnsemble(
                firstEnsemble,
                secondEnsemble,
                deltaEnsembleSetting.color,
                deltaEnsembleSetting.customName
            )
        );
    }

    return new EnsembleSet(outEnsembleArr, outDeltaEnsembleArr);
}

async function loadEnsembleIdentStringToApiDataMapFromBackend(
    queryClient: QueryClient,
    ensembleIdents: EnsembleIdent[]
): Promise<EnsembleIdentStringToApiDataMap> {
    console.debug("loadEnsembleIdentStringToApiDataMapFromBackend", ensembleIdents);

    const STALE_TIME = 5 * 60 * 1000;
    const CACHE_TIME = 5 * 60 * 1000;

    const ensembleDetailsPromiseArr: Promise<EnsembleDetails_api>[] = [];
    const parametersPromiseArr: Promise<EnsembleParameter_api[]>[] = [];
    const sensitivitiesPromiseArr: Promise<EnsembleSensitivity_api[]>[] = [];

    for (const ensembleIdent of ensembleIdents) {
        const caseUuid = ensembleIdent.getCaseUuid();
        const ensembleName = ensembleIdent.getEnsembleName();

        const ensembleDetailsPromise = queryClient.fetchQuery({
            queryKey: ["getEnsembleDetails", caseUuid, ensembleName],
            queryFn: () => apiService.explore.getEnsembleDetails(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        ensembleDetailsPromiseArr.push(ensembleDetailsPromise);

        const parametersPromise = queryClient.fetchQuery({
            queryKey: ["getParameters", caseUuid, ensembleName],
            queryFn: () => apiService.parameters.getParameters(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        parametersPromiseArr.push(parametersPromise);

        const sensitivitiesPromise = queryClient.fetchQuery({
            queryKey: ["getSensitivities", caseUuid, ensembleName],
            queryFn: () => apiService.parameters.getSensitivities(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        sensitivitiesPromiseArr.push(sensitivitiesPromise);
    }
    console.debug(`Issued ${ensembleDetailsPromiseArr.length} promise(s)`);

    const ensembleDetailsOutcomeArr = await Promise.allSettled(ensembleDetailsPromiseArr);
    const parametersOutcomeArr = await Promise.allSettled(parametersPromiseArr);
    const sensitivitiesOutcomeArr = await Promise.allSettled(sensitivitiesPromiseArr);

    const resMap: EnsembleIdentStringToApiDataMap = {};
    for (let i = 0; i < ensembleDetailsOutcomeArr.length; i++) {
        const ensembleDetailsOutcome = ensembleDetailsOutcomeArr[i];
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

        const parametersOutcome = parametersOutcomeArr[i];
        console.debug(`parametersOutcome[${i}]:`, parametersOutcome.status);
        let parameterArr: EnsembleParameter_api[] = [];
        if (parametersOutcome.status === "fulfilled") {
            parameterArr = parametersOutcome.value;
        }

        const sensitivitiesOutcome = sensitivitiesOutcomeArr[i];
        console.debug(`sensitivitiesOutcome[${i}]:`, sensitivitiesOutcome.status);
        let sensitivityArr: EnsembleSensitivity_api[] = [];
        if (sensitivitiesOutcome.status === "fulfilled") {
            sensitivityArr = sensitivitiesOutcome.value;
        }

        resMap[ensembleIdents[i].toString()] = {
            ensembleDetails: ensembleDetails,
            parameters: parameterArr,
            sensitivities: sensitivityArr,
        };
    }

    return resMap;
}

function buildSensitivityArrFromApiResponse(apiSensitivityArr: EnsembleSensitivity_api[]): Sensitivity[] {
    const retSensitivityArr: Sensitivity[] = [];

    for (const apiSens of apiSensitivityArr) {
        const caseArr: SensitivityCase[] = [];
        for (const apiCase of apiSens.cases) {
            caseArr.push({
                name: apiCase.name,
                realizations: apiCase.realizations,
            });
        }

        retSensitivityArr.push({
            name: apiSens.name,
            type: apiSens.type,
            cases: caseArr,
        });
    }

    return retSensitivityArr;
}

function buildParameterArrFromApiResponse(apiParameterArr: EnsembleParameter_api[]): Parameter[] {
    const retParameterArr: Parameter[] = [];

    for (const apiPar of apiParameterArr) {
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
            retParameterArr.push(retPar);
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
            retParameterArr.push(retPar);
        }
    }

    return retParameterArr;
}
