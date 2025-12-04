import { Button } from "@lib/components/Button";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

interface FilterSelectProps {
    label: string;
    value: string[];
    options: SelectOption[];
    placeholder: string;
    uniqueValues: string[];
    onChange: (values: string[]) => void;
    onClear: () => void;
}

export function FilterSelect({
    label,
    value,
    options,
    placeholder,
    uniqueValues,
    onChange,
    onClear,
}: FilterSelectProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                {value.length > 0 && (
                    <Button
                        size="small"
                        variant="text"
                        onClick={onClear}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        Clear
                    </Button>
                )}
            </div>
            <Select
                options={options}
                value={value}
                onChange={onChange}
                multiple
                placeholder={placeholder}
                size={Math.min(4, uniqueValues.length)}
                filter
            />
        </div>
    );
}
