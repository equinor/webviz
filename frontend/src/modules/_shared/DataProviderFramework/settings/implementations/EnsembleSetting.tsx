import type React from "react";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

type ValueType = RegularEnsembleIdent | null;
type ValueRangeType = RegularEnsembleIdent[];

export class EnsembleSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    defaultValue: ValueType = null;
    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<RegularEnsembleIdent[]>();

    isValueValid(value: ValueType, valueRange: ValueRangeType): boolean {
        return isValueValid<RegularEnsembleIdent, RegularEnsembleIdent>(value, valueRange, (v) => v);
    }

    fixupValue(value: ValueType, valueRange: ValueRangeType): ValueType {
        return fixupValue<RegularEnsembleIdent, RegularEnsembleIdent>(value, valueRange, (v) => v);
    }

    serializeValue(value: ValueType): string {
        return value?.toString() ?? "";
    }

    deserializeValue(serializedValue: string): ValueType {
        return serializedValue !== "" ? RegularEnsembleIdent.fromString(serializedValue) : null;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        return function EnsembleSelect(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const availableValues = props.valueRange ?? [];

            const ensembles = props.globalSettings.ensembles.filter((ensemble) =>
                availableValues.some((value) => value.equals(ensemble.getIdent())),
            );

            return (
                <EnsembleDropdown
                    ensembles={ensembles}
                    ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(props.workbenchSession)}
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
