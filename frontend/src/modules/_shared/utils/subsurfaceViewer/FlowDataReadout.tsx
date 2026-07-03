import React from "react";

import { ChevronRight } from "@mui/icons-material";
import { defaults } from "lodash-es";

import type { FlowDataColors, InjectionPhase, ProductionPhase } from "@framework/types/wellbore";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { FLOW_COLORS } from "@modules/_shared/constants/colors";

import { formatNumber } from "../numberFormatting";

export type ProductionReadoutValue = Partial<Record<ProductionPhase, number>>;
export type InjectionReadoutValue = Partial<Record<InjectionPhase, number>>;

type Phase = "injection" | "production";

export type FlowDataReadoutProps = {
    phase: Phase;
    name: string;
    oil?: number;
    gas?: number;
    water?: number;
    colors?: FlowDataColors;
};

const COLORS = {
    production: {
        oil: FLOW_COLORS.oil_production,
        gas: FLOW_COLORS.gas_production,
        water: FLOW_COLORS.water_production,
    },
    injection: {
        oil: "",
        gas: FLOW_COLORS.gas_injection,
        water: FLOW_COLORS.water_injection,
    },
};

export function FlowDataReadout(props: FlowDataReadoutProps): React.ReactNode {
    const [collapsed, setCollapsed] = React.useState(true);

    if (props.oil == null && props.gas == null && props.water == null) return null;

    const colorConf = defaults({}, props.colors, COLORS[props.phase]);

    return (
        <div className="-ml-2 text-xs">
            <button
                className={resolveClassNames(
                    "pl-2 pr-1 rounded-r-sm flex items-center gap-2 hover:bg-gray-300 w-full",
                    { "bg-gray-300": !collapsed },
                )}
                onClick={() => setCollapsed(!collapsed)}
            >
                <p className="--readout-label"> {props.name}: </p>

                <p
                    // We keep the element here to avoid the element width changing too much
                    className={resolveClassNames("text-nowrap whitespace-nowrap", {
                        invisible: !collapsed,
                    })}
                >
                    <InlineFlowValueText value={props.oil} color={colorConf.oil} />
                    <span className="first-of-type:hidden [:where(&+&)]:hidden"> | </span>
                    <InlineFlowValueText value={props.gas} color={colorConf.gas} />
                    <span className="first-of-type:hidden [:where(&+&)]:hidden"> | </span>
                    <InlineFlowValueText value={props.water} color={colorConf.water} />
                </p>

                <ChevronRight className="ml-auto" fontSize="inherit" />
            </button>

            {!collapsed && (
                <ul className="bg-gray-200 px-2 w-full space-y-1">
                    <FlowValueText value={props.oil} name="Oil" color={colorConf.oil} unit="Sm³" />
                    <FlowValueText value={props.gas} name="Gas" color={colorConf.gas} unit="Sm³" />
                    <FlowValueText value={props.water} name="Water" color={colorConf.water} unit="m³" />
                </ul>
            )}
        </div>
    );
}

function InlineFlowValueText(props: { value?: number; color: string }): React.ReactNode {
    if (props.value == null) return null;

    const formattedValue = formatNumber(props.value, { maxNumDecimalPlaces: 1 });

    return <span style={{ color: props.color }}>{formattedValue}</span>;
}

function FlowValueText(props: { value?: number; name: string; color: string; unit: string }): React.ReactNode {
    if (props.value == null) return null;

    const formattedValue = formatNumber(props.value, { maxNumDecimalPlaces: 3 });

    return (
        <li className="flex items-center gap-2">
            <div className="size-4 rounded" style={{ backgroundColor: props.color }} />
            <span className="font-bold">{props.name}</span> - {formattedValue} {props.unit}
        </li>
    );
}

type FlowReadoutArgs = Pick<FlowDataReadoutProps, "colors">;

export function renderProductionReadout(name: string, value: ProductionReadoutValue, args: FlowReadoutArgs = {}) {
    return (
        <FlowDataReadout name={name} phase="production" oil={value.oil} gas={value.gas} water={value.water} {...args} />
    );
}

export function renderInjectionReadout(name: string, value: InjectionReadoutValue, args: FlowReadoutArgs = {}) {
    return <FlowDataReadout name={name} phase="injection" gas={value.gas} water={value.water} {...args} />;
}
