import type { DropdownOption, DropdownOptionOrGroup } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType<T extends string> = T | null;

export class StaticDropdownStringSetting<T extends string = string>
    implements CustomSettingImplementation<ValueType<T>, SettingCategory.SINGLE_SELECT>
{
    private _staticOptions: DropdownOptionOrGroup<ValueType<T>>[];

    constructor(props: { options?: ValueType<T>[] | DropdownOption<T>[] }) {
        const options = props.options ?? [];

        this._staticOptions = options.map((opt) => {
            if (opt === null) return { label: "None", value: null };
            if (typeof opt === "string") return { label: opt, value: opt };
            return opt;
        });
    }

    getIsStatic() {
        return true;
    }

    makeComponent(): (props: SettingComponentProps<ValueType<T>, SettingCategory.SINGLE_SELECT>) => React.ReactNode {
        const staticOptions = this._staticOptions;

        return function DropdownStringSetting(
            props: SettingComponentProps<ValueType<T>, SettingCategory.SINGLE_SELECT>,
        ) {
            const options = staticOptions;

            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value : props.overriddenValue}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
