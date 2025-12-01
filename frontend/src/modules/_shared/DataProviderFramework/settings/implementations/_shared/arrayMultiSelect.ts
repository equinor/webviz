import type { ValueRangeIntersectionReducerDefinition } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingImplementation";

export function fixupValue<TValue, TValueRangeElement>(
    currentSelection: TValue[] | null,
    valueRange: TValueRangeElement[],
    mappingFunc: (value: TValueRangeElement) => TValue,
    fixupStrategy: "firstAvailable" | "allAvailable",
    isEqualFunc: (a: TValue, b: TValue) => boolean = (a, b) => a === b,
): TValue[] {
    if (valueRange.length === 0) {
        return [];
    }

    if (currentSelection === null) {
        if (fixupStrategy === "firstAvailable") {
            return [mappingFunc(valueRange[0])];
        } else {
            return valueRange.map(mappingFunc);
        }
    }

    const matchingValues = currentSelection.filter((value) =>
        valueRange.some((availableValue) => isEqualFunc(mappingFunc(availableValue), value)),
    );

    return matchingValues;
}

export function isValueValid<TValue, TValueRangeElement>(
    selection: TValue[] | null,
    valueRange: TValueRangeElement[],
    mappingFunc: (value: TValueRangeElement) => TValue,
    isEqualFunc: (a: TValue, b: TValue) => boolean = (a, b) => a === b,
): boolean {
    if (selection === null) {
        return false;
    }

    return selection.every((value) =>
        valueRange.some((availableValue) => isEqualFunc(mappingFunc(availableValue), value)),
    );
}

export function makeValueRangeIntersectionReducerDefinition<TValueRange extends unknown[]>(
    isEqualFunc: (a: TValueRange[number], b: TValueRange[number]) => boolean = (a, b) => a === b,
): ValueRangeIntersectionReducerDefinition<TValueRange, TValueRange> {
    return {
        reducer: (accumulator: TValueRange, currentValueRange: TValueRange, index: number): TValueRange => {
            if (index === 0) {
                return currentValueRange;
            }

            return accumulator.filter((value) =>
                currentValueRange.some((currentValue) => isEqualFunc(currentValue, value)),
            ) as TValueRange;
        },
        startingValue: [] as unknown as TValueRange,
        isValid: (valueRange: TValueRange): boolean => {
            return valueRange.length > 0;
        },
    };
}
