import { useEffect, useState } from "react";

import { QueryClient } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "@framework/GlobalAtoms";
import { ApplyInterfaceEffectsToView } from "@framework/internal/components/ApplyInterfaceEffects/applyInterfaceEffects";
import type { Module, ModuleSettingsProps, ModuleViewProps } from "@framework/Module";
import { ModuleInstance, ModuleInstanceTopic } from "@framework/ModuleInstance";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import type { RealizationFilterSet } from "@framework/RealizationFilterSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { WorkbenchSessionTopic, type WorkbenchSession } from "@framework/WorkbenchSession";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { channelDefs } from "@modules/EconomicScreening/channelDefs";
import { settingsToViewInterfaceInitialization, type Interfaces } from "@modules/EconomicScreening/interfaces";
import "@modules/EconomicScreening/loadModule";
import { serializeStateFunctions, type SerializedState } from "@modules/EconomicScreening/persistence";
import { MODULE_NAME } from "@modules/EconomicScreening/registerModule";
import {
    cashFlowProfileTypeAtom,
    costProfileAtom,
    currencyAtom,
    discountRatePercentAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
    resultModeAtom,
    selectedMeasureAtom,
} from "@modules/EconomicScreening/settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentAtom,
    selectedRealizationAtom,
} from "@modules/EconomicScreening/settings/atoms/persistableFixableAtoms";
import type {
    CashFlowProfileType,
    CostProfileEntry,
    EarlyValueConfiguration,
    EconomicMeasure,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";
import { Currency, GasPriceBasis, OilPriceBasis } from "@modules/EconomicScreening/typesAndEnums";

/** Serializable overrides of the harness defaults; an absent key keeps the default. */
export type EconomicScreeningHarnessInitialState = {
    predictionStartYear?: number | null;
    oilPrice?: number | null;
    gasPrice?: number | null;
    discountRatePercent?: number;
    costProfile?: CostProfileEntry[];
    earlyValue?: EarlyValueConfiguration;
    resultMode?: ResultMode;
    selectedMeasure?: EconomicMeasure;
    cashFlowProfileType?: CashFlowProfileType;
    selectedRealization?: number | null;
};

const HARNESS_CASE_UUID = "99999999-aaaa-4444-aaaa-aaaaaaaaaaaa";
const HARNESS_REALIZATIONS = [3, 8, 21];

const ENSEMBLE = new RegularEnsemble(
    "asset",
    [],
    HARNESS_CASE_UUID,
    "case",
    "Screening",
    "",
    HARNESS_REALIZATIONS,
    [],
    null,
    null,
    "#1f77b4",
);
const ENSEMBLE_SET = new EnsembleSet([ENSEMBLE]);

function makeWorkbenchSession(): WorkbenchSession {
    const delegate = new PublishSubscribeDelegate();
    const realizationFilterSet = {
        getRealizationFilterForEnsembleIdent: () => ({ getFilteredRealizations: () => HARNESS_REALIZATIONS }),
    };
    return {
        getPublishSubscribeDelegate: () => delegate,
        makeSnapshotGetter: (topic: WorkbenchSessionTopic) => () =>
            topic === WorkbenchSessionTopic.ENSEMBLE_SET ? ENSEMBLE_SET : realizationFilterSet,
        getEnsembleSet: () => ENSEMBLE_SET,
        getRealizationFilterSet: () => realizationFilterSet,
    } as unknown as WorkbenchSession;
}

/**
 * Builds a module instance the way the framework initializes one, with the module's registered
 * components and its settings-to-view interface. Settings and view share one per-module store.
 */
function makeModuleInstance(initialState: EconomicScreeningHarnessInitialState = {}) {
    EnsembleFingerprintStore.setAll(new Map([[ENSEMBLE.getIdent().toString(), "harness-fingerprint"]]));
    const store = createStore();
    // Same query defaults as the application's QueryClientProvider.
    store.set(
        queryClientAtom,
        new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    refetchOnWindowFocus: false,
                    refetchOnMount: false,
                    refetchOnReconnect: true,
                    gcTime: 60_000,
                    staleTime: 60_000,
                },
            },
        }),
    );
    store.set(EnsembleSetAtom, ENSEMBLE_SET);
    store.set(selectedEnsembleIdentAtom, ENSEMBLE.getIdent());
    store.set(predictionStartYearAtom, 2030);
    store.set(currencyAtom, Currency.USD);
    store.set(oilPriceAtom, 50);
    store.set(oilPriceBasisAtom, OilPriceBasis.PER_SM3);
    store.set(gasPriceAtom, 0.2);
    store.set(gasPriceBasisAtom, GasPriceBasis.PER_SM3);
    if ("predictionStartYear" in initialState) store.set(predictionStartYearAtom, initialState.predictionStartYear!);
    if ("oilPrice" in initialState) store.set(oilPriceAtom, initialState.oilPrice!);
    if ("gasPrice" in initialState) store.set(gasPriceAtom, initialState.gasPrice!);
    if (initialState.discountRatePercent !== undefined) {
        store.set(discountRatePercentAtom, initialState.discountRatePercent);
    }
    if (initialState.costProfile) store.set(costProfileAtom, initialState.costProfile);
    if (initialState.earlyValue) store.set(earlyValueConfigurationAtom, initialState.earlyValue);
    if (initialState.resultMode) store.set(resultModeAtom, initialState.resultMode);
    if (initialState.selectedMeasure) store.set(selectedMeasureAtom, initialState.selectedMeasure);
    if (initialState.cashFlowProfileType) store.set(cashFlowProfileTypeAtom, initialState.cashFlowProfileType);
    if ("selectedRealization" in initialState) {
        store.set(selectedRealizationAtom, {
            ensembleIdentString: ENSEMBLE.getIdent().toString(),
            realization: initialState.selectedRealization!,
        });
    }

    const module = ModuleRegistry.getModule(MODULE_NAME) as Module<Interfaces, SerializedState>;
    const instance = new ModuleInstance<Interfaces, SerializedState>({
        module,
        atomStore: store,
        id: "economic-screening-harness",
        channelDefinitions: channelDefs,
        channelReceiverDefinitions: null,
    });
    instance.makeSettingsToViewInterface(settingsToViewInterfaceInitialization);
    instance.makeSettingsToViewInterfaceEffectsAtom();
    instance.makeViewToSettingsInterfaceEffectsAtom();
    instance.makeSerializer(serializeStateFunctions);
    instance.initialize();
    return { store, module, instance };
}

export type EconomicScreeningModuleHarnessProps = {
    settingsOpen: boolean;
    viewWidth: number;
    viewHeight: number;
    initialState?: EconomicScreeningHarnessInitialState;
    /** Workbench realization filter; null or absent keeps every realization. */
    filteredRealizations?: number[] | null;
};

export function EconomicScreeningModuleHarness(props: EconomicScreeningModuleHarnessProps) {
    const [{ store, module, instance }] = useState(() => makeModuleInstance(props.initialState));
    const [workbenchSession] = useState(makeWorkbenchSession);
    const [title, setTitle] = useState(instance.getTitle());

    const filterKey = props.filteredRealizations ? props.filteredRealizations.join(",") : null;
    useEffect(() => {
        const filtered = filterKey === null ? null : filterKey.split(",").map(Number);
        store.set(
            RealizationFilterSetAtom,
            filtered === null
                ? null
                : {
                      filterSet: {
                          getRealizationFilterForEnsembleIdent: () => ({ getFilteredRealizations: () => filtered }),
                      } as unknown as RealizationFilterSet,
                  },
        );
    }, [store, filterKey]);

    useEffect(() => {
        return instance.makeSubscriberFunction(ModuleInstanceTopic.TITLE)(() => setTitle(instance.getTitle()));
    }, [instance]);

    useEffect(() => {
        // Lets the test read the contents the view has published on the instance's own channels.
        (window as unknown as Record<string, unknown>).readEconomicScreeningChannels = () =>
            instance
                .getChannelManager()
                .getChannels()
                .map((channel) => ({
                    channelIdString: channel.getIdString(),
                    contents: channel
                        .getContents()
                        .map((content) =>
                            content.getDataArray().map((element) => ({ key: element.key, value: element.value })),
                        ),
                }));
    }, [instance]);

    const SettingsComponent = module.settingsFC;
    const ViewComponent = module.viewFC;
    const commonProps = {
        workbenchSession,
        workbenchServices: {},
        workbenchSettings: {},
    };

    return (
        <Provider store={store}>
            <div className="flex gap-2 bg-white p-2">
                {props.settingsOpen && (
                    <section aria-label="Module settings" className="h-[640px] w-80 shrink-0 overflow-auto border">
                        <SettingsComponent
                            {...(commonProps as unknown as Omit<ModuleSettingsProps<Interfaces>, "settingsContext">)}
                            settingsContext={instance.getContext()}
                        />
                    </section>
                )}
                <section
                    aria-label="Module view"
                    className="shrink-0 border"
                    style={{ width: props.viewWidth, height: props.viewHeight }}
                >
                    <div className="text-body-xs border-b px-2">{title}</div>
                    <div style={{ height: props.viewHeight - 24 }}>
                        <ApplyInterfaceEffectsToView moduleInstance={instance}>
                            <ViewComponent
                                {...(commonProps as unknown as Omit<ModuleViewProps<Interfaces>, "viewContext">)}
                                viewContext={instance.getContext()}
                                hoverService={{} as ModuleViewProps<Interfaces>["hoverService"]}
                            />
                        </ApplyInterfaceEffectsToView>
                    </div>
                </section>
            </div>
        </Provider>
    );
}
