import { RadioButtonChecked, RadioButtonUnchecked } from "@mui/icons-material";

export function RadioButtonIcon(props: { checked?: boolean }) {
    if (props.checked) {
        return <RadioButtonChecked fontSize="inherit" />;
    }
    return <RadioButtonUnchecked fontSize="inherit" />;
}
