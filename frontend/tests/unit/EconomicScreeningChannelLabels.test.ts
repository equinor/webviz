import { describe, expect, test } from "vitest";

import { makeChannelDisplayString, makeMeasureDataGenerator } from "@modules/EconomicScreening/dataGenerators";
import { EconomicMeasure, OilPriceBasis } from "@modules/EconomicScreening/typesAndEnums";

const CONTEXT = { discountRatePercent: 8, predictionStartYear: 2019 };
const UNIT_CONTEXT = { oilUnit: "SM3", gasUnit: "SM3", currency: "USD", oilPriceBasis: OilPriceBasis.PER_SM3 };

function displayStringOf(measure: EconomicMeasure): string | undefined {
    return makeMeasureDataGenerator([], measure, UNIT_CONTEXT, "ensemble", "iter-0", "#000", CONTEXT)().metaData
        .displayString;
}

describe("channel display strings", () => {
    test("abbreviate NPV and IRR, and include the discount rate only where it changes the value", () => {
        expect(displayStringOf(EconomicMeasure.NPV)).toBe("NPV (iter-0; 8%, from 2019)");
        expect(displayStringOf(EconomicMeasure.IRR)).toBe("IRR (iter-0; from 2019)");
        expect(displayStringOf(EconomicMeasure.BREAK_EVEN_OIL_PRICE)).toBe(
            "Break-even oil price (iter-0; 8%, from 2019)",
        );
        expect(displayStringOf(EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toBe(
            "Discounted oil volume (iter-0; 8%, from 2019)",
        );
        expect(displayStringOf(EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME)).toBe(
            "Undiscounted sales gas volume (iter-0; from 2019)",
        );
    });

    test("leave out fixed conventions, currency and the evaluation end", () => {
        const label = displayStringOf(EconomicMeasure.NPV)!;
        for (const omitted of ["USD", "Valuation", "Evaluation", "CAPEX", "Monthly"]) {
            expect(label).not.toContain(omitted);
        }
    });

    test("omit unknown inputs and empty parts", () => {
        const none = { discountRatePercent: null, predictionStartYear: null };
        expect(makeChannelDisplayString("NPV", "iter-0", none, true)).toBe("NPV (iter-0)");
        expect(makeChannelDisplayString("NPV", "", none, true)).toBe("NPV");
        expect(makeChannelDisplayString("NPV", "", CONTEXT, true)).toBe("NPV (8%, from 2019)");
    });
});
