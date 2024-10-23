import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { SettingRegistry } from "../../SettingRegistry";
import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

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
            const ensembles = props.workbenchSession
                .getEnsembleSet()
                .getEnsembleArr()
                .filter((ensemble) => props.availableValues.includes(ensemble.getIdent()));

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
}

SettingRegistry.registerSetting(Ensemble);
