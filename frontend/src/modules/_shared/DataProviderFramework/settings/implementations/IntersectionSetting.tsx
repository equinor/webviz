import React from "react";

import { IntersectionType, isWellboreIntersectionType } from "@framework/types/intersection";
import { Combobox } from "@lib/components/Combobox";
import { ComboboxCompositions } from "@lib/components/Combobox/compositions";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import { NumberInput } from "@lib/components/NumberInput";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { createValidExtensionLength } from "../utils/extensionLengthUtils";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arraySingleSelect";


export type IntersectionSettingOption = {
    type: IntersectionType;
    name: string;
    uuid: string;
};

export type PolylineIntersectionSettingValue = IntersectionSettingOption & {
    type: IntersectionType.CUSTOM_POLYLINE;
};

// Drilled and planned wellbores share the same value shape (both carry an extension length and are
// backed by a wellbore trajectory); they only differ by the discriminating `type`.
export type WellboreIntersectionSettingValue = IntersectionSettingOption & {
    type: IntersectionType.WELLBORE | IntersectionType.PLANNED_WELLBORE;
    extensionLength: number;
};

export type IntersectionSettingValue = PolylineIntersectionSettingValue | WellboreIntersectionSettingValue;

type ExtensionLengthConfig = {
    min: number;
    max: number;
    defaultValue?: number;
};

type ValueType = IntersectionSettingValue | null;
type ValueConstraintsType = IntersectionSettingOption[];

const INTERSECTION_TYPE_OPTIONS: ComboboxItem<IntersectionType>[] = [
    {
        label: "Drilled well trajectory (SMDA)",
        value: IntersectionType.WELLBORE,
        description: "Official drilled well trajectories from SMDA",
    },
    {
        label: "Planned well trajectory (SMDA)",
        value: IntersectionType.PLANNED_WELLBORE,
        description: "Planned well trajectories from SMDA",
    },
    {
        label: "User-defined polyline",
        value: IntersectionType.CUSTOM_POLYLINE,
        description: "Custom intersection path created in Webviz",
    },
];

export class IntersectionSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    private _activeIntersectionType = IntersectionType.WELLBORE;
    private _cachedValueByIntersectionType: Record<IntersectionType, ValueType> = {
        [IntersectionType.WELLBORE]: null,
        [IntersectionType.PLANNED_WELLBORE]: null,
        [IntersectionType.CUSTOM_POLYLINE]: null,
    };
    private _extensionLengthConfig: ExtensionLengthConfig | null;

    constructor(options?: { extensionLengthConfig?: ExtensionLengthConfig }) {
        this._extensionLengthConfig = options?.extensionLengthConfig ?? null;
    }

    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>(
            (a, b) => a.type === b.type && a.uuid === b.uuid,
        );

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);

        if (parsed === null) {
            return null;
        }

        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Expected object or null");
        }

        const v = parsed as Record<string, unknown>;
        if (typeof v.type !== "string" || typeof v.name !== "string" || typeof v.uuid !== "string") {
            throw new Error("Expected object with string properties: type, name, uuid");
        }

        // Discard values with an unknown intersection type (e.g. from an outdated serialized state)
        if (!Object.values(IntersectionType).includes(v.type as IntersectionType)) {
            return null;
        }

        // For wellbore types, default extensionLength to 0 if not present (backward compat)
        if (isWellboreIntersectionType(v.type as IntersectionType) && typeof v.extensionLength !== "number") {
            v.extensionLength = 0;
        }

        return parsed as ValueType;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<IntersectionSettingOption, IntersectionSettingOption>(
            value,
            valueConstraints,
            (v) => v,
            (a, b) => a?.type === b?.type && a?.uuid === b?.uuid,
        );
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        const defaultExtensionLength = this._extensionLengthConfig?.defaultValue ?? 0;
        const valueConstraintsForActiveType = valueConstraints.filter((v) => v.type === this._activeIntersectionType);
        if (valueConstraintsForActiveType.length > 0) {
            const fixed = fixupValue<IntersectionSettingOption, IntersectionSettingOption>(
                currentValue,
                valueConstraintsForActiveType,
                (v) => v,
                (a, b) => a?.type === b?.type && a?.uuid === b?.uuid,
            );
            if (fixed && isWellboreIntersectionType(fixed.type)) {
                const prevExtension =
                    currentValue &&
                    (currentValue.type === IntersectionType.WELLBORE ||
                        currentValue.type === IntersectionType.PLANNED_WELLBORE)
                        ? currentValue.extensionLength
                        : defaultExtensionLength;
                return {
                    type: fixed.type,
                    name: fixed.name,
                    uuid: fixed.uuid,
                    extensionLength: prevExtension,
                };
            }
            if (fixed) {
                return { type: IntersectionType.CUSTOM_POLYLINE, name: fixed.name, uuid: fixed.uuid };
            }
            return null;
        }

        // No items of preferred type available yet — defer fixup
        return null;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        const activeIntersectionType = this._activeIntersectionType;
        const setActiveIntersectionType = (type: IntersectionType) => {
            this._activeIntersectionType = type;
        };
        const cachedValueByIntersectionType = this._cachedValueByIntersectionType;
        const setCachedValueForIntersectionType = (type: IntersectionType, value: ValueType) => {
            this._cachedValueByIntersectionType[type] = value;
        };
        const extensionLengthConfig = this._extensionLengthConfig;
        const defaultExtensionLength = this._extensionLengthConfig?.defaultValue ?? 0;

        return function IntersectionSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const availableValues = props.valueConstraints ?? [];
            const [type, setType] = React.useState<IntersectionSettingValue["type"]>(
                props.value?.type ?? activeIntersectionType,
            );

            // Initialize cached value for the current type on mount
            const hasInitialized = React.useRef(false);
            React.useEffect(
                function initializeCachedValueOnMount() {
                    if (!hasInitialized.current) {
                        hasInitialized.current = true;
                        setCachedValueForIntersectionType(type, props.value);
                    }
                },
                [type, props.value],
            );

            React.useEffect(
                function updateActiveIntersectionType() {
                    setActiveIntersectionType(type);
                },
                [type],
            );

            const enableExtensionLength = extensionLengthConfig !== null && isWellboreIntersectionType(type);
            const settledExtensionLength = createValidExtensionLength(props.value, defaultExtensionLength);

            const [immediateExtensionLength, setExtensionLength, extensionLengthController] = useDebouncedOnChange<
                number | null
            >(
                settledExtensionLength,
                function handleExtensionLengthSettle(numValue: number | null) {
                    if (numValue === null) {
                        return;
                    }
                    if (props.value && isWellboreIntersectionType(props.value.type)) {
                        const newValue = { ...props.value, extensionLength: numValue };
                        setCachedValueForIntersectionType(type, newValue);
                        props.onValueChange(newValue);
                    }
                },
                600,
            );

            function handleSelectionChange(selectedValue: string | null) {
                extensionLengthController.cancel();
                const selected = availableValues.find((v) => v.uuid === selectedValue) ?? null;
                if (!selected) {
                    setCachedValueForIntersectionType(type, null);
                    props.onValueChange(null);
                    return;
                }
                const newValue: IntersectionSettingValue = isWellboreIntersectionType(selected.type)
                    ? {
                          type: selected.type,
                          name: selected.name,
                          uuid: selected.uuid,
                          extensionLength: createValidExtensionLength(props.value, defaultExtensionLength),
                      }
                    : {
                          type: IntersectionType.CUSTOM_POLYLINE,
                          name: selected.name,
                          uuid: selected.uuid,
                      };
                setCachedValueForIntersectionType(type, newValue);
                props.onValueChange(newValue);
            }

            function handleCategoryChange(value: IntersectionSettingValue["type"] | null) {
                if (value === null) {
                    return;
                }

                extensionLengthController.cancel();
                setType(value);

                // Use cached value if still valid for current constraints, otherwise pick first available
                const candidateValue = cachedValueByIntersectionType[value];
                const isCandidateValid =
                    candidateValue !== null &&
                    availableValues.some((v) => v.type === candidateValue.type && v.uuid === candidateValue.uuid);
                const validCandidate = isCandidateValid ? candidateValue : null;
                const fallback = availableValues.find((v) => v.type === value) ?? null;
                const base = validCandidate ?? fallback;
                if (base) {
                    const newValue: IntersectionSettingValue = isWellboreIntersectionType(base.type)
                        ? {
                              type: base.type,
                              name: base.name,
                              uuid: base.uuid,
                              extensionLength:
                                  validCandidate &&
                                  (validCandidate.type === IntersectionType.WELLBORE ||
                                      validCandidate.type === IntersectionType.PLANNED_WELLBORE)
                                      ? validCandidate.extensionLength
                                      : defaultExtensionLength,
                          }
                        : {
                              type: IntersectionType.CUSTOM_POLYLINE,
                              name: base.name,
                              uuid: base.uuid,
                          };
                    props.onValueChange(newValue);
                    return;
                }

                props.onValueChange(null);
            }

            const options: ComboboxItem<string>[] = availableValues
                .filter((value) => value.type === type)
                .map((value) => {
                    return {
                        label: value.name,
                        value: value.uuid,
                    };
                });

            return (
                <div className="gap-x-3xs gap-y-2xs grid grid-cols-[max-content_minmax(0,1fr)] items-center">
                    <span>Type</span>
                    <Combobox
                        items={INTERSECTION_TYPE_OPTIONS}
                        value={type}
                        onValueChange={handleCategoryChange}
                        size="small"
                    />
                    <span>Source</span>
                    <ComboboxCompositions.WithBrowseButtons
                        items={options}
                        placeholder={
                            type === IntersectionType.CUSTOM_POLYLINE
                                ? "Select polyline..."
                                : type === IntersectionType.PLANNED_WELLBORE
                                  ? "Select planned wellbore..."
                                  : "Select wellbore..."
                        }
                        value={props.value?.uuid}
                        onValueChange={handleSelectionChange}
                        disabled={props.disabled}
                    />
                    <span>Extension</span>
                    <NumberInput
                        disabled={props.disabled || !enableExtensionLength}
                        value={immediateExtensionLength}
                        min={extensionLengthConfig?.min}
                        max={extensionLengthConfig?.max}
                        onValueChange={setExtensionLength}
                        scrubAdornment="m"
                        scrubAreaPosition="end"
                        allowWheelScrub
                    />
                </div>
            );
        };
    }

    overriddenValueRepresentation(args: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        const { value } = args;
        if (value === null) {
            return "-";
        }
        const typeLabel =
            value.type === IntersectionType.CUSTOM_POLYLINE
                ? "Polyline"
                : value.type === IntersectionType.PLANNED_WELLBORE
                  ? "Planned (SMDA)"
                  : "Drilled (SMDA)";
        return `${typeLabel}: "${value.name}"`;
    }
}
