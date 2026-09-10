import type { ChannelDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

import { EconomicMeasure, EconomicMeasureEnumToStringMapping } from "./typesAndEnums";

export const MEASURE_CHANNEL_ID_MAP: Record<EconomicMeasure, string> = {
    [EconomicMeasure.NPV]: "NPV (value per realization)",
    [EconomicMeasure.IRR]: "IRR (value per realization)",
    [EconomicMeasure.BREAK_EVEN_OIL_PRICE]: "Break-even oil price (value per realization)",
    [EconomicMeasure.DISCOUNTED_OIL_VOLUME]: "Discounted oil volume (value per realization)",
    [EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME]: "Discounted sales gas volume (value per realization)",
    [EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS]: "Discounted oil equivalents (value per realization)",
    [EconomicMeasure.UNDISCOUNTED_OIL_VOLUME]: "Oil volume (value per realization)",
    [EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME]: "Sales gas volume (value per realization)",
};

export const channelDefs: ChannelDefinition[] = Object.values(EconomicMeasure).map((measure) => ({
    idString: MEASURE_CHANNEL_ID_MAP[measure],
    displayName: EconomicMeasureEnumToStringMapping[measure],
    kindOfKey: KeyKind.REALIZATION,
}));
