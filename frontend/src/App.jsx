import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import MovementsPage from "./pages/MovementsPage";
import OrdersPage from "./pages/OrdersPage";
import LoansPage from "./pages/LoansPage";
import CustomersPage from "./pages/CustomersPage";
import UsersPage from "./pages/UsersPage";
import ProfilePage from "./pages/ProfilePage";
import AlertsPage from "./pages/AlertsPage";
import AppLayout, { RequireAuth } from "./layout/AppLayout";
import { useAuth } from "./auth";

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user?.is_admin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-contrasena" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="prestamos" element={<LoansPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="movimientos" element={<MovementsPage />} />
        <Route path="alertas" element={<AlertsPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route
          path="usuarios"
          element={
            <AdminOnly>
              <UsersPage />
            </AdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
