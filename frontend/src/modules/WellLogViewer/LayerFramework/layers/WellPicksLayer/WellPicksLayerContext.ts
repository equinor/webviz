import {
    WellborePick_api,
    getStratigraphicUnitsForStratColumnOptions,
    getWellborePicksInStratColumnOptions,
    getWellboreStratigraphicColumnsOptions,
} from "@api";
import { SettingsContextDelegate } from "@modules/_shared/LayerFramework/delegates/SettingsContextDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { DefineDependenciesArgs, SettingsContext } from "@modules/_shared/LayerFramework/interfaces";
import { ObjectSelectionSetting } from "@modules/_shared/LayerFramework/settings/implementations/ObjectSelectionSetting";
import { SingleStringChoiceSetting } from "@modules/_shared/LayerFramework/settings/implementations/SingleStringChoiceSetting";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import _ from "lodash";

import { WellPicksLayerSettings } from "./types";

export class WellPicksSettingsContext implements SettingsContext<WellPicksLayerSettings> {
    private _contextDelegate: SettingsContextDelegate<WellPicksLayerSettings>;

    constructor(layerManager: LayerManager) {
        const settings = {
            [SettingType.STRAT_COLUMN]: new SingleStringChoiceSetting("Stratigraphic Column", SettingType.STRAT_COLUMN),
            [SettingType.SMDA_INTERPRETER]: new SingleStringChoiceSetting("Interpreter", SettingType.SMDA_INTERPRETER),
            [SettingType.WELL_PICKS]: new ObjectSelectionSetting<WellborePick_api>(
                "Well picks",
                SettingType.WELL_PICKS,
                "pickIdentifier",
                "pickIdentifier"
            ),
        };

        this._contextDelegate = new SettingsContextDelegate<WellPicksLayerSettings>(this, layerManager, settings);
    }

    getDelegate() {
        return this._contextDelegate;
    }

    // ? This feels unintivite? I find it strange to define what is essentially derived- and query-atoms with these methods.  Maybe its just the naming?
    // availableSettingsUpdater -> getSettingOptions ?
    // Feels a little like re-inventing the wheel...
    defineDependencies(args: DefineDependenciesArgs<WellPicksLayerSettings>): void {
        const { helperDependency, availableSettingsUpdater, queryClient } = args;

        const columnOptions = helperDependency(({ getGlobalSetting, abortSignal }) => {
            const wellboreUuid = getGlobalSetting("wellboreUuid");

            if (!wellboreUuid) return null;

            return queryClient.fetchQuery({
                ...getWellboreStratigraphicColumnsOptions({
                    query: { wellbore_uuid: wellboreUuid },
                    signal: abortSignal,
                }),
            });
        });

        const wellPickOptions = helperDependency(({ getGlobalSetting, getLocalSetting, abortSignal }) => {
            const wellboreUuid = getGlobalSetting("wellboreUuid");
            const stratColumn = getLocalSetting(SettingType.STRAT_COLUMN);

            if (!wellboreUuid || !stratColumn) return null;
            return queryClient.fetchQuery({
                ...getWellborePicksInStratColumnOptions({
                    query: { wellbore_uuid: wellboreUuid, strat_column: stratColumn },
                    signal: abortSignal,
                }),
            });
        });

        // ! unused for now
        const wellPickUnits = helperDependency(({ getLocalSetting, abortSignal }) => {
            const stratColumn = getLocalSetting(SettingType.STRAT_COLUMN);

            if (!stratColumn) return null;
            return queryClient.fetchQuery({
                ...getStratigraphicUnitsForStratColumnOptions({
                    query: { strat_column: stratColumn },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(SettingType.STRAT_COLUMN, ({ getHelperDependency }) => {
            const columns = getHelperDependency(columnOptions);

            if (!columns) return [];
            return _.map(columns, "identifier");
        });

        availableSettingsUpdater(SettingType.SMDA_INTERPRETER, ({ getHelperDependency }) => {
            const wellPicks = getHelperDependency(wellPickOptions);

            if (!wellPicks) return [];

            const picksByInterpreter = _.groupBy(wellPicks, "interpreter");

            return _.keys(picksByInterpreter);
        });

        availableSettingsUpdater(SettingType.WELL_PICKS, ({ getLocalSetting, getHelperDependency }) => {
            const wellPicks = getHelperDependency(wellPickOptions);
            const pickUnits = getHelperDependency(wellPickUnits);
            const interpreter = getLocalSetting(SettingType.SMDA_INTERPRETER);

            if (!wellPicks || !interpreter || !pickUnits) return [];

            return _.filter(wellPicks, ["interpreter", interpreter]);

            // TODO: Maybe merge the unit ones together?
            // const filteredPicks = _.filter(wellPicks, ["interpreter", interpreter]);

            // // @ts-expect-error - Complains about "lithology-type" but that field actually doesn't matter
            // const { nonUnitPicks, unitPicks } = transformFormationData(filteredPicks, pickUnits);

            // console.log(nonUnitPicks, unitPicks);

            // if (nonUnitPicks.length) {
            //     // ? Is this relevant for users, or? Should we propagate this to the ui?
            //     console.warn(`Found ${nonUnitPicks.length} non-unit picks!`, nonUnitPicks);
            // }

            // return unitPicks;
        });
    }

    areCurrentSettingsValid?: ((settings: WellPicksLayerSettings) => boolean) | undefined;
}
