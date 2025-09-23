import { AuthenticationBoundary } from "@framework/internal/components/AuthenticationBoundary";
import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

import { WorkbenchWrapper } from "./framework/internal/components/WorkbenchWrapper/workbenchWrapper";

function App() {
    return (
        <div className="bg-gray-100">
            <AuthenticationBoundary>
                <WorkbenchWrapper />
            </AuthenticationBoundary>
        </div>
    );
}

export default App;
