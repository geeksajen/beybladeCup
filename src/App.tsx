import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { SetupGate } from './components/SetupGate';
import { UpdateBanner } from './components/UpdateBanner';
import Admin from './pages/Admin';
import BracketPage from './pages/Bracket';
import Home from './pages/Home';
import MyEntries from './pages/MyEntries';
import Players from './pages/Players';
import Register from './pages/Register';
import Results from './pages/Results';
import Rules from './pages/Rules';
import Screen from './pages/Screen';
import Setup from './pages/Setup';

export default function App() {
  return (
    <>
      <UpdateBanner />
      <AppRoutes />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/setup"
        element={
          <SetupGate kind="setup">
            <Setup />
          </SetupGate>
        }
      />
      <Route
        path="/admin"
        element={
          <SetupGate kind="admin">
            <Admin />
          </SetupGate>
        }
      />
      <Route
        path="/screen"
        element={
          <SetupGate kind="public">
            <Screen />
          </SetupGate>
        }
      />
      <Route
        element={
          <SetupGate kind="public">
            <PublicLayout />
          </SetupGate>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my" element={<MyEntries />} />
        <Route path="/players" element={<Players />} />
        <Route path="/bracket" element={<BracketPage />} />
        <Route path="/results" element={<Results />} />
        <Route path="/rules" element={<Rules />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
