import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/Protected';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Perfil from './pages/Perfil';
import Configuracion from './pages/Configuracion';
import Fuentes from './pages/Fuentes';
import Ofertas from './pages/Ofertas';
import OfertaDetalle from './pages/OfertaDetalle';
import Matches from './pages/Matches';
import CVs from './pages/CVs';
import CVDetalle from './pages/CVDetalle';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/fuentes" element={<Fuentes />} />
        <Route path="/ofertas" element={<Ofertas />} />
        <Route path="/ofertas/:id" element={<OfertaDetalle />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/cvs" element={<CVs />} />
        <Route path="/cvs/:id" element={<CVDetalle />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}