import React from "react";

import { DragIndicator } from "@mui/icons-material";
// import type { PlotData } from "plotly.js";

import type { ModuleViewProps } from "@framework/Module";
import { SortableList } from "@lib/components/SortableList";
// import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleType } from "@lib/utils/ColorScale";

import type { Interfaces } from "./interfaces";

const countryData = [
    "Belarus",
    17.5,
    "Moldova",
    16.8,
    "Lithuania",
    15.4,
    "Russia",
    15.1,
    "Romania",
    14.4,
    "Ukraine",
    13.9,
    "Andorra",
    13.8,
    "Hungary",
    13.3,
    "Czech Republic",
    13,
    "Slovakia",
    13,
    "Portugal",
    12.9,
    "Serbia",
    12.6,
    "Grenada",
    12.5,
    "Poland",
    12.5,
    "Latvia",
    12.3,
    "Finland",
    12.3,
    "South Korea",
    12.3,
    "France",
    12.2,
    "Australia",
    12.2,
    "Croatia",
    12.2,
    "Ireland",
    11.9,
    "Luxembourg",
    11.9,
    "Germany",
    11.8,
    "Slovenia",
    11.6,
    "United Kingdom",
    11.6,
    "Denmark",
    11.4,
    "Bulgaria",
    11.4,
    "Spain",
    11.2,
    "Belgium",
    11,
    "South Africa",
    11,
    "New Zealand",
    10.9,
    "Gabon",
    10.9,
    "Namibia",
    10.8,
    "Switzerland",
    10.7,
    "Saint Lucia",
    10.4,
    "Austria",
    10.3,
    "Estonia",
    10.3,
    "Greece",
    10.3,
    "Kazakhstan",
    10.3,
    "Canada",
    10.2,
    "Nigeria",
    10.1,
    "Netherlands",
    9.9,
    "Uganda",
    9.8,
    "Rwanda",
    9.8,
    "Chile",
    9.6,
    "Argentina",
    9.3,
    "Burundi",
    9.3,
    "United States",
    9.2,
    "Cyprus",
    9.2,
    "Sweden",
    9.2,
    "Venezuela",
    8.9,
    "Paraguay",
    8.8,
    "Brazil",
    8.7,
    "Sierra Leone",
    8.7,
    "Montenegro",
    8.7,
    "Belize",
    8.5,
    "Cameroon",
    8.4,
    "Botswana",
    8.4,
    "Saint Kitts and Nevis",
    8.2,
    "Guyana",
    8.1,
    "Peru",
    8.1,
    "Panama",
    8,
    "Niue",
    8,
    "Palau",
    7.9,
    "Norway",
    7.7,
    "Tanzania",
    7.7,
    "Georgia",
    7.7,
    "Uruguay",
    7.6,
    "Angola",
    7.5,
    "Laos",
    7.3,
    "Japan",
    7.2,
    "Mexico",
    7.2,
    "Ecuador",
    7.2,
    "Dominica",
    7.1,
    "Iceland",
    7.1,
    "Thailand",
    7.1,
    "Bosnia and Herzegovina",
    7.1,
    "Sao Tome and Principe",
    7.1,
    "Malta",
    7,
    "Albania",
    7,
    "Bahamas",
    6.9,
    "Dominican Republic",
    6.9,
    "Mongolia",
    6.9,
    "Cape Verde",
    6.9,
    "Barbados",
    6.8,
    "Burkina Faso",
    6.8,
    "Italy",
    6.7,
    "Trinidad and Tobago",
    6.7,
    "China",
    6.7,
    "Macedonia",
    6.7,
    "Saint Vincent and the Grenadines",
    6.6,
    "Equatorial Guinea",
    6.6,
    "Suriname",
    6.6,
    "Vietnam",
    6.6,
    "Lesotho",
    6.5,
    "Haiti",
    6.4,
    "Cook Islands",
    6.4,
    "Colombia",
    6.2,
    "Ivory Coast",
    6,
    "Bolivia",
    5.9,
    "Swaziland",
    5.7,
    "Zimbabwe",
    5.7,
    "Seychelles",
    5.6,
    "Cambodia",
    5.5,
    "Puerto Rico",
    5.4,
    "Netherlands Antilles",
    5.4,
    "Philippines",
    5.4,
    "Costa Rica",
    5.4,
    "Armenia",
    5.3,
    "Cuba",
    5.2,
    "Nicaragua",
    5,
    "Jamaica",
    4.9,
    "Ghana",
    4.8,
    "Liberia",
    4.7,
    "Uzbekistan",
    4.6,
    "Chad",
    4.4,
    "United Arab Emirates",
    4.3,
    "Kyrgyzstan",
    4.3,
    "India",
    4.3,
    "Turkmenistan",
    4.3,
    "Kenya",
    4.3,
    "Ethiopia",
    4.2,
    "Honduras",
    4,
    "Guinea-Bissau",
    4,
    "Zambia",
    4,
    "Republic of the Congo",
    3.9,
    "Guatemala",
    3.8,
    "Central African Republic",
    3.8,
    "North Korea",
    3.7,
    "Sri Lanka",
    3.7,
    "Mauritius",
    3.6,
    "Samoa",
    3.6,
    "Democratic Republic of the Congo",
    3.6,
    "Nauru",
    3.5,
    "Gambia",
    3.4,
    "Federated States of Micronesia",
    3.3,
    "El Salvador",
    3.2,
    "Fiji",
    3,
    "Papua New Guinea",
    3,
    "Kiribati",
    3,
    "Tajikistan",
    2.8,
    "Israel",
    2.8,
    "Sudan",
    2.7,
    "Malawi",
    2.5,
    "Lebanon",
    2.4,
    "Azerbaijan",
    2.3,
    "Mozambique",
    2.3,
    "Togo",
    2.3,
    "Nepal",
    2.2,
    "Brunei",
    2.1,
    "Benin",
    2.1,
    "Singapore",
    2,
    "Turkey",
    2,
    "Madagascar",
    1.8,
    "Solomon Islands",
    1.7,
    "Tonga",
    1.6,
    "Tunisia",
    1.5,
    "Tuvalu",
    1.5,
    "Qatar",
    1.5,
    "Vanuatu",
    1.4,
    "Djibouti",
    1.3,
    "Malaysia",
    1.3,
    "Syria",
    1.2,
    "Maldives",
    1.2,
    "Mali",
    1.1,
    "Eritrea",
    1.1,
    "Algeria",
    1,
    "Iran",
    1,
    "Oman",
    0.9,
    "Brunei",
    0.9,
    "Morocco",
    0.9,
    "Jordan",
    0.7,
    "Bhutan",
    0.7,
    "Guinea",
    0.7,
    "Burma",
    0.7,
    "Afghanistan",
    0.7,
    "Senegal",
    0.6,
    "Indonesia",
    0.6,
    "Timor-Leste",
    0.6,
    "Iraq",
    0.5,
    "Somalia",
    0.5,
    "Egypt",
    0.4,
    "Niger",
    0.3,
    "Yemen",
    0.3,
    "Comoros",
    0.2,
    "Saudi Arabia",
    0.2,
    "Bangladesh",
    0.2,
    "Kuwait",
    0.1,
    "Libya",
    0.1,
    "Mauritania",
    0.1,
    "Pakistan",
    0.1,
];

const countries: string[] = [];
const alcConsumption: number[] = [];

for (let i = 0; i < countryData.length; i += 2) {
    countries.push(countryData[i] as string);
    alcConsumption.push(countryData[i + 1] as number);
}

type ItemOrGroup = {
    id: string;
    type: "item" | "group";
    children?: ItemOrGroup[];
};

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const type = props.viewContext.useSettingsToViewInterfaceValue("type");
    const gradientType = props.viewContext.useSettingsToViewInterfaceValue("gradientType");
    const min = props.viewContext.useSettingsToViewInterfaceValue("min");
    const max = props.viewContext.useSettingsToViewInterfaceValue("max");
    const divMidPoint = props.viewContext.useSettingsToViewInterfaceValue("divMidPoint");
    const [items, setItems] = React.useState<ItemOrGroup[]>([
        {
            id: "Group 1",
            type: "group",
            children: [
                { id: "Item 1", type: "item" },
                { id: "Item 2", type: "item" },
            ],
        },
        {
            id: "Group 2",
            type: "group",
            children: [
                { id: "Item 3", type: "item" },
                { id: "Item 4", type: "item" },
                { id: "Item 5", type: "item" },
            ],
        },
    ]);

    // const ref = React.useRef<HTMLDivElement>(null);

    // const size = useElementSize(ref);

    const colorScale =
        type === ColorScaleType.Continuous
            ? props.workbenchSettings.useContinuousColorScale({
                  gradientType,
              })
            : props.workbenchSettings.useDiscreteColorScale({
                  gradientType,
              });

    colorScale.setRangeAndMidPoint(min, max, divMidPoint);

    /*
    const data: Partial<PlotData & { zmid: number }> = {
        ...colorScale.getAsPlotlyColorScaleMapObject(),
        type: "choropleth",
        locationmode: "country names",
        locations: countries,
        z: alcConsumption,
    };

    const layout = {
        mapbox: { style: "dark", center: { lon: -110, lat: 50 }, zoom: 0.8 },
        width: size.width,
        height: size.height,
        margin: { t: 0, b: 0 },
    };
    */

    function onMove(movedItemId: string, originId: string | null, destinationId: string | null, position: number) {
        // Update the items state based on the move
        setItems((prevItems) => {
            const newItems = [...prevItems];
            if (originId !== destinationId) {
                const originGroupIndex = newItems.findIndex((item) => item.id === originId && item.type === "group");
                const destinationGroupIndex = newItems.findIndex(
                    (item) => item.id === destinationId && item.type === "group",
                );
                const originGroupChildren = originGroupIndex !== -1 ? newItems[originGroupIndex].children : newItems;
                const destinationGroupChildren =
                    destinationGroupIndex !== -1 ? newItems[destinationGroupIndex].children : newItems;
                if (originGroupChildren && destinationGroupChildren) {
                    const movedItemIndex = originGroupChildren.findIndex((item) => item.id === movedItemId);
                    if (movedItemIndex !== -1) {
                        const [movedItem] = originGroupChildren.splice(movedItemIndex, 1);
                        destinationGroupChildren.splice(position, 0, movedItem);
                    }
                }
                return newItems;
            }
            const groupIndex = newItems.findIndex((item) => item.id === originId && item.type === "group");
            const groupChildren = groupIndex !== -1 ? newItems[groupIndex].children : newItems;
            if (!groupChildren) return newItems;
            const movedItemIndex = groupChildren.findIndex((item) => item.id === movedItemId);
            if (movedItemIndex !== -1) {
                groupChildren.splice(movedItemIndex, 1);
                groupChildren.splice(position, 0, { id: movedItemId, type: "item" });
            }
            return newItems;
        });
    }

    return (
        <div className="flex flex-col gap-4">
            <h2>Table</h2>
            <SortableList isMoveAllowed={() => true} onItemMoved={onMove}>
                <SortableList.ScrollContainer>
                    <div className="max-h-[150px] overflow-auto">
                        <table className="w-full table-fixed border-collapse">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr>
                                    <th></th>
                                    <th>Name</th>
                                    <th>Test</th>
                                </tr>
                            </thead>
                            <SortableList.Content>
                                <tbody>
                                    {items.map((item) => {
                                        if (item.type === "item") {
                                            return (
                                                <SortableList.Item key={item.id} id={item.id}>
                                                    <tr>
                                                        <td>
                                                            <SortableList.DragHandle>
                                                                <DragIndicator
                                                                    fontSize="inherit"
                                                                    className="pointer-events-none"
                                                                />
                                                            </SortableList.DragHandle>
                                                        </td>
                                                        <td>{item.id}</td>
                                                        <td>Test</td>
                                                    </tr>
                                                </SortableList.Item>
                                            );
                                        }
                                        if (item.type === "group") {
                                            return (
                                                <SortableList.Group key={item.id} id={item.id}>
                                                    <tr className="bg-gray-200">
                                                        <td colSpan={3} className="font-bold">
                                                            <table className="w-full">
                                                                <thead>
                                                                    <tr>
                                                                        <th>
                                                                            <SortableList.DragHandle>
                                                                                <DragIndicator
                                                                                    fontSize="inherit"
                                                                                    className="pointer-events-none"
                                                                                />
                                                                            </SortableList.DragHandle>
                                                                        </th>
                                                                        <th>Name</th>
                                                                        <th>Test</th>
                                                                    </tr>
                                                                </thead>
                                                                <SortableList.GroupContent>
                                                                    <tbody>
                                                                        {item.children &&
                                                                            item.children.map((child) => (
                                                                                <SortableList.Item
                                                                                    key={child.id}
                                                                                    id={child.id}
                                                                                >
                                                                                    <tr>
                                                                                        <td>
                                                                                            <SortableList.DragHandle>
                                                                                                <DragIndicator
                                                                                                    fontSize="inherit"
                                                                                                    className="pointer-events-none"
                                                                                                />
                                                                                            </SortableList.DragHandle>
                                                                                        </td>
                                                                                        <td>{child.id}</td>
                                                                                        <td>Test</td>
                                                                                    </tr>
                                                                                </SortableList.Item>
                                                                            ))}
                                                                    </tbody>
                                                                </SortableList.GroupContent>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </SortableList.Group>
                                            );
                                        }
                                    })}
                                </tbody>
                            </SortableList.Content>
                        </table>
                    </div>
                </SortableList.ScrollContainer>
            </SortableList>
            <h2>Divs</h2>
            <SortableList isMoveAllowed={() => true} onItemMoved={onMove}>
                <SortableList.Content>
                    <SortableList.ScrollContainer>
                        <div className="w-full h-32 overflow-auto">
                            {items.map((item) => {
                                if (item.type === "item") {
                                    return (
                                        <SortableList.Item key={item.id} id={item.id}>
                                            <div>
                                                <SortableList.DragHandle>
                                                    <DragIndicator fontSize="inherit" className="pointer-events-none" />
                                                </SortableList.DragHandle>
                                                <span className="flex-1">{item.id}</span>
                                            </div>
                                        </SortableList.Item>
                                    );
                                }
                                if (item.type === "group") {
                                    return (
                                        <SortableList.Group key={item.id} id={item.id}>
                                            <div className="bg-gray-200">
                                                <div className="flex gap-2">
                                                    <SortableList.DragHandle>
                                                        <DragIndicator
                                                            fontSize="inherit"
                                                            className="pointer-events-none"
                                                        />
                                                    </SortableList.DragHandle>
                                                    <span className="flex-1">{item.id}</span>
                                                </div>
                                                <SortableList.GroupContent>
                                                    <div>
                                                        {" "}
                                                        {item.children &&
                                                            item.children.map((child) => (
                                                                <SortableList.Item key={child.id} id={child.id}>
                                                                    <div>
                                                                        <SortableList.DragHandle>
                                                                            <DragIndicator
                                                                                fontSize="inherit"
                                                                                className="pointer-events-none"
                                                                            />
                                                                        </SortableList.DragHandle>
                                                                        <span className="flex-1">{child.id}</span>
                                                                    </div>
                                                                </SortableList.Item>
                                                            ))}
                                                    </div>
                                                </SortableList.GroupContent>
                                            </div>
                                        </SortableList.Group>
                                    );
                                }
                            })}
                        </div>
                    </SortableList.ScrollContainer>
                </SortableList.Content>
            </SortableList>
        </div>
    );

    /*
    return (
        <div ref={ref} className="w-full h-full">
            <Plot data={[data]} layout={layout} />
        </div>
    );
    */
}
