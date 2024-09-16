import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

export class Ensemble implements Setting<EnsembleIdent | null> {
    private _delegate: SettingDelegate<EnsembleIdent | null> = new SettingDelegate<EnsembleIdent | null>(null);

    getType(): SettingType {
        return SettingType.ENSEMBLE;
    }

    getLabel(): string {
        return "Ensemble";
    }

    getDelegate(): SettingDelegate<EnsembleIdent | null> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<EnsembleIdent | null>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<EnsembleIdent | null>) {
            const { onValueChange } = props;
            const ensembleSet = useEnsembleSet(props.workbenchSession);

            React.useEffect(
                function onMountEffect() {
                    if (props.value === null) {
                        onValueChange(ensembleSet.getEnsembleArr()[0]?.getIdent() ?? null);
                    }
                },
                [onValueChange, ensembleSet, props.value]
            );

            return (
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={!props.isOverridden ? props.value : props.overriddenValue}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
