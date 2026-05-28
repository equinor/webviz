export { RadioGroup } from "./_baseComponents/group";
export { Radio } from "./_baseComponents/radio";
import { GroupWithLabels } from "./_compositions/groupWithLabels";
import { WithLabel } from "./_compositions/withLabel";

export const RadioCompositions = {
    WithLabel,
    GroupWithLabels,
};

export type { WithLabelProps as RadioWithLabelProps } from "./_compositions/withLabel";
export type { GroupWithLabels as RadioGroupWithLabelsProps, RadioOption } from "./_compositions/groupWithLabels";

export type { RadioGroupProps } from "./_baseComponents/group";
export type { RadioProps } from "./_baseComponents/radio";
