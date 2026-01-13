import type { ValueConstraintsIntersectionReducerDefinition } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingImplementation";

export function fixupValue<TValue, TValueConstraintsElement>(
    currentSelection: TValue[] | null,
    valueConstraints: TValueConstraintsElement[],
    mappingFunc: (value: TValueConstraintsElement) => TValue,
    fixupStrategy: "firstAvailable" | "allAvailable",
    isEqualFunc: (a: TValue, b: TValue) => boolean = (a, b) => a === b,
): TValue[] {
    if (valueConstraints.length === 0) {
        return [];
    }

    if (currentSelection === null) {
        if (fixupStrategy === "firstAvailable") {
            return [mappingFunc(valueConstraints[0])];
        } else {
            return valueConstraints.map(mappingFunc);
        }
    }

    const matchingValues = currentSelection.filter((value) =>
        valueConstraints.some((availableValue) => isEqualFunc(mappingFunc(availableValue), value)),
    );

    return matchingValues;
}

export function isValueValid<TValue, TValueConstraintsElement>(
    selection: TValue[] | null,
    valueConstraints: TValueConstraintsElement[],
    mappingFunc: (value: TValueConstraintsElement) => TValue,
    isEqualFunc: (a: TValue, b: TValue) => boolean = (a, b) => a === b,
): boolean {
    if (selection === null) {
        return false;
    }

    return selection.every((value) =>
        valueConstraints.some((availableValue) => isEqualFunc(mappingFunc(availableValue), value)),
    );
}

export function makeValueConstraintsIntersectionReducerDefinition<TValueConstraints extends unknown[]>(
    isEqualFunc: (a: TValueConstraints[number], b: TValueConstraints[number]) => boolean = (a, b) => a === b,
): ValueConstraintsIntersectionReducerDefinition<TValueConstraints, TValueConstraints> {
    return {
        reducer: (
            accumulator: TValueConstraints,
            currentValueConstraints: TValueConstraints,
            index: number,
        ): TValueConstraints => {
            if (index === 0) {
                return currentValueConstraints;
            }

            return accumulator.filter((value) =>
                currentValueConstraints.some((currentValue) => isEqualFunc(currentValue, value)),
            ) as TValueConstraints;
        },
        startingValue: [] as unknown as TValueConstraints,
        isValid: (valueConstraints: TValueConstraints): boolean => {
            return valueConstraints.length > 0;
        },
    };
}
