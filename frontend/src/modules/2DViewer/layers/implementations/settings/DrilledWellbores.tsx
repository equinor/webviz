import React from "react";

import { WellboreHeader_api } from "@api";
import { Select, SelectOption } from "@lib/components/Select";

import { SettingRegistry } from "../../SettingRegistry";
import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

export class DrilledWellbores implements Setting<WellboreHeader_api[]> {
    private _delegate: SettingDelegate<WellboreHeader_api[]>;

    constructor() {
        this._delegate = new SettingDelegate<WellboreHeader_api[]>([], this);
    }

    getType(): SettingType {
        return SettingType.SMDA_WELLBORE_HEADERS;
    }

    getLabel(): string {
        return "Drilled wellbores";
    }

    getDelegate(): SettingDelegate<WellboreHeader_api[]> {
        return this._delegate;
    }

    fixupValue(availableValues: WellboreHeader_api[], currentValue: WellboreHeader_api[]): WellboreHeader_api[] {
        const matchingValues = currentValue.filter((value) =>
            availableValues.some((availableValue) => availableValue.wellboreUuid === value.wellboreUuid)
        );
        if (matchingValues.length === 0) {
            return availableValues;
        }
        return matchingValues;
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

SettingRegistry.registerSetting(DrilledWellbores);
