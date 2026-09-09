import type React from "react";

import { SurfaceStandardResult_api } from "@api";
import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import type { SurfaceAttribute } from "@modules/_shared/Surface";
import { getSurfaceAttributeDisplayLabel, isSameAttribute, surfaceAttributeKey } from "@modules/_shared/Surface";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

import { fixupValue, isValueValid, makeValueConstraintsIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

type ValueType = SurfaceAttribute | null;
type ValueConstraintsType = SurfaceAttribute[];

// Suffix used by the metadata endpoint before structured attributes; a legacy persisted value may still carry it.
const LEGACY_STD_RES_ATTRIBUTE_SUFFIX = " (standard result)";
const SURFACE_STANDARD_RESULT_VALUES: string[] = Object.values(SurfaceStandardResult_api);

export class SurfaceAttributeSetting
    implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType>
{
    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>(isSameAttribute);

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed: unknown = JSON.parse(serializedValue);

        if (parsed === null) {
            return null;
        }

        // One-time upgrade path for state saved before structured attributes existed, where the
        // value was a plain string: a tagname, or a standard result suffixed as "<name> (standard
        // result)". Keep until saved sessions/bookmarks from before this change are no longer supported.
        if (typeof parsed === "string") {
            return upgradeLegacyStringValue(parsed);
        }

        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Expected a surface attribute object or null");
        }

        return assertSurfaceAttribute(parsed as Record<string, unknown>);
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<SurfaceAttribute, SurfaceAttribute>(value, valueConstraints, (v) => v, isSameAttribute);
    }

    fixupValue(value: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<SurfaceAttribute, SurfaceAttribute>(value, valueConstraints, (v) => v, isSameAttribute);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function SurfaceAttributeComponent(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const valueConstraints = props.valueConstraints ?? [];

            // Combobox keys entries by value identity; attribute objects must be looked up by a stable key instead.
            const items: ComboboxItem<string>[] = valueConstraints.map((attribute) => ({
                value: surfaceAttributeKey(attribute),
                label: getSurfaceAttributeDisplayLabel(attribute),
            }));

            const currentKey = props.value ? surfaceAttributeKey(props.value) : "";

            function handleChange(selectedKey: string | null) {
                const selected = valueConstraints.find((attribute) => surfaceAttributeKey(attribute) === selectedKey);
                props.onValueChange(selected ?? null);
            }

            return <Combobox items={items} value={currentKey} onValueChange={handleChange} disabled={props.disabled} />;
        };
    }
}

function upgradeLegacyStringValue(value: string): ValueType {
    if (value.endsWith(LEGACY_STD_RES_ATTRIBUTE_SUFFIX)) {
        const stdResName = value.slice(0, -LEGACY_STD_RES_ATTRIBUTE_SUFFIX.length);
        if (SURFACE_STANDARD_RESULT_VALUES.includes(stdResName)) {
            return { kind: "STDRES", std_res_name: stdResName as SurfaceStandardResult_api, sub_name: null };
        }
    }

    return { kind: "TAGNAME", tag_name: value };
}

function assertSurfaceAttribute(value: Record<string, unknown>): SurfaceAttribute {
    if (value.kind === "TAGNAME") {
        if (typeof value.tag_name !== "string") {
            throw new Error("Expected a TAGNAME attribute with a string tag_name");
        }
        return { kind: "TAGNAME", tag_name: value.tag_name };
    }

    if (value.kind === "STDRES") {
        if (typeof value.std_res_name !== "string" || !SURFACE_STANDARD_RESULT_VALUES.includes(value.std_res_name)) {
            throw new Error("Expected a STDRES attribute with a recognized std_res_name");
        }
        if (value.sub_name !== undefined && value.sub_name !== null && typeof value.sub_name !== "string") {
            throw new Error("Expected sub_name to be a string or null");
        }
        return {
            kind: "STDRES",
            std_res_name: value.std_res_name as SurfaceStandardResult_api,
            sub_name: (value.sub_name as string | null | undefined) ?? null,
        };
    }

    throw new Error("Expected an object with kind TAGNAME or STDRES");
}
