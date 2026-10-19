import { simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import type { SalesGasStrategy } from "../utils/vectorResolution";

export const PREDICTION_START_YEAR_HELP =
    "Required. Evaluation and valuation both start on 1 January of this year and run through the supported simulation end. It may precede production to include forecast investment. Suggestions are years with source data from 1 January for the full ensemble, including covered years without production; any whole year can be typed. The historical simulation start is not suggested as a default.";

export const DISCOUNT_RATE_HELP = "Annual rate used to discount future volumes and cash flow to the valuation date.";

export const CURRENCY_HELP =
    "Enter all prices and costs in this currency. Changing it does not convert entered values.";

export const OIL_PRICE_HELP =
    "Constant oil sales price over the evaluation. Blank means unspecified; enter 0 to intentionally omit oil revenue. A price of 0 does not turn missing oil data into zero volume. Volume results and break-even oil price do not need an oil price.";

export const GAS_PRICE_HELP =
    "Constant sales-gas price over the evaluation. Blank means unspecified; enter 0 to intentionally omit gas revenue. A price of 0 does not turn missing gas data into zero volume, and sales-gas volume results still need the gas source. Volume results do not need a price.";

export function makeSalesGasSourceHelp(kind: SalesGasStrategy["kind"]): string {
    return `${makeSalesGasDescription(kind)} A missing vector is not proof of zero. Accepting treats it as zero for this ensemble only, which can increase sales gas and NPV.`;
}

function makeSalesGasDescription(kind: SalesGasStrategy["kind"]): string {
    if (kind === "DIRECT") {
        return `${simulationVectorDescription("FGST")} (FGST) is used directly.`;
    }
    if (kind === "DERIVED") {
        return `${simulationVectorDescription("FGST")} is calculated as ${simulationVectorDescription("FGPT")} (FGPT) minus ${simulationVectorDescription("FGIT")} (FGIT) and ${simulationVectorDescription("FGCT")} (FGCT).`;
    }
    return "Neither FGST nor FGPT is available for this ensemble.";
}

export const ANNUAL_COSTS_DELTA_HELP =
    "One row per year from the prediction start through the simulation end. For a delta ensemble, costs are comparison minus reference; negative values are savings. Blank cells are zero. OPEX is paid in twelve equal monthly amounts; CAPEX at mid-year. The full annual amount applies even in a final year that ends early.";

export const ANNUAL_COSTS_HELP =
    "One row per year from the prediction start through the simulation end. Blank cells are zero. Each year's OPEX is paid in twelve equal monthly amounts and CAPEX at mid-year; the full annual amount applies even in a final year that ends early.";

export const RESULTS_HELP =
    "Chooses what the view displays. Display choices do not change calculations or published channels.";

export const REALIZATION_HELP =
    "Highlights one realization over the aggregate. Clear the selection to show only the aggregate.";

export const EARLY_VALUE_HELP =
    "Optional cash-flow and volume comparison, independent of the primary measure. No early IRR or break-even price is calculated. Accumulated discounted cash flow and volumes from 1 January of the prediction start year through the end of the chosen year, valued on the same date as the full evaluation. It is not remaining future value and does not move the valuation date. The final year stops at supported production coverage, while its full annual costs still apply. Full results are unchanged.";

export const EARLY_VALUE_END_YEAR_HELP =
    "Inclusive last calendar year of the early value, within the evaluation years. Through the final evaluation year, it equals the full result for a fully eligible realization.";
