import type { ReactNode } from "react";

import { useAtom } from "jotai";

import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";

import { getFieldIssueText } from "../../../utils/setupReadiness";
import { earlyValueConfigurationAtom } from "../../atoms/baseAtoms";
import { EARLY_VALUE_END_YEAR_HELP, EARLY_VALUE_HELP } from "../../helpTexts";
import { setupFieldClassName, type SettingsSectionProps } from "../../settingsSections";

function toCalendarYear(value: number | null): number | null {
    return value === null ? null : Math.round(value);
}

export function EarlyCashFlowComparisonSection(props: SettingsSectionProps): ReactNode {
    const [earlyValueConfiguration, setEarlyValueConfiguration] = useAtom(earlyValueConfigurationAtom);

    return (
        <Setting.Section {...props.sectionProps}>
            <Setting.Field help={{ title: "Early value", content: EARLY_VALUE_HELP }}>
                <CheckboxCompositions.WithLabel
                    label="Early value"
                    checked={earlyValueConfiguration.enabled}
                    onCheckedChange={(enabled) => setEarlyValueConfiguration((current) => ({ ...current, enabled }))}
                    size="small"
                />
            </Setting.Field>
            <Setting.Field
                label="Calculate through year"
                contentClassName={`${setupFieldClassName("earlyYear")} max-w-40`}
                warningAnnotation={getFieldIssueText(props.readiness, "earlyYear")}
                help={{ title: "Calculate through year", content: EARLY_VALUE_END_YEAR_HELP }}
                stacked
            >
                <NumberInput
                    value={earlyValueConfiguration.endYear}
                    layoutClassName="[&_input]:text-right"
                    placeholder="Enter year"
                    min={1900}
                    max={2200}
                    step={1}
                    format={{ useGrouping: false }}
                    disabled={!earlyValueConfiguration.enabled}
                    onValueChange={(endYear) =>
                        setEarlyValueConfiguration((current) => ({
                            ...current,
                            endYear: toCalendarYear(endYear),
                        }))
                    }
                />
            </Setting.Field>
        </Setting.Section>
    );
}
