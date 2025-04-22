import { FilterCenterFocus } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Toolbar as GenericToolbar } from "@modules/_shared/components/Toolbar";

export type ToolbarProps = {
    onFitInView: () => void;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    function handleFitInViewClick() {
        props.onFitInView();
    }

    return (
        <GenericToolbar>
            <Button onClick={handleFitInViewClick} title="Focus top view">
                <FilterCenterFocus fontSize="inherit" />
            </Button>
        </GenericToolbar>
    );
}
