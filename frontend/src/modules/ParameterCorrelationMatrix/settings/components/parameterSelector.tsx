import React from "react";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Select } from "@lib/components/Select";

type ParametersSelectorProps = {
    parameterIdents: ParameterIdent[];
    selectedParameterIdentStrings: string[];
    onChange: (selected: string[]) => void;
};
enum GroupType {
    NO_GROUP = "No Group",
    GROUP = "Group",
}
type GroupOption = {
    label: string;
    value: string;
    type: GroupType;
};
function ParametersSelector({
    parameterIdents,
    selectedParameterIdentStrings,
    onChange,
}: ParametersSelectorProps): React.ReactNode {
    const [selectedGroup, setSelectedGroup] = React.useState<GroupOption | null>(null);

    const [selectedParameterIdents, setSelectedParameterIdents] = React.useState<string[]>([]);

    const parameterGroups = Array.from(new Set(parameterIdents.map((p) => p.groupName)))
        .sort()
        .map((groupName) => ({
            label: groupName ?? GroupType.NO_GROUP,
            value: groupName ?? GroupType.NO_GROUP,
            type: groupName ? GroupType.GROUP : GroupType.NO_GROUP,
        }));

    const parametersInSelectedGroup = parameterIdents.filter((p) => p.groupName === selectedGroup);

    const parameterOptions = parametersInSelectedGroup.map((param) => ({
        label: param.name,
        value: param.toString(),
    }));

    const handleGroupChange = (groupName: string) => {
        const group = parameterGroups.find((group) => group.value === groupName);
        setSelectedGroup(group || null);
        onChange([]);
    };

    const handleParametersChanged = (selectedValues: string[]) => {
        setSelectedParameterIdents(selectedValues);
    };

    const parameterGroupOptions: DropdownOption[] = parameterGroups.map((group) => ({
        label: group.label,
        value: group.value,
    }));

    return (
        <div>
            <h3>Select a Group:</h3>
            <div style={{ marginBottom: "20px" }}>
                <Dropdown
                    options={parameterGroupOptions}
                    // value={selectedGroup.name ?? "No Group"}
                    onChange={handleGroupChange}
                    placeholder="Select a group..."
                />
            </div>

            {selectedGroup && parametersInSelectedGroup.length > 0 && (
                <div>
                    <Select
                        value={selectedParameterIdentStrings}
                        onChange={onChange}
                        options={parameterOptions}
                        multiple={true}
                        size={Math.min(10, parameterOptions.length > 0 ? parameterOptions.length : 1)}
                        filter
                        showQuickSelectButtons
                    />
                </div>
            )}
        </div>
    );
}

export default ParametersSelector;
