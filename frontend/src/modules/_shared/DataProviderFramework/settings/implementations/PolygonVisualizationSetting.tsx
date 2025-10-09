import React from "react";

import { Button } from "@lib/components/Button";
import type { PolygonVisualizationSpec } from "@modules/_shared/components/PolygonVisualizationDialog";
import { PolygonVisualizationDialog } from "@modules/_shared/components/PolygonVisualizationDialog";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

export type { PolygonVisualizationSpec };

type ValueType = PolygonVisualizationSpec | null;

export class PolygonVisualizationSetting implements CustomSettingImplementation<ValueType, SettingCategory.STATIC> {
    defaultValue: ValueType = {
        color: "#007079",
        lineThickness: 2,
        fill: false,
    };

    getIsStatic(): boolean {
        return true;
    }

    isValueValid(value: ValueType): boolean {
        if (!value) return false;

        return (
            typeof value.color === "string" &&
            /^#[0-9A-Fa-f]{6}$/.test(value.color) &&
            typeof value.lineThickness === "number" &&
            value.lineThickness >= 0.5 &&
            value.lineThickness <= 10 &&
            typeof value.fill === "boolean"
        );
    }

    serializeValue(value: ValueType): string {
        if (!value) return JSON.stringify(this.defaultValue);
        return JSON.stringify(value);
    }

    deserializeValue?(serializedValue: string): ValueType {
        try {
            const parsed = JSON.parse(serializedValue);
            if (this.isValueValid(parsed)) {
                return parsed;
            }
        } catch {
            // Invalid JSON, fall back to default
        }
        return this.defaultValue;
    }

    fixupValue(value: ValueType): NonNullable<ValueType> {
        if (!value || !this.isValueValid(value)) {
            return this.defaultValue!;
        }
        return value;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.STATIC>) => React.ReactNode {
        return function PolygonVisualizationSettingComponent(
            props: SettingComponentProps<ValueType, SettingCategory.STATIC>,
        ) {
            const [dialogOpen, setDialogOpen] = React.useState(false);

            const currentValue = props.value ?? {
                color: "#000",
                lineThickness: 2,
                fill: false,
            };

            function handleOpenDialog() {
                setDialogOpen(true);
            }

            function handleCloseDialog() {
                setDialogOpen(false);
            }

            function handleValueChange(newValue: PolygonVisualizationSpec) {
                props.onValueChange(newValue);
            }

            return (
                <>
                    <Button onClick={handleOpenDialog} variant="outlined" size="small">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 border rounded-sm"
                                style={{
                                    backgroundColor: currentValue.fill ? currentValue.color : "transparent",
                                    borderColor: currentValue.color,
                                    borderWidth: `${Math.max(1, currentValue.lineThickness / 2)}px`,
                                }}
                            />
                            <span>
                                {currentValue.lineThickness}px {currentValue.fill ? "filled" : "outline"}
                            </span>
                        </div>
                    </Button>

                    <PolygonVisualizationDialog
                        open={dialogOpen}
                        onClose={handleCloseDialog}
                        value={currentValue}
                        onChange={handleValueChange}
                    />
                </>
            );
        };
    }

    overriddenValueRepresentation({ value }: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        if (!value) {
            return "-";
        }

        return (
            <div className="flex items-center gap-2 text-xs">
                <div
                    className="w-4 h-4 border rounded-sm"
                    style={{
                        backgroundColor: value.fill ? value.color : "transparent",
                        borderColor: value.color,
                        borderWidth: `${Math.max(1, value.lineThickness / 2)}px`,
                    }}
                />
                <span>
                    {value.lineThickness}px {value.fill ? "filled" : "outline"}
                </span>
            </div>
        );
    }
}
