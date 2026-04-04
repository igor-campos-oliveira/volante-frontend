import "./App.css";
import ServiceOrderPage from "@/pages/ServiceOrderNew/ServiceOrder";
import { Toaster } from "./components/ui/sonner";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Menu from "./components/Menu/Menu";
import { ROUTER_PATHS } from "./routes/routes";
import { Car, FilePlus, FolderSearch, Home, User } from "lucide-react";
import VehiclesPage from "./pages/Vehicles/VehiclesPage";
import CustomersPage from "./pages/Customers/CustomersPage";
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

const MENU_LINKS = [
  {path: ROUTER_PATHS.HOME, label: 'Início',icon: <Home size={23}/>},
  {path: ROUTER_PATHS.SERVICE_ORDER + '/new',label: 'Novo',icon: <FilePlus size={23}/>},
  {path: ROUTER_PATHS.SERVICE_ORDERS,label: 'Orçamentos',icon: <FolderSearch size={23}/>},
  {path: ROUTER_PATHS.CUSTOMER,label: 'Clientes',icon: <User size={23}/>},
  {path: ROUTER_PATHS.VEHICLE, label: 'Veículos', icon: <Car size={23}/>},
  {path: ROUTER_PATHS.EMPLOYEE, label: 'Funcionários', icon: <Users size={23}/>}

]

const INTERNAL_ROUTES = [
  { path: ROUTER_PATHS.HOME, element: <HomePage/> },
  { path: ROUTER_PATHS.SERVICE_ORDER + '/new', element: <ServiceOrderPage/> },
  { path: ROUTER_PATHS.SERVICE_ORDERS, element: <SearchServiceOrdersPage/> },
  { path: ROUTER_PATHS.CUSTOMER, element: <CustomersPage/> },
  { path: ROUTER_PATHS.VEHICLE, element: <VehiclesPage/> },
  { path: `${ROUTER_PATHS.SERVICE_ORDER}/:uuid`, element: <ServiceOrderPage/> },
  { path: ROUTER_PATHS.EMPLOYEE, element: <EmployeesPage/> },
];

const ProtectedLayout = () => {
  const { isAuthenticated } = useAuthContext();

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