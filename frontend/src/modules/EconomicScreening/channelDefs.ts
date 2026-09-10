import type { ChannelDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

import {
    EarlyEconomicMeasure,
    EarlyEconomicMeasureEnumToStringMapping,
    EconomicMeasure,
    EconomicMeasureEnumToStringMapping,
} from "./typesAndEnums";

export const MEASURE_CHANNEL_ID_MAP: Record<EconomicMeasure, string> = {
    [EconomicMeasure.NPV]: "NPV (value per realization)",
    [EconomicMeasure.IRR]: "IRR (value per realization)",
    [EconomicMeasure.BREAK_EVEN_OIL_PRICE]: "Break-even oil price, fixed gas (value per realization)",
    [EconomicMeasure.DISCOUNTED_OIL_VOLUME]: "Discounted oil volume (value per realization)",
    [EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME]: "Discounted sales gas volume (value per realization)",
    [EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS]: "Discounted oil equivalents (value per realization)",
    [EconomicMeasure.UNDISCOUNTED_OIL_VOLUME]: "Oil volume (value per realization)",
    [EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME]: "Sales gas volume (value per realization)",
};

export const EARLY_MEASURE_CHANNEL_ID_MAP: Record<EarlyEconomicMeasure, string> = {
    [EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME]: "Early discounted oil volume (value per realization)",
    [EarlyEconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME]: "Early discounted sales gas volume (value per realization)",
    [EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW]: "Early discounted cash flow (value per realization)",
};

export const channelDefs: ChannelDefinition[] = [
    ...Object.values(EconomicMeasure).map((measure) => ({
        idString: MEASURE_CHANNEL_ID_MAP[measure],
        displayName: EconomicMeasureEnumToStringMapping[measure],
        kindOfKey: KeyKind.REALIZATION,
    })),
    ...Object.values(EarlyEconomicMeasure).map((measure) => ({
        idString: EARLY_MEASURE_CHANNEL_ID_MAP[measure],
        displayName: EarlyEconomicMeasureEnumToStringMapping[measure],
        kindOfKey: KeyKind.REALIZATION,
    })),
];
