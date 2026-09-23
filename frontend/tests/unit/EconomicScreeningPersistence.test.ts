import { createStore } from "jotai";
import { describe, expect, test } from "vitest";

import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ModuleInstanceSerializer } from "@framework/internal/ModuleInstanceSerializer";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { RegularEnsemble } from "@framework/RegularEnsemble";
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
    resultModeAtom,
    selectedMeasureAtom,
} from "@modules/EconomicScreening/settings/atoms/baseAtoms";
import { displayedRealizationAtom } from "@modules/EconomicScreening/settings/atoms/derivedAtoms";
import {
    selectedEnsembleIdentAtom,
    selectedRealizationAtom,
} from "@modules/EconomicScreening/settings/atoms/persistableFixableAtoms";
import {
    SETTINGS_STATE_FORMAT,
    serializeSettings,
    type SerializedSettings,
} from "@modules/EconomicScreening/settings/persistence";
import {
    CashFlowProfileType,
    Currency,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";

type Store = ReturnType<typeof createStore>;

/** Non-contiguous realization IDs, so a selection cannot be confused with an array index. */
const ENSEMBLE = new RegularEnsemble(
    "asset",
    [],
    "77777777-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case",
    "saved",
    "",
    [3, 8, 21],
    [],
    null,
    null,
    "#123456",
);
const OTHER_ENSEMBLE = new RegularEnsemble(
    "asset",
    [],
    "88888888-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case",
    "other",
    "",
    [3, 8, 21],
    [],
    null,
    null,
    "#654321",
);
const ENSEMBLE_STRING = ENSEMBLE.getIdent().toString();

function makeStore(): Store {
    const store = createStore();
    store.set(EnsembleSetAtom, new EnsembleSet([ENSEMBLE, OTHER_ENSEMBLE]));
    return store;
}

function populate(
    store: Store,
    overrides: {
        predictionStartYear?: number;
        currency?: Currency;
        resultMode?: ResultMode;
        realization?: number | null;
    } = {},
) {
    store.set(selectedEnsembleIdentAtom, ENSEMBLE.getIdent());
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
    store.set(resultModeAtom, overrides.resultMode ?? ResultMode.TIME_PROFILE);
    store.set(selectedMeasureAtom, EconomicMeasure.NPV);
    store.set(distributionPlotTypeAtom, DistributionPlotType.HISTOGRAM);
    store.set(cashFlowProfileTypeAtom, CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW);
    store.set(selectedRealizationAtom, {
        ensembleIdentString: ENSEMBLE_STRING,
        realization: overrides.realization === undefined ? 21 : overrides.realization,
    });
    store.set(missingComponentAssumptionsAtom, { ensemble: { assumeMissingInjectionAsZero: true } });
}

function snapshot(store: Store) {
    return {
        ensemble: store.get(selectedEnsembleIdentAtom).value?.toString() ?? null,
        discountRatePercent: store.get(discountRatePercentAtom),
        predictionStartYear: store.get(predictionStartYearAtom),
        currency: store.get(currencyAtom),
        oilPrice: store.get(oilPriceAtom),
        oilPriceBasis: store.get(oilPriceBasisAtom),
        gasPrice: store.get(gasPriceAtom),
        gasPriceBasis: store.get(gasPriceBasisAtom),
        costProfile: store.get(costProfileAtom),
        earlyValue: store.get(earlyValueConfigurationAtom),
        resultMode: store.get(resultModeAtom),
        selectedMeasure: store.get(selectedMeasureAtom),
        distributionPlotType: store.get(distributionPlotTypeAtom),
        cashFlowProfileType: store.get(cashFlowProfileTypeAtom),
        displayedRealization: store.get(displayedRealizationAtom),
        missingComponentAssumptions: store.get(missingComponentAssumptionsAtom),
    };
}

function makeSerializer(store: Store) {
    return new ModuleInstanceSerializer<SerializedState>(
        { getName: () => "Economic screening" } as unknown as ModuleInstance<Interfaces, SerializedState>,
        store,
        SERIALIZED_STATE_SCHEMA,
        serializeStateFunctions,
        () => {},
    );
}

/** The framework's own validation and restore path, on an isolated store. */
function restoreThroughFramework(store: Store, settings: unknown) {
    return makeSerializer(store).deserializeState({ settings: JSON.stringify(settings) });
}

function applyTemplateThroughFramework(store: Store, settings: Partial<SerializedSettings>) {
    makeSerializer(store).applyTemplateState({ settings });
}

function currentState(overrides: Parameters<typeof populate>[1] = {}) {
    const source = makeStore();
    populate(source, overrides);
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
                "resultMode",
                "selectedEnsembleIdentString",
                "selectedMeasure",
                "selectedRealization",
                "stateFormat",
            ].sort(),
        );
        expect(serialized.selectedRealization).toBe(21);
        expect(serialized.selectedEnsembleIdentString).toBe(ENSEMBLE_STRING);
    });

    test.each(Object.values(ResultMode))(
        "round-trips the %s mode with prices, excluded and signed costs, and a non-contiguous realization",
        (resultMode) => {
            const { source, serialized } = currentState({ resultMode });
            const target = makeStore();

            const applied = restoreThroughFramework(target, JSON.parse(JSON.stringify(serialized)));

            expect(applied?.settingsStateApplied).toBe(true);
            expect(snapshot(target)).toEqual(snapshot(source));
            expect(target.get(resultModeAtom)).toBe(resultMode);
            expect(target.get(displayedRealizationAtom)).toBe(21);
            expect(target.get(oilPriceAtom)).toBe(0);
            expect(target.get(gasPriceAtom)).toBeNull();
        },
    );

    test("round-trips Aggregate as an explicit null realization", () => {
        const { serialized } = currentState({ realization: null });
        const target = makeStore();
        populate(target);
        expect(target.get(displayedRealizationAtom)).toBe(21);

        restoreThroughFramework(target, serialized);

        expect(serialized.selectedRealization).toBeNull();
        expect(target.get(displayedRealizationAtom)).toBeNull();
    });

    test("restores an explicit null ensemble as unselected, rather than keeping the current one", () => {
        const { serialized } = currentState();
        const target = makeStore();
        populate(target);
        target.set(selectedEnsembleIdentAtom, OTHER_ENSEMBLE.getIdent());

        restoreThroughFramework(target, { ...serialized, selectedEnsembleIdentString: null, selectedRealization: 21 });

        const ensemble = target.get(selectedEnsembleIdentAtom);
        expect(ensemble.value).toBeNull();
        // A restored invalid selection is flagged for the user to fix, not silently replaced.
        expect(ensemble.isValidInContext).toBe(false);
        expect(target.get(displayedRealizationAtom)).toBeNull();
    });

    test("leaves omitted template fields unchanged and applies explicit template resets", () => {
        const target = makeStore();
        populate(target);
        const before = snapshot(target);

        applyTemplateThroughFramework(target, { resultMode: ResultMode.ALL_RESULTS });
        expect(snapshot(target)).toEqual({ ...before, resultMode: ResultMode.ALL_RESULTS });

        applyTemplateThroughFramework(target, { selectedRealization: null });
        expect(target.get(displayedRealizationAtom)).toBeNull();
        expect(target.get(selectedEnsembleIdentAtom).value?.toString()).toBe(ENSEMBLE_STRING);

        applyTemplateThroughFramework(target, { selectedEnsembleIdentString: null });
        expect(target.get(selectedEnsembleIdentAtom).value).toBeNull();
    });

    test("does not carry a restored realization over to another ensemble", () => {
        const { serialized } = currentState();
        const target = makeStore();

        restoreThroughFramework(target, serialized);
        expect(target.get(displayedRealizationAtom)).toBe(21);

        target.set(selectedEnsembleIdentAtom, OTHER_ENSEMBLE.getIdent());
        expect(target.get(displayedRealizationAtom)).toBeNull();
    });

    describe("save and restore keep the displayed realization", () => {
        function saveAndRestore(source: Store) {
            const saved = serializeSettings(source.get);
            const restored = makeStore();
            const applied = restoreThroughFramework(restored, JSON.parse(JSON.stringify(saved)));
            expect(applied?.settingsStateApplied).toBe(true);
            return { saved, restored };
        }

        test("keeps Aggregate when a template set a realization without its ensemble", () => {
            const source = makeStore();
            populate(source, { realization: null });
            applyTemplateThroughFramework(source, { selectedRealization: 21 });
            expect(source.get(displayedRealizationAtom)).toBeNull();

            const { saved, restored } = saveAndRestore(source);

            expect(saved.selectedRealization).toBeNull();
            expect(restored.get(displayedRealizationAtom)).toBeNull();
        });

        test("keeps Aggregate after an ensemble switch, even where the other ensemble has the same ID", () => {
            const source = makeStore();
            populate(source);
            source.set(selectedEnsembleIdentAtom, OTHER_ENSEMBLE.getIdent());
            expect(source.get(displayedRealizationAtom)).toBeNull();

            const { saved, restored } = saveAndRestore(source);

            expect(saved.selectedEnsembleIdentString).toBe(OTHER_ENSEMBLE.getIdent().toString());
            expect(saved.selectedRealization).toBeNull();
            expect(restored.get(displayedRealizationAtom)).toBeNull();
        });

        test("keeps a valid selection and an explicit Aggregate", () => {
            const selected = makeStore();
            populate(selected);
            expect(saveAndRestore(selected).restored.get(displayedRealizationAtom)).toBe(21);

            const aggregate = makeStore();
            populate(aggregate, { realization: null });
            const { saved, restored } = saveAndRestore(aggregate);
            expect(saved.selectedRealization).toBeNull();
            expect(restored.get(displayedRealizationAtom)).toBeNull();
        });
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
        [
            "the earlier monthly-OPEX state with a cash-flow flag",
            (current) => {
                const earlier: Record<string, unknown> = {
                    ...current,
                    stateFormat: "MONTHLY_OPEX_V1",
                    showCashFlowPlot: true,
                };
                delete earlier.resultMode;
                delete earlier.selectedRealization;
                return earlier;
            },
        ],
        ["an unknown state format", (current) => ({ ...current, stateFormat: "MONTHLY_SETTINGS_OWNED_V3" })],
        ["an unsupported currency", (current) => ({ ...current, currency: "EUR" })],
        ["an unsupported result mode", (current) => ({ ...current, resultMode: "BOX_ONLY" })],
    ])("rejects %s before changing any current setting", (_description, makeState) => {
        const target = makeStore();
        populate(target, { predictionStartYear: 2044, currency: Currency.USD, resultMode: ResultMode.DISTRIBUTION });
        const before = snapshot(target);
        const { serialized } = currentState();

        const applied = restoreThroughFramework(target, makeState(serialized as unknown as Record<string, unknown>));

        expect(applied?.settingsStateApplied).toBe(false);
        expect(snapshot(target)).toEqual(before);
    });
});
