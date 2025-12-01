import type { ValueRangeIntersectionReducerDefinition } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingImplementation";

export function fixupValue<TValue, TValueRangeElement>(
    currentSelection: TValue | null,
    valueRange: TValueRangeElement[],
    mappingFunc: (value: TValueRangeElement) => TValue,
    isEqualFunc: (a: TValue, b: TValue) => boolean = (a, b) => a === b,
): TValue | null {
    if (valueRange.length === 0) {
        return null;
    }

    if (currentSelection === null) {
        return mappingFunc(valueRange[0]);
    }

    if (valueRange.some((v) => isEqualFunc(mappingFunc(v), currentSelection))) {
        return currentSelection;
    }

    return mappingFunc(valueRange[0]);
}

export function isValueValid<TValue, TValueRangeElement>(
    selection: TValue | null,
    valueRange: TValueRangeElement[],
    mappingFunc: (value: TValueRangeElement) => TValue,
    isEqualFunc: (a: TValue, b: TValue) => boolean = (a, b) => a === b,
): boolean {
    if (selection === null) {
        return false;
    }

    return valueRange.some((availableValue) => isEqualFunc(mappingFunc(availableValue), selection));
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
