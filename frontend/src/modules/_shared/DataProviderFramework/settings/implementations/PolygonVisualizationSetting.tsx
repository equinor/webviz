import React from "react";

import { SettingConfigButton } from "@lib/components/SettingConfigButton/settingConfigButton";
import type { PolygonVisualizationSpec } from "@modules/_shared/components/PolygonVisualizationForm";
import { PolygonVisualizationForm } from "@modules/_shared/components/PolygonVisualizationForm";
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
        color: "#000000",
        lineThickness: 2,
        lineOpacity: 1,
        fill: false,
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
            typeof v.color === "string" &&
            typeof v.lineThickness === "number" &&
            typeof v.lineOpacity === "number" &&
            typeof v.fill === "boolean" &&
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
            /^#[0-9A-Fa-f]{6}$/.test(value.color) &&
            value.lineThickness >= 0.5 &&
            value.lineThickness <= 10 &&
            value.lineOpacity >= 0 &&
            value.lineOpacity <= 1 &&
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
                    className="w-full"
                    size="medium"
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
    return (
        <>
            <div
                className="size-5 border rounded-sm"
                style={{
                    backgroundColor: value.fill ? value.color : "transparent",
                    borderColor: value.color,
                    borderWidth: `${Math.max(2, value.lineThickness / 2)}px`,
                }}
            />
            <span className="shrink truncate">
                {value.lineThickness}px {value.fill ? "filled" : "outline"}
            </span>
        </>
    );
}
