export { Checkbox } from "./_baseComponents/checkbox";
export { CheckboxGroup } from "./_baseComponents/checkboxGroup";
import { GroupWithLabels } from "./_compositions/groupWithLabels";
import { WithLabel } from "./_compositions/withLabel";

export const CheckboxCompositions = {
    WithLabel,
    GroupWithLabels,
};

export type { CheckboxGroupProps } from "./_baseComponents/checkboxGroup";
export type { WithLabelProps as CheckboxWithLabelProps } from "./_compositions/withLabel";
export type {
    GroupWithLabelsProps as CheckboxGroupWithLabelsProps,
    CheckboxOption,
} from "./_compositions/groupWithLabels";
export type { CheckboxProps } from "./_baseComponents/checkbox";
