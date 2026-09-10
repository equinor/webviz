import { createStore, type Setter } from "jotai";
import { describe, expect, test } from "vitest";

import {
    cashFlowProfileTypeAtom,
    earlyValueConfigurationAtom,
} from "@modules/EconomicScreening/settings/atoms/baseAtoms";
import {
    deserializeSettings,
    serializeSettings,
    type SerializedSettings,
} from "@modules/EconomicScreening/settings/persistence";
import {
    CashFlowProfileType,
    DiscountConvention,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";

function makeSerializedSettings(overrides: Partial<SerializedSettings> = {}): SerializedSettings {
    return {
        selectedEnsembleIdentString: null,
        discountRatePercent: 8,
        discountBaseYear: null,
        discountConvention: DiscountConvention.MID_YEAR,
        gasToOilEquivalentFactor: 1000,
        currency: "USD",
        oilPrice: null,
        oilPriceBasis: OilPriceBasis.PER_BBL,
        gasPrice: null,
        gasPriceBasis: GasPriceBasis.PER_SM3,
        costProfile: [],
        evaluationFirstYear: null,
        evaluationLastYear: null,
        selectedMeasure: EconomicMeasure.DISCOUNTED_OIL_VOLUME,
        distributionPlotType: DistributionPlotType.EXCEEDANCE,
        showCashFlowPlot: false,
        ...overrides,
    };
}

function makeUpdateRecorder(): [Setter, Map<unknown, unknown>] {
    const updates = new Map<unknown, unknown>();
    const set: Setter = (atom, ...args) => {
        updates.set(atom, args[0]);
        return undefined as never;
    };
    return [set, updates];
}

describe("Economic Screening persistence", () => {
    test("serializes early values and the selected time profile", () => {
        const store = createStore();
        store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2030 });
        store.set(cashFlowProfileTypeAtom, CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW);

        expect(serializeSettings(store.get)).toMatchObject({
            earlyValueEnabled: true,
            earlyValueEndYear: 2030,
            cashFlowProfileType: CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW,
        });
    });

    test("restores enabled early values and the selected time profile", () => {
        const [set, updates] = makeUpdateRecorder();

        deserializeSettings(
            makeSerializedSettings({
                earlyValueEnabled: true,
                earlyValueEndYear: 2030,
                cashFlowProfileType: CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW,
            }),
            set,
        );

        expect(updates.get(earlyValueConfigurationAtom)).toEqual({ enabled: true, endYear: 2030 });
        expect(updates.get(cashFlowProfileTypeAtom)).toBe(CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW);
    });

    test("does not overwrite defaults for optional fields absent from older state", () => {
        const [set, updates] = makeUpdateRecorder();
        deserializeSettings(makeSerializedSettings(), set);

        expect(updates.has(earlyValueConfigurationAtom)).toBe(false);
        expect(updates.has(cashFlowProfileTypeAtom)).toBe(false);
    });
});
