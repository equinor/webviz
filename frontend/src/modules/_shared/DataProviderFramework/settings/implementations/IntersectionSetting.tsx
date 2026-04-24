import React from "react";

import { IntersectionType } from "@framework/types/intersection";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Tooltip } from "@lib/components/Tooltip";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arraySingleSelect";

export type PolylineIntersectionSettingValue = {
    type: IntersectionType.CUSTOM_POLYLINE;
    name: string;
    uuid: string;
};

export type WellboreIntersectionSettingValue = {
    type: IntersectionType.WELLBORE;
    name: string;
    uuid: string;
    extensionLength?: number;
};

export type IntersectionSettingValue = PolylineIntersectionSettingValue | WellboreIntersectionSettingValue;

type ExtensionLengthConfig = {
    min: number;
    max: number;
    defaultValue?: number;
};

type ValueType = IntersectionSettingValue | null;
type ValueConstraintsType = IntersectionSettingValue[];

export class IntersectionSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    private _activeIntersectionType = IntersectionType.WELLBORE;
    private _cachedValueByIntersectionType: Record<IntersectionType, ValueType> = {
        [IntersectionType.WELLBORE]: null,
        [IntersectionType.CUSTOM_POLYLINE]: null,
    };
    private _extensionLengthConfig: ExtensionLengthConfig | null;

    constructor(options?: { extensionLength?: ExtensionLengthConfig }) {
        this._extensionLengthConfig = options?.extensionLength ?? null;
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

        // For wellbore type, default extensionLength to 0 if not present (backward compat)
        if (v.type === IntersectionType.WELLBORE && typeof v.extensionLength !== "number") {
            v.extensionLength = 0;
        }

        return parsed as ValueType;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<ValueType, IntersectionSettingValue>(
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
            const fixed = fixupValue<ValueType, IntersectionSettingValue>(
                currentValue,
                valueConstraintsForActiveType,
                (v) => v,
                (a, b) => a?.type === b?.type && a?.uuid === b?.uuid,
            );
            if (fixed && fixed.type === IntersectionType.WELLBORE) {
                const prevExtension =
                    currentValue?.type === IntersectionType.WELLBORE
                        ? currentValue.extensionLength
                        : defaultExtensionLength;
                return { ...fixed, extensionLength: prevExtension };
            }
            return fixed;
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

            function handleSelectionChange(selectedValue: string) {
                const selected = availableValues.find((v) => v.uuid === selectedValue) ?? null;
                if (!selected) {
                    setCachedValueForIntersectionType(type, null);
                    props.onValueChange(null);
                    return;
                }
                const newValue: IntersectionSettingValue =
                    selected.type === IntersectionType.WELLBORE
                        ? {
                              ...selected,
                              extensionLength:
                                  (props.value?.type === IntersectionType.WELLBORE
                                      ? props.value.extensionLength
                                      : null) ?? defaultExtensionLength,
                          }
                        : selected;
                setCachedValueForIntersectionType(type, newValue);
                props.onValueChange(newValue);
            }

            function handleCategoryChange(_: any, value: IntersectionSettingValue["type"]) {
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
                    const newValue: IntersectionSettingValue =
                        base.type === IntersectionType.WELLBORE
                            ? {
                                  ...base,
                                  extensionLength:
                                      validCandidate?.type === IntersectionType.WELLBORE
                                          ? validCandidate.extensionLength
                                          : defaultExtensionLength,
                              }
                            : base;
                    props.onValueChange(newValue);
                    return;
                }

                props.onValueChange(null);
            }

            function handleExtensionLengthChange(stringValue: string) {
                const numValue = Number(stringValue);
                if (props.value && props.value.type === IntersectionType.WELLBORE) {
                    const newValue = { ...props.value, extensionLength: numValue };
                    setCachedValueForIntersectionType(type, newValue);
                    props.onValueChange(newValue);
                }
            }

            const options: DropdownOption<string>[] = availableValues
                .filter((value) => value.type === type)
                .map((value) => {
                    return {
                        label: value.name,
                        value: value.uuid,
                    };
                });

            const disableExtensionLength = extensionLengthConfig === null || type !== IntersectionType.WELLBORE;

            return (
                <div className="flex flex-col gap-2 my-1">
                    <div className="flex items-center gap-2">
                        <span className="w-12 flex flex-col items-start">Type</span>
                        <RadioGroup
                            direction="horizontal"
                            options={[
                                {
                                    label: "Wellbore",
                                    value: IntersectionType.WELLBORE,
                                },
                                {
                                    label: "Polyline",
                                    value: IntersectionType.CUSTOM_POLYLINE,
                                },
                            ]}
                            value={type}
                            onChange={handleCategoryChange}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-12 flex flex-col items-start shrink-0">Source</span>
                        <div className="grow min-w-0">
                            <Dropdown<string>
                                options={options}
                                placeholder={
                                    type === IntersectionType.CUSTOM_POLYLINE
                                        ? "Select polyline..."
                                        : "Select wellbore..."
                                }
                                value={!props.isOverridden ? props.value?.uuid : props.overriddenValue?.uuid}
                                onChange={handleSelectionChange}
                                disabled={props.isOverridden}
                                showArrows
                            />
                        </div>
                    </div>
                    <Tooltip
                        title={
                            disableExtensionLength
                                ? "Extension length is only applicable for wellbore intersections"
                                : ""
                        }
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-12 flex flex-col items-start">Extension</span>
                            <Input
                                disabled={disableExtensionLength || props.isOverridden}
                                type="number"
                                value={
                                    !props.isOverridden
                                        ? props.value?.type === IntersectionType.WELLBORE
                                            ? props.value.extensionLength
                                            : defaultExtensionLength
                                        : props.overriddenValue?.type === IntersectionType.WELLBORE
                                          ? props.overriddenValue.extensionLength
                                          : defaultExtensionLength
                                }
                                min={extensionLengthConfig?.min}
                                max={extensionLengthConfig?.max}
                                debounceTimeMs={200}
                                onValueChange={handleExtensionLengthChange}
                            />
                        </div>
                    </Tooltip>
                </div>
            );
        };
    }

    overriddenValueRepresentation(args: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        const { value } = args;
        if (value === null) {
            return "-";
        }
        return `${value.type === IntersectionType.WELLBORE ? "Wellbore" : "Polyline"}: "${value.name}"`;
    }
}
