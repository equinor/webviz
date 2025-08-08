import { AuthenticationBoundary } from "@framework/internal/components/AuthenticationBoundary";
import { GlobalConfirmationDialog } from "@framework/internal/components/GlobalConfirmationDialog/globalConfirmationDialog";
import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

import { WorkbenchWrapper } from "./WorkbenchWrapper";

function App() {
    return (
        <div className="bg-gray-100">
            <GlobalConfirmationDialog />
            <AuthenticationBoundary>
                <WorkbenchWrapper />
            </AuthenticationBoundary>
        </div>
    );
}

export default App;
