import { createStore } from "jotai";
import { describe, expect, test } from "vitest";

import { ModuleInstanceSerializer } from "@framework/internal/ModuleInstanceSerializer";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Interfaces } from "@modules/EconomicScreening/interfaces";
import {
    SERIALIZED_STATE_SCHEMA,
    serializeStateFunctions,
    type SerializedState,
} from "@modules/EconomicScreening/persistence";
import {
    cashFlowProfileTypeAtom,
    costProfileAtom,
    currencyAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    missingComponentAssumptionsAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "@modules/EconomicScreening/settings/atoms/baseAtoms";
import { SETTINGS_STATE_FORMAT, serializeSettings } from "@modules/EconomicScreening/settings/persistence";
import {
    CashFlowProfileType,
    Currency,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";

type Store = ReturnType<typeof createStore>;

function populate(store: Store, overrides: { predictionStartYear?: number; currency?: Currency } = {}) {
    store.set(discountRatePercentAtom, 7);
    store.set(predictionStartYearAtom, overrides.predictionStartYear ?? 2031);
    store.set(currencyAtom, overrides.currency ?? Currency.NOK);
    store.set(oilPriceAtom, 0);
    store.set(oilPriceBasisAtom, OilPriceBasis.PER_SM3);
    store.set(gasPriceAtom, null);
    store.set(gasPriceBasisAtom, GasPriceBasis.PER_MSCF);
    store.set(costProfileAtom, [
        { year: 2020, capex: 900, opex: 0 },
        { year: 2031, capex: 100, opex: -12 },
    ]);
    store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2035 });
    store.set(selectedMeasureAtom, EconomicMeasure.NPV);
    store.set(distributionPlotTypeAtom, DistributionPlotType.HISTOGRAM);
    store.set(showCashFlowPlotAtom, true);
    store.set(cashFlowProfileTypeAtom, CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW);
    store.set(missingComponentAssumptionsAtom, { ensemble: { assumeMissingInjectionAsZero: true } });
}

function snapshot(store: Store) {
    return {
        discountRatePercent: store.get(discountRatePercentAtom),
        predictionStartYear: store.get(predictionStartYearAtom),
        currency: store.get(currencyAtom),
        oilPrice: store.get(oilPriceAtom),
        oilPriceBasis: store.get(oilPriceBasisAtom),
        gasPrice: store.get(gasPriceAtom),
        gasPriceBasis: store.get(gasPriceBasisAtom),
        costProfile: store.get(costProfileAtom),
        earlyValue: store.get(earlyValueConfigurationAtom),
        selectedMeasure: store.get(selectedMeasureAtom),
        distributionPlotType: store.get(distributionPlotTypeAtom),
        showCashFlowPlot: store.get(showCashFlowPlotAtom),
        cashFlowProfileType: store.get(cashFlowProfileTypeAtom),
        missingComponentAssumptions: store.get(missingComponentAssumptionsAtom),
    };
}

/** The framework's own validation and restore path, on an isolated store. */
function restoreThroughFramework(store: Store, settings: unknown) {
    const serializer = new ModuleInstanceSerializer<SerializedState>(
        { getName: () => "Economic screening" } as unknown as ModuleInstance<Interfaces, SerializedState>,
        store,
        SERIALIZED_STATE_SCHEMA,
        serializeStateFunctions,
        () => {},
    );
    return serializer.deserializeState({ settings: JSON.stringify(settings) });
}

function currentState() {
    const source = createStore();
    populate(source);
    return { source, serialized: serializeSettings(source.get) };
}

describe("Economic Screening current-state persistence", () => {
    test("writes only the current model fields", () => {
        const { serialized } = currentState();

        expect(serialized.stateFormat).toBe(SETTINGS_STATE_FORMAT);
        expect(Object.keys(serialized).sort()).toEqual(
            [
                "cashFlowProfileType",
                "costProfile",
                "currency",
                "discountRatePercent",
                "distributionPlotType",
                "earlyValueEnabled",
                "earlyValueEndYear",
                "gasPrice",
                "gasPriceBasis",
                "missingComponentAssumptionsByEnsemble",
                "oilPrice",
                "oilPriceBasis",
                "predictionStartYear",
                "selectedEnsembleIdentString",
                "selectedMeasure",
                "showCashFlowPlot",
                "stateFormat",
            ].sort(),
        );
    });

    test("round-trips blank versus zero prices, excluded and signed costs, and view choices", () => {
        const { source, serialized } = currentState();
        const target = createStore();

        const applied = restoreThroughFramework(target, JSON.parse(JSON.stringify(serialized)));

        expect(applied?.settingsStateApplied).toBe(true);
        expect(snapshot(target)).toEqual(snapshot(source));
        expect(target.get(oilPriceAtom)).toBe(0);
        expect(target.get(gasPriceAtom)).toBeNull();
    });

    test.each<[string, (current: Record<string, unknown>) => Record<string, unknown>]>([
        [
            "an annual-model state",
            () => ({
                selectedEnsembleIdentString: null,
                discountRatePercent: 8,
                discountBaseYear: 2030,
                discountConvention: "MID_YEAR",
                gasToOilEquivalentFactor: 1000,
                currency: "USD",
                oilPrice: 70,
                oilPriceBasis: OilPriceBasis.PER_BBL,
                excludeOilRevenue: true,
                gasPrice: null,
                gasPriceBasis: GasPriceBasis.PER_SM3,
                costProfile: [{ year: 2030, capex: 1, opex: 1 }],
                evaluationFirstYear: 2030,
                evaluationLastYear: 2040,
                selectedMeasure: EconomicMeasure.DISCOUNTED_OIL_VOLUME,
                distributionPlotType: DistributionPlotType.EXCEEDANCE,
                showCashFlowPlot: false,
            }),
        ],
        [
            "an intermediate versioned monthly state",
            (current) => {
                const intermediate: Record<string, unknown> = { ...current, stateVersion: 2 };
                delete intermediate.stateFormat;
                return intermediate;
            },
        ],
        ["an unknown state format", (current) => ({ ...current, stateFormat: "MONTHLY_OPEX_V2" })],
        ["an unsupported currency", (current) => ({ ...current, currency: "EUR" })],
    ])("rejects %s before changing any current setting", (_description, makeState) => {
        const target = createStore();
        populate(target, { predictionStartYear: 2044, currency: Currency.USD });
        const before = snapshot(target);
        const { serialized } = currentState();

        const applied = restoreThroughFramework(target, makeState(serialized as unknown as Record<string, unknown>));

        expect(applied?.settingsStateApplied).toBe(false);
        expect(snapshot(target)).toEqual(before);
    });
});
