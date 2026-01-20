import type React from "react";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";

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

type ValueType = RegularEnsembleIdent | null;
type ValueConstraintsType = RegularEnsembleIdent[];

export class EnsembleSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    defaultValue: ValueType = null;
    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<RegularEnsembleIdent[]>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<RegularEnsembleIdent, RegularEnsembleIdent>(
            value,
            valueConstraints,
            (v) => v,
            (a, b) => a.equals(b),
        );
    }

    fixupValue(value: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<RegularEnsembleIdent, RegularEnsembleIdent>(value, valueConstraints, (v) => v);
    }

    serializeValue(value: ValueType): string {
        return value?.toString() ?? "";
    }

    deserializeValue(serializedValue: string): ValueType {
        return serializedValue !== "" ? RegularEnsembleIdent.fromString(serializedValue) : null;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function EnsembleSelect(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const availableValues = props.valueConstraints ?? [];

            const ensembles = props.globalSettings.ensembles.filter((ensemble) =>
                availableValues.some((value) => value.equals(ensemble.getIdent())),
            );

            const ensembleRealizationFilterFunction = useEnsembleRealizationFilterFunc(props.workbenchSession);

            return (
                <EnsembleDropdown
                    ensembles={ensembles}
                    ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
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
