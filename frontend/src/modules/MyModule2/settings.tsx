import React from "react";

import { Dropdown, DropdownOptionOrGroup } from "@lib/components/Dropdown/dropdown";
import { Label } from "@lib/components/Label";
import { ArrowBackIosNew, ImageAspectRatioTwoTone } from "@mui/icons-material";

export function Settings(): React.ReactNode {
    const [selectedItem, setSelectedItem] = React.useState<string>();

    const options: DropdownOptionOrGroup<string>[] = [
        {
            value: "x1",
            label: "X:1",
        },

        {
            label: "GROUP 1",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" className="align-sub" />,
            options: [
                {
                    value: "v1",
                    label: "V:1 with a very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long name",
                },
                {
                    value: "v2",
                    label: "V:2",
                },
            ],
        },
        {
            label: "GROUP 2 with a very very very very very very very very very very very very very very very very very very very very very very long name",
            adornment: <ArrowBackIosNew fontSize="inherit" />,
            options: [
                {
                    value: "v3",
                    label: "V:3",
                },
                {
                    value: "v4",
                    label: "V:4",
                },
            ],
        },
        {
            value: "x2",
            label: "X:2",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
    ];

    return (
        <>
            <Label text="Dropdown">
                <Dropdown value={selectedItem} options={options} onChange={setSelectedItem} />
            </Label>

            <Label text="Dropdown">
                <p>Selection: {selectedItem ?? ""}</p>
            </Label>
        </>
    );
}

Settings.displayName = "Settings";
