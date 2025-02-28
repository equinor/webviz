import React from "react";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { CustomSettingImplementation, SettingComponentProps, ValueToStringArgs } from "../../interfaces";

type ValueType = RegularEnsembleIdent | null;
export class EnsembleSetting implements CustomSettingImplementation<ValueType> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Ensemble";
    }

    serializeValue(value: RegularEnsembleIdent | null): string {
        return value?.toString() ?? "";
    }

    deserializeValue(serializedValue: string): RegularEnsembleIdent | null {
        return serializedValue !== "" ? RegularEnsembleIdent.fromString(serializedValue) : null;
    }

    makeComponent(): (props: SettingComponentProps<RegularEnsembleIdent | null>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<RegularEnsembleIdent | null>) {
            const ensembles = props.globalSettings.ensembles.filter((ensemble) =>
                props.availableValues.includes(ensemble.getIdent())
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

    valueToString(args: ValueToStringArgs<RegularEnsembleIdent | null>): string {
        const { value, workbenchSession } = args;
        if (value === null) {
            return "-";
        }

        return workbenchSession.getEnsembleSet().findEnsemble(value)?.getDisplayName() ?? "-";
    }
}
