import type React from "react";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import type { Setting, SettingComponentProps, ValueToStringArgs } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

export class EnsembleSetting implements Setting<RegularEnsembleIdent | null> {
    private _delegate: SettingDelegate<RegularEnsembleIdent | null>;

    constructor() {
        this._delegate = new SettingDelegate<RegularEnsembleIdent | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.ENSEMBLE;
    }

    getLabel(): string {
        return "Ensemble";
    }

    getDelegate(): SettingDelegate<RegularEnsembleIdent | null> {
        return this._delegate;
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

SettingRegistry.registerSetting(EnsembleSetting);
