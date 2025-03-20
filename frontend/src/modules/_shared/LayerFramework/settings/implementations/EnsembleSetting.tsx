import React from "react";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { SettingCategory } from "../settingsDefinitions";

type ValueType = RegularEnsembleIdent | null;
export class EnsembleSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_OPTION> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Ensemble";
    }

    serializeValue(value: ValueType): string {
        return value?.toString() ?? "";
    }

    deserializeValue(serializedValue: string): ValueType {
        return serializedValue !== "" ? RegularEnsembleIdent.fromString(serializedValue) : null;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) => React.ReactNode {
        return function EnsembleSelect(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) {
            const availableValues = props.availableValues ?? [];

            const ensembles = props.globalSettings.ensembles.filter((ensemble) =>
                availableValues.includes(ensemble.getIdent())
            );

            return (
                <EnsembleDropdown
                    ensembles={ensembles}
                    value={!props.isOverridden ? props.value : props.overriddenValue}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }

    overriddenValueRepresentation(args: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        const { value, workbenchSession } = args;
        if (value === null) {
            return "-";
        }

        return workbenchSession.getEnsembleSet().findEnsemble(value)?.getDisplayName() ?? "-";
    }
}
