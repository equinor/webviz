import { ContentCopy } from "@mui/icons-material";

export function CaseNameAndIdCell(props: { caseName: string; caseId: string }) {
    return (
        <div className="group relative flex items-center min-w-0" title={`${props.caseName} - ${props.caseId}`}>
            {/* Content wrapper that controls overflow */}
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                {props.caseName}
                <span className="text-xs text-slate-500"> - {props.caseId}</span>
            </div>

            {/* Copy button, hidden until hover */}
            <button
                className={`absolute right-1 px-1 text-slate-400 hover:text-slate-600
                          group-hover:bg-slate-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                title="Copy case uuid to clipboard"
                onClick={() => navigator.clipboard.writeText(`${props.caseId}`)}
            >
                <ContentCopy fontSize="inherit" />
            </button>
        </div>
    );
}
