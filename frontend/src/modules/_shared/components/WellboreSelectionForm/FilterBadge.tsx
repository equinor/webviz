import { Clear } from "@mui/icons-material";

interface FilterBadgeProps {
    value: string;
    label: string;
    colorClass: string;
    hoverClass: string;
    onRemove: () => void;
}

export function FilterBadge({ value, label, colorClass, hoverClass, onRemove }: FilterBadgeProps) {
    return (
        <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${colorClass}`}>
            {label}: {value}
            <Clear fontSize="inherit" className={`cursor-pointer rounded-full ${hoverClass}`} onClick={onRemove} />
        </div>
    );
}
