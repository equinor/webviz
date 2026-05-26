import React from "react";

import { SettingConfigButton } from "@lib/components/SettingConfigButton/settingConfigButton";
import type { PolygonVisualizationSpec } from "@modules/_shared/components/PolygonVisualizationForm";
import { PolygonVisualizationForm, PolylinePreview } from "@modules/_shared/components/PolygonVisualizationForm";
import { LabelPositionType } from "@modules/_shared/DataProviderFramework/visualization/deckgl/polygonUtils";

import type {
    OverriddenValueRepresentationArgs,
    StaticSettingComponentProps,
    StaticSettingImplementation,
} from "../../interfacesAndTypes/customSettingImplementation";

export type { PolygonVisualizationSpec };

type ValueType = PolygonVisualizationSpec | null;

export class PolygonVisualizationSetting implements StaticSettingImplementation<ValueType> {
    defaultValue: ValueType = {
        colorsLinked: true,
        hasStroke: true,
        strokeColor: "#000000",
        strokeWeight: 2,
        strokeOpacity: 1,
        hasFill: false,
        fillColor: "#000000",
        fillOpacity: 0.5,
        showLabels: false,
        labelPosition: LabelPositionType.CENTROID,
        labelColor: "#FFFFFF",
    };

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    getIsStatic(): true {
        return true;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        if (value === null) {
            return true;
        }

        if (typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const v = value as Record<string, unknown>;
        return (
            typeof v.colorsLinked === "boolean" &&
            typeof v.hasStroke === "boolean" &&
            typeof v.strokeColor === "string" &&
            typeof v.strokeWeight === "number" &&
            typeof v.strokeOpacity === "number" &&
            typeof v.hasFill === "boolean" &&
            typeof v.fillColor === "string" &&
            typeof v.fillOpacity === "number" &&
            typeof v.showLabels === "boolean" &&
            typeof v.labelPosition === "string" &&
            typeof v.labelColor === "string"
        );
    }

    isValueValid(value: ValueType): boolean {
        if (!value) return false;

        const validLabelPositions = Object.values(LabelPositionType);

        return (
            /^#[0-9A-Fa-f]{6}$/.test(value.strokeColor) &&
            value.strokeWeight >= 0.5 &&
            value.strokeWeight <= 10 &&
            value.strokeOpacity >= 0 &&
            value.strokeOpacity <= 1 &&
            value.fillOpacity >= 0 &&
            value.fillOpacity <= 1 &&
            validLabelPositions.includes(value.labelPosition as LabelPositionType) &&
            /^#[0-9A-Fa-f]{6}$/.test(value.labelColor)
        );
    }

    serializeValue(value: ValueType): string {
        if (!value) return JSON.stringify(this.defaultValue);
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        try {
            const parsed = JSON.parse(serializedValue);
            if (this.isValueValid(parsed)) {
                return parsed;
            }
            return this.defaultValue;
        } catch {
            // Invalid JSON, fall back to default
            return this.defaultValue;
        }
    }

    fixupValue(value: ValueType): ValueType {
        if (!value || !this.isValueValid(value)) {
            return this.defaultValue;
        }
        return value;
    }

    makeComponent(): (props: StaticSettingComponentProps<ValueType>) => React.ReactNode {
        const fixupFunc = this.fixupValue.bind(this);

        return function PolygonVisualizationSettingComponent(props: StaticSettingComponentProps<ValueType>) {
            const currentValue = fixupFunc(props.value);

            const [localFormValue, setLocalFormValue] = React.useState<PolygonVisualizationSpec | null>(null);

            function handleConfigOpen() {
                setLocalFormValue(currentValue);
            }

            function handleApplyConfig() {
                props.onValueChange(localFormValue);
            }

            function handleDiscardConfig() {
                setLocalFormValue(null);
            }

            return (
                <SettingConfigButton
                    layoutClassName="w-full"
                    formTitle="Polygon Visualization Settings"
                    title="Configure visualization"
                    formContent={
                        localFormValue && (
                            <PolygonVisualizationForm value={localFormValue} onChange={setLocalFormValue} />
                        )
                    }
                    onOpen={handleConfigOpen}
                    onDiscard={handleDiscardConfig}
                    onApply={handleApplyConfig}
                >
                    {currentValue && <VisualizationPreview value={currentValue} />}
                </SettingConfigButton>
            );
        };
    }

    overriddenValueRepresentation({ value }: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        if (!value) {
            return "-";
        }

        return (
            <div className="flex items-center gap-2 text-xs">
                <VisualizationPreview value={value} />
            </div>
        );
    }
}

function VisualizationPreview({ value }: { value: PolygonVisualizationSpec }) {
    const parts: string[] = [];
    if (value.hasStroke) {
        parts.push(`stroke ${value.strokeWeight}px ${Math.round(value.strokeOpacity * 100)}%`);
    }
    if (value.hasFill) {
        parts.push(`fill ${Math.round(value.fillOpacity * 100)}%`);
    }
    if (value.showLabels) {
        parts.push("labels");
    }

    return (
        <>
            <PolylinePreview spec={value} className="mr-horizontal-2xs h-6 w-auto shrink-0" />
            <span className="shrink truncate">{parts.length > 0 ? parts.join(" · ") : "none"}</span>
        </>
    );
}
