import "./App.css";
import ServiceOrderPage from "@/pages/ServiceOrderNew/ServiceOrder";
import { Toaster } from "./components/ui/sonner";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Menu from "./components/Menu/Menu";
import { ROUTER_PATHS } from "./routes/routes";
import { Car, FilePlus, FolderSearch, Home, User, Wrench } from "lucide-react";
import VehiclesPage from "./pages/Vehicles/VehiclesPage";
import CustomersPage from "./pages/Customers/CustomersPageWithModal";
// import CatalogPage from "./pages/Catalog/CatalogPage";
// import SquadPage from "./pages/Squad/SquadPage";
// import SupplierPage from "./pages/Supplier/SupplierPage";
import SearchServiceOrdersPage from "./pages/ServiceOrders/ServiceOrdersPage";
import HomePage from "./pages/Home";
import NotFoundPage from "./pages/NotFoundPage";
import AuthProvider, { useAuthContext } from "./hooks/useAuth";
import LoginPage from "./pages/Login";
import EmployeesPage from "./pages/Employees/EmployeesPage";
import { Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CatalogServicesPage from "./pages/CatalogServices/CatalogServicesPage";

const MENU_LINKS = [
  {path: ROUTER_PATHS.HOME, label: 'Início',icon: <Home size={23}/>},
  {path: ROUTER_PATHS.SERVICE_ORDER + '/new',label: 'Novo',icon: <FilePlus size={23}/>},
  {path: ROUTER_PATHS.SERVICE_ORDERS,label: 'Orçamentos',icon: <FolderSearch size={23}/>},
  {path: ROUTER_PATHS.CUSTOMER,label: 'Clientes',icon: <User size={23}/>},
  {path: ROUTER_PATHS.SERVICES, label: 'Servicos', icon: <Wrench size={23}/>},
  {path: ROUTER_PATHS.VEHICLE, label: 'Veículos', icon: <Car size={23}/>},
  {path: ROUTER_PATHS.EMPLOYEE, label: 'Funcionários', icon: <Users size={23}/>}

]

const INTERNAL_ROUTES = [
  { path: ROUTER_PATHS.HOME, element: <HomePage/> },
  { path: ROUTER_PATHS.SERVICE_ORDER + '/new', element: <ServiceOrderPage/> },
  { path: ROUTER_PATHS.SERVICE_ORDERS, element: <SearchServiceOrdersPage/> },
  { path: ROUTER_PATHS.CUSTOMER, element: <CustomersPage/> },
  { path: ROUTER_PATHS.SERVICES, element: <CatalogServicesPage/> },
  { path: ROUTER_PATHS.VEHICLE, element: <VehiclesPage/> },
  { path: `${ROUTER_PATHS.SERVICE_ORDER}/:uuid`, element: <ServiceOrderPage/> },
  { path: ROUTER_PATHS.EMPLOYEE, element: <EmployeesPage/> },
];

const ProtectedLayout = () => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const [isAuthTransitionLoading, setIsAuthTransitionLoading] = useState(false);
  const hasResolvedInitialAuthRef = useRef(false);
  const previousAuthenticatedRef = useRef(isAuthenticated);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!hasResolvedInitialAuthRef.current) {
      hasResolvedInitialAuthRef.current = true;
      previousAuthenticatedRef.current = isAuthenticated;
      return;
    }

    const justLoggedIn = !previousAuthenticatedRef.current && isAuthenticated;
    const justLoggedOut = previousAuthenticatedRef.current && !isAuthenticated;

    if (justLoggedIn || justLoggedOut) {
      setIsAuthTransitionLoading(true);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setIsAuthTransitionLoading(false);
      }, 4000);
    }

    previousAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  if (isAuthTransitionLoading || (isLoading && previousAuthenticatedRef.current)) {
    return (
      <div className="post-login-overlay">
        <div className="three-body" aria-label="Carregando">
          <div className="three-body__dot" />
          <div className="three-body__dot" />
          <div className="three-body__dot" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-zinc-50 divide-x">
      <Menu links={MENU_LINKS} />
      <div className="rounded flex flex-1 p-4">
        <Outlet />
      </div>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: ROUTER_PATHS.LOGIN,
    element: <LoginPage/>
  },
  {
    path: "/",
    element:
      <AuthProvider>
        <ProtectedLayout/>
      </AuthProvider> ,
    errorElement: <NotFoundPage/>,
    children: INTERNAL_ROUTES
  }
])

function App() {
  return (
    <div className="bg-zinc-50 flex-1 flex">
      <RouterProvider router={router}/>
      <Toaster position="top-right"  closeButton/>
    </div>
  );
}

export default App;
