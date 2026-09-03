import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider } from "./context/RequesterContext";
import RequesterSelection from "./pages/RequesterSelection";
import SystemStatusWidget from "./components/SystemStatusWidget";
import CreateTicket from "./pages/CreateTicket";

function App() {
  return (
    <RequesterProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RequesterSelection />} />
          <Route path="/system-status" element={<SystemStatusWidget />} />
          {/* /my-tickets, /create-ticket, /tickets/:id เพิ่มใน Issue ถัดไป */}
          <Route path="/create-ticket" element={<CreateTicket />} />
        </Routes>
      </BrowserRouter>
    </RequesterProvider>
  );
}

export default App;