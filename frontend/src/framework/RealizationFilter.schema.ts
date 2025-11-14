import type { JTDSchemaType } from "ajv/dist/core";

import { IncludeExcludeFilter, RealizationFilterType } from "./types/realizationFilterTypes";
import type { NumberRange } from "./utils/numberUtils";

export type SerializedRealizationFilterState = {
    assignedEnsembleIdentString: string;
    includeExcludeFilter: IncludeExcludeFilter;
    filterType: RealizationFilterType;
    realizationNumberSelections: SerializedRealizationNumberSelection[];
    parameterIdentStringToValueSelectionMap: SerializedParameterValueSelection[];
};

export type SerializedRealizationNumberSelection =
    | { type: "single"; value: number }
    | { type: "range"; range: NumberRange };

export type SerializedParameterValueSelection = {
    parameterIdentString: string;
} & (SerializedContinuousParameterValueSelection | SerializedDiscreteParameterValueSelection);

export type SerializedContinuousParameterValueSelection = {
    type: "continuous";
    range: NumberRange;
};

export type SerializedDiscreteParameterValueSelection = {
    type: "discrete";
    parameterIdentString: string;
    values: SerializedDiscreteParameterValues;
};

export type SerializedDiscreteParameterValues =
    | {
          type: "string";
          value: readonly string[];
      }
    | {
          type: "number";
          value: readonly number[];
      };

export const REALIZATION_FILTER_STATE_SCHEMA: JTDSchemaType<SerializedRealizationFilterState> = {
    properties: {
        assignedEnsembleIdentString: { type: "string" },
        includeExcludeFilter: { enum: Object.values(IncludeExcludeFilter) },
        filterType: { enum: Object.values(RealizationFilterType) },
        realizationNumberSelections: {
            elements: {
                discriminator: "type",
                mapping: {
                    single: {
                        properties: {
                            value: { type: "float64" },
                        },
                    },
                    range: {
                        properties: {
                            range: {
                                properties: {
                                    start: { type: "float64" },
                                    end: { type: "float64" },
                                },
                            },
                        },
                    },
                },
            },
        },
        parameterIdentStringToValueSelectionMap: {
            elements: {
                discriminator: "type",
                mapping: {
                    continuous: {
                        properties: {
                            parameterIdentString: { type: "string" },
                            range: {
                                properties: {
                                    start: { type: "float64" },
                                    end: { type: "float64" },
                                },
                            },
                        },
                    },
                    discrete: {
                        properties: {
                            parameterIdentString: { type: "string" },
                            values: {
                                discriminator: "type",
                                mapping: {
                                    string: {
                                        properties: {
                                            value: {
                                                elements: { type: "string" },
                                            },
                                        },
                                    },
                                    number: {
                                        properties: {
                                            value: {
                                                elements: { type: "float64" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
} as const;
