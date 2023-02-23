import React from "react";
import ReactDOM from "react-dom";

import { Input } from "../Input";
import { withDefaults } from "../_utils/components";

export type DropdownProps = {
    options: { value: string; label: string }[];
    value?: string;
    onChange?: (value: string) => void;
    filter?: boolean;
};

const defaultProps = {
    value: "",
    filter: false,
};

export const Dropdown = withDefaults()(defaultProps, (props) => {
    return (
        <div>
            <Input />
            {ReactDOM.createPortal(<div>Hello</div>, document.body)}
        </div>
    );
});
