import { Frequency_api } from "@api";
import { DropdownOption } from "@lib/components/Dropdown";

export function makeFrequencyDropdownOptions(): DropdownOption[] {
    // TODO: Consider iterating over values, using lower case and set first char upper case
    // const options = Object.values(Frequency_api).map((val: Frequency_api) => {
    //     return { value: val, label: val.toLocaleLowerCase() };
    // });

    const options: DropdownOption[] = [
        { value: "RAW", label: "None (raw)" },
        { value: Frequency_api.DAILY, label: "Daily" },
        { value: Frequency_api.MONTHLY, label: "Monthly" },
        { value: Frequency_api.QUARTERLY, label: "Quarterly" },
        { value: Frequency_api.YEARLY, label: "Yearly" },
    ];
    return options;
}
