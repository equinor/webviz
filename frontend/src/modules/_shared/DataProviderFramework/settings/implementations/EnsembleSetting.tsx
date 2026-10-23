import type React from "react";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { getEnsembleIdentFromString } from "@framework/utils/ensembleIdentUtils";
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

type EnsembleIdent = RegularEnsembleIdent | DeltaEnsembleIdent;
type ValueType = EnsembleIdent | null;
type ValueConstraintsType = EnsembleIdent[];

export class EnsembleSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    defaultValue: ValueType = null;
    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>((a, b) => a.equals(b));

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<EnsembleIdent, EnsembleIdent>(
            value,
            valueConstraints,
            (v) => v,
            (a, b) => a.equals(b),
        );
    }

    fixupValue(value: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<EnsembleIdent, EnsembleIdent>(value, valueConstraints, (v) => v);
    }

    serializeValue(value: ValueType): string {
        return value?.toString() ?? "";
    }

    deserializeValue(serializedValue: string): ValueType {
        return serializedValue !== "" ? getEnsembleIdentFromString(serializedValue) : null;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function EnsembleSelect(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const availableValues = props.valueConstraints ?? [];

            const ensembles = [...props.globalSettings.ensembles, ...props.globalSettings.deltaEnsembles].filter(
                (ensemble) => availableValues.some((value) => value.equals(ensemble.getIdent())),
            );

            const ensembleRealizationFilterFunction = useEnsembleRealizationFilterFunc(props.workbenchSession);

            return (
                <EnsembleDropdown
                    ensembles={ensembles}
                    allowDeltaEnsembles
                    ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                    value={props.value}
                    onValueChange={props.onValueChange}
                    disabled={props.disabled}
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
