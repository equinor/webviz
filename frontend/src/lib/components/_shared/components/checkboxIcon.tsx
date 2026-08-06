import { CheckBox, CheckBoxOutlineBlank, IndeterminateCheckBox } from "@mui/icons-material";

export function CheckboxIcon(props: { checked?: boolean; intermediate?: boolean }) {
    if (props.checked) {
        return <CheckBox fontSize="inherit" />;
    }
    if (props.intermediate) {
        return <IndeterminateCheckBox fontSize="inherit" />;
    }

    return <CheckBoxOutlineBlank fontSize="inherit" />;
}
