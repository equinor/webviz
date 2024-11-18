import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { SettingType } from "./settingsTypes";

import { SettingRegistry } from "../../SettingRegistry";
import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps, ValueToStringArgs } from "../../interfaces";

export class Ensemble implements Setting<EnsembleIdent | null> {
    private _delegate: SettingDelegate<EnsembleIdent | null>;

    constructor() {
        this._delegate = new SettingDelegate<EnsembleIdent | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.ENSEMBLE;
    }

    getLabel(): string {
        return "Ensemble";
    }

    getDelegate(): SettingDelegate<EnsembleIdent | null> {
        return this._delegate;
    }

    serializeValue(value: EnsembleIdent | null): string {
        return value?.toString() ?? "";
    }

    deserializeValue(serializedValue: string): EnsembleIdent | null {
        return serializedValue !== "" ? EnsembleIdent.fromString(serializedValue) : null;
    }

    makeComponent(): (props: SettingComponentProps<EnsembleIdent | null>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<EnsembleIdent | null>) {
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

    valueToString(args: ValueToStringArgs<EnsembleIdent | null>): string {
        const { value, workbenchSession } = args;
        if (value === null) {
            return "-";
        }

        return workbenchSession.getEnsembleSet().findEnsemble(value)?.getDisplayName() ?? "-";
    }
}

SettingRegistry.registerSetting(Ensemble);
