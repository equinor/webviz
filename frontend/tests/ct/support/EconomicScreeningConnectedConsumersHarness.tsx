import { useEffect, useState } from "react";

import { QueryClient } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ApplyInterfaceEffectsToView } from "@framework/internal/components/ApplyInterfaceEffects/applyInterfaceEffects";
import type { ChannelManager } from "@framework/internal/DataChannels/ChannelManager";
import { PrivateWorkbenchSettings } from "@framework/internal/PrivateWorkbenchSettings";
import type {
    Module,
    ModuleComponentSerializationFunctions,
    ModuleComponentsStateBase,
    ModuleInterfaceTypes,
    ModuleSettingsProps,
    ModuleViewProps,
} from "@framework/Module";
import type { ViewContext } from "@framework/ModuleContext";
import { ModuleInstance } from "@framework/ModuleInstance";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ChannelDefinition, ChannelReceiverDefinition } from "@framework/types/dataChannnel";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { WorkbenchSessionTopic, type WorkbenchSession } from "@framework/WorkbenchSession";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { computeSensitivitiesForResponse, SensitivitySortBy } from "@modules/_shared/SensitivityProcessing";
import {
    settingsToViewInterfaceInitialization as distributionInterfaceInitialization,
    type Interfaces as DistributionInterfaces,
} from "@modules/DistributionPlot/interfaces";
import "@modules/DistributionPlot/loadModule";
import {
    serializeStateFunctions as distributionSerializeStateFunctions,
    type SerializedState as DistributionSerializedState,
} from "@modules/DistributionPlot/persistence";
import { receiverDefs as distributionReceiverDefs } from "@modules/DistributionPlot/receiverDefs";
import { MODULE_NAME as DISTRIBUTION_MODULE_NAME } from "@modules/DistributionPlot/registerModule";
import { plotTypeAtom } from "@modules/DistributionPlot/settings/atoms/baseAtoms";
import type { PlotType } from "@modules/DistributionPlot/typesAndEnums";
import { channelDefs } from "@modules/EconomicScreening/channelDefs";
import {
    settingsToViewInterfaceInitialization as economicInterfaceInitialization,
    type Interfaces as EconomicInterfaces,
} from "@modules/EconomicScreening/interfaces";
import "@modules/EconomicScreening/loadModule";
import {
    serializeStateFunctions as economicSerializeStateFunctions,
    type SerializedState as EconomicSerializedState,
} from "@modules/EconomicScreening/persistence";
import { MODULE_NAME as ECONOMIC_MODULE_NAME } from "@modules/EconomicScreening/registerModule";
import {
    costProfileAtom,
    currencyAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    isCostProfileDraftValidAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
    resultModeAtom,
    selectedMeasureAtom,
} from "@modules/EconomicScreening/settings/atoms/baseAtoms";
import { selectedEnsembleIdentAtom } from "@modules/EconomicScreening/settings/atoms/persistableFixableAtoms";
import {
    Currency,
    type DistributionPlotType,
    type EarlyValueConfiguration,
    type EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
    type ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";
import {
    settingsToViewInterfaceInitialization as sensitivityInterfaceInitialization,
    type Interfaces as SensitivityInterfaces,
} from "@modules/SensitivityPlot/interfaces";
import "@modules/SensitivityPlot/loadModule";
import {
    serializeStateFunctions as sensitivitySerializeStateFunctions,
    type SerializedState as SensitivitySerializedState,
} from "@modules/SensitivityPlot/persistence";
import { receiverDefs as sensitivityReceiverDefs } from "@modules/SensitivityPlot/receiverDefs";
import { MODULE_NAME as SENSITIVITY_MODULE_NAME } from "@modules/SensitivityPlot/registerModule";
import { displayComponentTypeAtom } from "@modules/SensitivityPlot/settings/atoms/baseAtoms";
import type { DisplayComponentType } from "@modules/SensitivityPlot/typesAndEnums";
import { useResponseChannel } from "@modules/SensitivityPlot/view/hooks/useResponseChannel";

import {
    BASE_CASE_UUID,
    BASE_ENSEMBLE_NAME,
    BASE_REALIZATIONS,
    CAPEX_2030_USD,
    DESIGN_CASE_UUID,
    DESIGN_ENSEMBLE_NAME,
    DESIGN_REALIZATIONS,
    DESIGN_SENSITIVITIES,
    DISCOUNT_RATE_PERCENT,
    GAS_PRICE_USD_PER_SM3,
    OIL_PRICE_USD_PER_SM3,
    PREDICTION_START_YEAR,
} from "./economicScreeningConnectedFixtures";

const DESIGN = new RegularEnsemble(
    "asset",
    [],
    DESIGN_CASE_UUID,
    "case",
    DESIGN_ENSEMBLE_NAME,
    "",
    DESIGN_REALIZATIONS,
    [],
    DESIGN_SENSITIVITIES,
    null,
    "#1f77b4",
);
const BASE = new RegularEnsemble(
    "asset",
    [],
    BASE_CASE_UUID,
    "case",
    BASE_ENSEMBLE_NAME,
    "",
    BASE_REALIZATIONS,
    [],
    null,
    null,
    "#2ca02c",
);
const DELTA = new DeltaEnsemble(DESIGN, BASE, "#d62728");
const ENSEMBLE_SET = new EnsembleSet([DESIGN, BASE], [DELTA]);
const ENSEMBLES = { design: DESIGN, base: BASE, delta: DELTA };

export type ProducerEnsemble = keyof typeof ENSEMBLES;

export type ProducerDisplay = { resultMode: ResultMode; measure: EconomicMeasure; plotType: DistributionPlotType };

export type ConnectedConsumersHarnessProps = {
    producerEnsemble: ProducerEnsemble;
    costDraftValid: boolean;
    early: EarlyValueConfiguration;
    producerDisplay?: ProducerDisplay;
    /** Producer channel id strings; null leaves a receiver disconnected. */
    distributionX: string | null;
    distributionY: string | null;
    distributionPlotType: PlotType;
    sensitivityResponse: string | null;
    sensitivityDisplay?: DisplayComponentType;
};

function makeWorkbenchSession(): WorkbenchSession {
    const delegate = new PublishSubscribeDelegate();
    const realizationFilterSet = {
        getRealizationFilterForEnsembleIdent: (ident: { toString(): string }) => ({
            getFilteredRealizations: () =>
                Object.values(ENSEMBLES)
                    .find((ensemble) => ensemble.getIdent().toString() === ident.toString())
                    ?.getRealizations() ?? [],
        }),
    };
    return {
        getPublishSubscribeDelegate: () => delegate,
        makeSnapshotGetter: (topic: WorkbenchSessionTopic) => () =>
            topic === WorkbenchSessionTopic.ENSEMBLE_SET ? ENSEMBLE_SET : realizationFilterSet,
        getEnsembleSet: () => ENSEMBLE_SET,
        getRealizationFilterSet: () => realizationFilterSet,
    } as unknown as WorkbenchSession;
}

/** Initializes an instance with its own store the way the framework does, without the loader's dynamic import. */
function makeInstance<TInterfaces extends ModuleInterfaceTypes, TState extends ModuleComponentsStateBase>(options: {
    moduleName: string;
    id: string;
    channelDefinitions: ChannelDefinition[] | null;
    channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
    settingsToView: InterfaceInitialization<Exclude<TInterfaces["settingsToView"], undefined>>;
    serializeStateFunctions: ModuleComponentSerializationFunctions<TState>;
}) {
    const store = createStore();
    const module = ModuleRegistry.getModule(options.moduleName) as unknown as Module<TInterfaces, TState>;
    const instance = new ModuleInstance<TInterfaces, TState>({
        module,
        atomStore: store,
        id: options.id,
        channelDefinitions: options.channelDefinitions,
        channelReceiverDefinitions: options.channelReceiverDefinitions,
    });
    instance.makeSettingsToViewInterface(options.settingsToView);
    instance.makeSettingsToViewInterfaceEffectsAtom();
    instance.makeViewToSettingsInterfaceEffectsAtom();
    instance.makeSerializer(options.serializeStateFunctions);
    instance.initialize();
    return { store, module, instance };
}

function makeModules() {
    EnsembleFingerprintStore.setAll(
        new Map([
            [DESIGN.getIdent().toString(), "design-fingerprint"],
            [BASE.getIdent().toString(), "base-fingerprint"],
        ]),
    );
    const producer = makeInstance<EconomicInterfaces, EconomicSerializedState>({
        moduleName: ECONOMIC_MODULE_NAME,
        id: "economic-screening-producer",
        channelDefinitions: channelDefs,
        channelReceiverDefinitions: null,
        settingsToView: economicInterfaceInitialization,
        serializeStateFunctions: economicSerializeStateFunctions,
    });
    const { store } = producer;
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
    store.set(discountRatePercentAtom, DISCOUNT_RATE_PERCENT);
    store.set(predictionStartYearAtom, PREDICTION_START_YEAR);
    store.set(currencyAtom, Currency.USD);
    store.set(oilPriceAtom, OIL_PRICE_USD_PER_SM3);
    store.set(oilPriceBasisAtom, OilPriceBasis.PER_SM3);
    store.set(gasPriceAtom, GAS_PRICE_USD_PER_SM3);
    store.set(gasPriceBasisAtom, GasPriceBasis.PER_SM3);
    store.set(costProfileAtom, [{ year: PREDICTION_START_YEAR, capex: CAPEX_2030_USD, opex: 0 }]);

    const distribution = makeInstance<DistributionInterfaces, DistributionSerializedState>({
        moduleName: DISTRIBUTION_MODULE_NAME,
        id: "distribution-consumer",
        channelDefinitions: null,
        channelReceiverDefinitions: distributionReceiverDefs,
        settingsToView: distributionInterfaceInitialization,
        serializeStateFunctions: distributionSerializeStateFunctions,
    });
    const sensitivity = makeInstance<SensitivityInterfaces, SensitivitySerializedState>({
        moduleName: SENSITIVITY_MODULE_NAME,
        id: "sensitivity-consumer",
        channelDefinitions: null,
        channelReceiverDefinitions: sensitivityReceiverDefs,
        settingsToView: sensitivityInterfaceInitialization,
        serializeStateFunctions: sensitivitySerializeStateFunctions,
    });
    return { producer, distribution, sensitivity };
}

function connectReceiver(
    consumerChannelManager: ChannelManager,
    receiverIdString: string,
    producerChannelManager: ChannelManager,
    channelIdString: string | null,
) {
    const receiver = consumerChannelManager.getReceiver(receiverIdString)!;
    const channel = channelIdString ? producerChannelManager.getChannel(channelIdString) : null;
    if (!channel) {
        receiver.disconnectFromCurrentChannel();
    } else if (receiver.getChannel() !== channel) {
        receiver.connectToChannel(channel, "all");
    }
}

/**
 * Runs SensitivityPlot's own response hook and processing on the consumer's connected receiver, as its view does,
 * and exposes the resulting response unit, which the tornado itself does not render.
 */
function SensitivityResponseProbe(props: {
    viewContext: ViewContext<SensitivityInterfaces>;
    workbenchSession: WorkbenchSession;
}) {
    const referenceSensitivityName = props.viewContext.useSettingsToViewInterfaceValue("referenceSensitivityName");
    const responseChannel = useResponseChannel(props.viewContext, props.workbenchSession);
    const sensitivities = responseChannel.channelEnsemble?.getSensitivities();
    const dataset =
        referenceSensitivityName && sensitivities && responseChannel.ensemblePerRealResponse
            ? computeSensitivitiesForResponse(
                  sensitivities,
                  responseChannel.ensemblePerRealResponse,
                  referenceSensitivityName,
                  SensitivitySortBy.IMPACT,
                  false,
              )
            : null;
    return (
        <>
            Response unit: <output data-testid="sensitivity-response-unit">{dataset?.responseUnit ?? ""}</output>
        </>
    );
}

/**
 * Mounts the actual Economic Screening view as producer and the actual DistributionPlot and SensitivityPlot
 * modules as consumers, each with its own store, connected through the framework's channel receivers.
 */
export function EconomicScreeningConnectedConsumersHarness(props: ConnectedConsumersHarnessProps) {
    const [{ producer, distribution, sensitivity }] = useState(makeModules);
    const [workbenchSession] = useState(makeWorkbenchSession);
    const [workbenchSettings] = useState(() => new PrivateWorkbenchSettings());

    const producerStore = producer.store;
    useEffect(() => {
        producerStore.set(selectedEnsembleIdentAtom, ENSEMBLES[props.producerEnsemble].getIdent());
    }, [producerStore, props.producerEnsemble]);
    useEffect(() => {
        producerStore.set(isCostProfileDraftValidAtom, props.costDraftValid);
    }, [producerStore, props.costDraftValid]);
    useEffect(() => {
        producerStore.set(earlyValueConfigurationAtom, props.early);
    }, [producerStore, props.early]);
    useEffect(() => {
        if (props.producerDisplay) {
            producerStore.set(resultModeAtom, props.producerDisplay.resultMode);
            producerStore.set(selectedMeasureAtom, props.producerDisplay.measure);
            producerStore.set(distributionPlotTypeAtom, props.producerDisplay.plotType);
        }
    }, [producerStore, props.producerDisplay]);

    useEffect(() => {
        distribution.store.set(plotTypeAtom, props.distributionPlotType);
    }, [distribution.store, props.distributionPlotType]);
    useEffect(() => {
        if (props.sensitivityDisplay) {
            sensitivity.store.set(displayComponentTypeAtom, props.sensitivityDisplay);
        }
    }, [sensitivity.store, props.sensitivityDisplay]);

    useEffect(() => {
        const producerChannels = producer.instance.getChannelManager();
        connectReceiver(distribution.instance.getChannelManager(), "channelX", producerChannels, props.distributionX);
        connectReceiver(distribution.instance.getChannelManager(), "channelY", producerChannels, props.distributionY);
        connectReceiver(
            sensitivity.instance.getChannelManager(),
            "response",
            producerChannels,
            props.sensitivityResponse,
        );
    }, [
        distribution.instance,
        sensitivity.instance,
        producer.instance,
        props.distributionX,
        props.distributionY,
        props.sensitivityResponse,
    ]);

    const commonProps = { workbenchSession, workbenchServices: {}, workbenchSettings };
    const ProducerView = producer.module.viewFC;
    const DistributionView = distribution.module.viewFC;
    const SensitivitySettings = sensitivity.module.settingsFC;
    const SensitivityView = sensitivity.module.viewFC;

    return (
        <div className="grid grid-cols-2 gap-2 bg-white p-2">
            <section aria-label="Producer view" className="h-[420px] border">
                <Provider store={producer.store}>
                    <ApplyInterfaceEffectsToView moduleInstance={producer.instance}>
                        <ProducerView
                            {...(commonProps as unknown as Omit<ModuleViewProps<EconomicInterfaces>, "viewContext">)}
                            viewContext={producer.instance.getContext()}
                            hoverService={{} as ModuleViewProps<EconomicInterfaces>["hoverService"]}
                        />
                    </ApplyInterfaceEffectsToView>
                </Provider>
            </section>
            <section aria-label="Distribution consumer" className="h-[420px] border">
                <Provider store={distribution.store}>
                    <ApplyInterfaceEffectsToView moduleInstance={distribution.instance}>
                        <DistributionView
                            {...(commonProps as unknown as Omit<
                                ModuleViewProps<DistributionInterfaces>,
                                "viewContext"
                            >)}
                            viewContext={distribution.instance.getContext()}
                            hoverService={{} as ModuleViewProps<DistributionInterfaces>["hoverService"]}
                        />
                    </ApplyInterfaceEffectsToView>
                </Provider>
            </section>
            <Provider store={sensitivity.store}>
                <section aria-label="Sensitivity consumer settings" className="h-[420px] overflow-auto border">
                    <SensitivitySettings
                        {...(commonProps as unknown as Omit<
                            ModuleSettingsProps<SensitivityInterfaces>,
                            "settingsContext"
                        >)}
                        settingsContext={sensitivity.instance.getContext()}
                    />
                </section>
                <section aria-label="Sensitivity consumer" className="h-[420px] border">
                    <ApplyInterfaceEffectsToView moduleInstance={sensitivity.instance}>
                        <SensitivityView
                            {...(commonProps as unknown as Omit<ModuleViewProps<SensitivityInterfaces>, "viewContext">)}
                            viewContext={sensitivity.instance.getContext()}
                            hoverService={{} as ModuleViewProps<SensitivityInterfaces>["hoverService"]}
                        />
                    </ApplyInterfaceEffectsToView>
                </section>
                <section aria-label="Sensitivity response probe" className="text-body-xs">
                    <SensitivityResponseProbe
                        viewContext={sensitivity.instance.getContext()}
                        workbenchSession={workbenchSession}
                    />
                </section>
            </Provider>
        </div>
    );
}
