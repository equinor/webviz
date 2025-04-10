import React from "react";

import { ArrowBackIosNew, ImageAspectRatioTwoTone } from "@mui/icons-material";

import { Dropdown, type DropdownOptionOrGroup } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";

export function Settings(): React.ReactNode {
    const [selectedItem, setSelectedItem] = React.useState<string>();

    const options: DropdownOptionOrGroup<string>[] = [
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
            // This empty group will log a warning
            label: "Empty group",
            options: [],
        },
        {
            value: "x1",
            label: "X:1",
        },
        {
            value: "x2",
            label: "X:2",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
        {
            value: "x3",
            label: "X:3",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
        {
            value: "x4",
            label: "X:4",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
        {
            value: "x5",
            label: "X:5",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
        {
            value: "x6",
            label: "X:6",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
        {
            value: "x7",
            label: "X:7",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
        {
            value: "x8",
            label: "X:8",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
        {
            value: "x9",
            label: "X:9",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
        {
            value: "x10",
            label: "X:10",
            adornment: <ImageAspectRatioTwoTone fontSize="inherit" />,
        },
    ];

    return (
        <>
            <Label text="Dropdown">
                <Dropdown value={selectedItem} options={options} onChange={setSelectedItem} showArrows />
            </Label>

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
