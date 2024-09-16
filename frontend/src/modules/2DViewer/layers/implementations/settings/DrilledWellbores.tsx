import React from "react";

import { WellboreHeader_api } from "@api";
import { Select, SelectOption } from "@lib/components/Select";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

export class DrilledWellbores implements Setting<WellboreHeader_api[]> {
    private _delegate: SettingDelegate<WellboreHeader_api[]> = new SettingDelegate<WellboreHeader_api[]>([]);

    getType(): SettingType {
        return SettingType.SMDA_WELLBORE_HEADERS;
    }

    getLabel(): string {
        return "Drilled wellbore trajectories";
    }

    getDelegate(): SettingDelegate<WellboreHeader_api[]> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<WellboreHeader_api[]>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<WellboreHeader_api[]>) {
            const options: SelectOption[] = props.availableValues.map((ident) => ({
                value: ident.wellboreUuid,
                label: ident.uniqueWellboreIdentifier,
            }));

            const handleChange = (selectedUuids: string[]) => {
                const selectedWellbores = props.availableValues.filter((ident) =>
                    selectedUuids.includes(ident.wellboreUuid)
                );
                props.onValueChange(selectedWellbores);
            };

            const selectedValues = props.value.map((ident) => ident.wellboreUuid);

            return (
                <Select
                    filter
                    options={options}
                    value={selectedValues}
                    onChange={handleChange}
                    disabled={props.isOverridden}
                    multiple={true}
                    size={5}
                />
            );
        };
    }
}

type WellboreHeaderSelectorProps = {
    wellboreHeaders: WellboreHeader_api[];
    selectedWellboreUuids: string[];
    onChange: (selectedWellboreUuids: string[]) => void;
};

export function WellboreHeaderSelector(props: WellboreHeaderSelectorProps): React.ReactNode {
    const options: SelectOption[] = props.wellboreHeaders.map((ident) => ({
        value: ident.wellboreUuid,
        label: ident.uniqueWellboreIdentifier,
    }));

    const handleChange = (selectedUuids: string[]) => {
        props.onChange(selectedUuids);
    };

    return (
        <Select
            options={options}
            value={props.selectedWellboreUuids}
            onChange={handleChange}
            multiple={true}
            size={10}
        />
    );
}
