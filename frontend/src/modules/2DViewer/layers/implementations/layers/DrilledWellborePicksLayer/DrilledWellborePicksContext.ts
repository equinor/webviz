import { WellboreHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";

import { DrilledWellborePicksSettings } from "./types";

import { DefineDependenciesArgs, FetchDataFunctionResult, SettingsContext } from "../../../interfaces";
import { DrilledWellbores } from "../../settings/DrilledWellbores";
import { Ensemble } from "../../settings/Ensemble";
import { SurfaceName } from "../../settings/SurfaceName";

export class DrilledWellborePicksContext implements SettingsContext<DrilledWellborePicksSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellborePicksSettings>;
    private _wellboreHeadersCache: WellboreHeader_api[] | null = null;
    private _pickIdentifierCache: string[] | null = null;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            DrilledWellborePicksSettings,
            keyof DrilledWellborePicksSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new Ensemble(),
            [SettingType.SMDA_WELLBORE_HEADERS]: new DrilledWellbores(),
            [SettingType.SURFACE_NAME]: new SurfaceName(),
        });
    }

    getDelegate(): SettingsContextDelegate<DrilledWellborePicksSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    async fetchData(
        oldValues: Partial<DrilledWellborePicksSettings>,
        newValues: Partial<DrilledWellborePicksSettings>
    ): Promise<FetchDataFunctionResult> {
        if (
            isEqual(oldValues[SettingType.ENSEMBLE], newValues[SettingType.ENSEMBLE]) &&
            newValues[SettingType.ENSEMBLE] !== null
        ) {
            return FetchDataFunctionResult.NO_CHANGE;
        }

        const queryClient = this.getDelegate().getLayerManager().getQueryClient();
        const settings = this.getDelegate().getSettings();
        const workbenchSession = this.getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();

        this.getDelegate().setAvailableValues(
            SettingType.ENSEMBLE,
            ensembleSet.getEnsembleArr().map((ensemble) => ensemble.getIdent())
        );

        const currentEnsembleIdent = newValues[SettingType.ENSEMBLE];

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._wellboreHeadersCache = null;

            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setIsLoading(true);
            settings[SettingType.SURFACE_NAME].getDelegate().setIsLoading(true);

            let fieldIdentifier: string | null = null;
            let stratColumnIdentiier: string | null = null;
            if (currentEnsembleIdent) {
                const ensemble = ensembleSet.findEnsemble(currentEnsembleIdent);
                if (ensemble) {
                    fieldIdentifier = ensemble.getFieldIdentifier();
                    stratColumnIdentiier = ensemble.getStratigraphicColumnIdentifier();
                }
            }

            const wellboreHeadersPromise = queryClient.fetchQuery({
                queryKey: ["getDrilledWellboreHeaders", fieldIdentifier ?? ""],
                queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldIdentifier ?? ""),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });

            const pickStratigraphyPromise = queryClient.fetchQuery({
                queryKey: ["getPickStratigraphy", fieldIdentifier ?? "", stratColumnIdentiier ?? ""],
                queryFn: () =>
                    apiService.well.getWellborePickIdentifiers(fieldIdentifier ?? "", stratColumnIdentiier ?? ""),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });

            try {
                const [wellboreHeaders, pickIdentifiers] = await Promise.all([
                    wellboreHeadersPromise,
                    pickStratigraphyPromise,
                ]);

                this._wellboreHeadersCache = wellboreHeaders;
                this._pickIdentifierCache = pickIdentifiers;
            } catch (error) {
                settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setIsLoading(false);
                settings[SettingType.SURFACE_NAME].getDelegate().setIsLoading(false);
                return FetchDataFunctionResult.ERROR;
            }
            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setIsLoading(false);
            settings[SettingType.SURFACE_NAME].getDelegate().setIsLoading(false);
        }

        if (!this._wellboreHeadersCache || !this._pickIdentifierCache) {
            return FetchDataFunctionResult.IN_PROGRESS;
        }

        const availableWellboreHeaders: WellboreHeader_api[] = this._wellboreHeadersCache;
        this._contextDelegate.setAvailableValues(SettingType.SMDA_WELLBORE_HEADERS, availableWellboreHeaders);

        const availablePickIdentifiers: string[] = this._pickIdentifierCache;
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_NAME, availablePickIdentifiers);

        return FetchDataFunctionResult.SUCCESS;
    }

    areCurrentSettingsValid(): boolean {
        const settings = this.getDelegate().getSettings();
        return (
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue().length > 0 &&
            settings[SettingType.SURFACE_NAME].getDelegate().getValue() !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellborePicksSettings>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembleSet = workbenchSession.getEnsembleSet();

            const ensembleIdents = ensembleSet
                .getEnsembleArr()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const fetchedData = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const fieldIdentifier = ensemble.getFieldIdentifier();
            const stratColumnIdentifier = ensemble.getStratigraphicColumnIdentifier();

            const wellboreHeadersPromise = queryClient.fetchQuery({
                queryKey: ["getDrilledWellboreHeaders", fieldIdentifier ?? ""],
                queryFn: () => {
                    const promise = apiService.well.getDrilledWellboreHeaders(fieldIdentifier ?? "");
                    abortSignal.addEventListener("abort", () => promise.cancel());
                    return promise;
                },
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });

            const pickStratigraphyPromise = queryClient.fetchQuery({
                queryKey: ["getPickStratigraphy", fieldIdentifier ?? "", stratColumnIdentifier ?? ""],
                queryFn: () => {
                    const promise = apiService.well.getWellborePickIdentifiers(
                        fieldIdentifier ?? "",
                        stratColumnIdentifier ?? ""
                    );
                    abortSignal.addEventListener("abort", () => promise.cancel());
                    return promise;
                },
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });

            try {
                const [wellboreHeaders, pickIdentifiers] = await Promise.all([
                    wellboreHeadersPromise,
                    pickStratigraphyPromise,
                ]);

                return { wellboreHeaders, pickIdentifiers };
            } catch (error) {
                return null;
            }
        });

        availableSettingsUpdater(SettingType.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const fetchedDataValue = getHelperDependency(fetchedData);

            if (!fetchedDataValue) {
                return [];
            }

            const wellboreHeaders: WellboreHeader_api[] = fetchedDataValue.wellboreHeaders;
            return wellboreHeaders;
        });

        availableSettingsUpdater(SettingType.SURFACE_NAME, ({ getHelperDependency }) => {
            const fetchedDataValue = getHelperDependency(fetchedData);

            if (!fetchedDataValue) {
                return [];
            }

            const pickIdentifiers: string[] = fetchedDataValue.pickIdentifiers;
            return pickIdentifiers;
        });
    }
}
