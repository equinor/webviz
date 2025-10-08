import type React from "react";

import { AccountCircle, ContentCopy } from "@mui/icons-material";

import { CircularProgress } from "@lib/components/CircularProgress";

import { useUserInfoQuery } from "./_queries";

type CaseNameAndIdCellProps = {
    caseName: string;
    caseId: string;
};

export function CaseNameAndIdCell(props: CaseNameAndIdCellProps): React.ReactNode {
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

type UserAvatarProps = {
    userEmail: string;
};

export function UserAvatar(props: UserAvatarProps): React.ReactNode {
    const userInfo = useUserInfoQuery(props.userEmail);

    if (userInfo.isFetching) {
        return <CircularProgress size="medium-small" className="mr-1" />;
    }

    if (userInfo.data?.avatar_b64str) {
        return (
            <img
                src={`data:image/png;base64,${userInfo.data.avatar_b64str}`}
                alt="Avatar"
                className="w-5 h-5 rounded-full mr-1"
                title={props.userEmail}
            />
        );
    }
    return (
        <span title={props.userEmail}>
            <AccountCircle className="w-5 h-5 mr-1" />
        </span>
    );
}
