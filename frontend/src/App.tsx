import { Settings } from "@core/components/Settings";
import { TopNavBar } from "@core/components/TopNavBar";

function App() {
    return (
        <div className="h-screen flex flex-row">
            <Settings />
            <div className="flex flex-col flex-grow">
                <TopNavBar />
                <div className="bg-slate-200 p-4 flex-grow border-spacing-x-8">
                    Content
                </div>
            </div>
        </div>
    );
}

export default App;
