import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layout/root";
import Home from "../pages/home";
import Analytics from "../pages/analytics";
import ReportsSales from "../pages/reports-sales";
import ReportsLeads from "../pages/reports-leads";
import ReportsProject from "../pages/reports-project";
import ReportsTimesheets from "../pages/reports-timesheets";

import UsersList from "../pages/Users/users-list";
import UsersCreate from "../pages/Users/users-create";
import UpdateUser from "../pages/Users/update-user";

import PaymentCreate from "../pages/payment-create";

import LayoutAuth from "../layout/layoutAuth";
import LoginCreative from "../pages/login-creative";

import RequireAuth from "@/components/authentication/RequireAuth";

import { Navigate } from "react-router-dom";
import InvoicesList from "../pages/Invoices/invoices-list";
import DevisCreate from "@/components/payment/DevisCreate";
import DevisList from "../pages/Devis/devis-list";
import BonLivraisonsList from "../pages/BonLivraison/bonlivraisons-list";
import BonLivrCreate from "@/components/payment/BonLivrCreate";
import BonLivraisonDetailsPage from "../pages/BonLivraison/BonLivrDetails";
import ClientsList from "../pages/Clients/clients-list";
import ClientsCreate from "../pages/Clients/clients-create";
import ClientDetails from "../pages/Clients/ClientDetails";
import ProduitsList from "../pages/Produits/produits-list";
import ProduitsCreate from "../pages/Produits/produits-create";
import FornisseurDetails from "../pages/Fornisseur/FornisseurDetails";
import FornisseurCreate from "../pages/Fornisseur/fornisseur-create";
import FornisseursList from "../pages/Fornisseur/fornisseurs-list";
import DevisDetailsPage from "../pages/Devis/DevisDetails";
import FactureDetailsPage from "../pages/Invoices/FactureDetails";
import ReportsPage from "../pages/Reports/ReportsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutAuth />,
    children: [
      {
        index: true, // default child route for "/"
        element: <LoginCreative />,
      },
    ],
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: "dashboard",
        element: <Home />,
      },
      {
        path: "dashboards/analytics",
        element: <Analytics />,
      },
      {
        path: "reports/sales",
        element: <ReportsSales />,
      },
      {
        path: "reports/leads",
        element: <ReportsLeads />,
      },
      {
        path: "reports/project",
        element: <ReportsProject />,
      },
      {
        path: "reports/timesheets",
        element: <ReportsTimesheets />,
      },

      {
        path: "users",
        element: <UsersList />,
      },
      {
        path: "users/create",
        element: <UsersCreate />,
      },
      {
        path: "users/update/:id",
        element: <UpdateUser />,
      },
      {
        path: "clients",
        element: <ClientsList />,
      },
      {
        path: "clients/create",
        element: <ClientsCreate />,
      },
      {
        path: "clients/:id",
        element: <ClientDetails />,
      },

      {
        path: "fornisseurs",
        element: <FornisseursList />,
      },
      {
        path: "fornisseurs/create",
        element: <FornisseurCreate />,
      },
      {
        path: "fornisseurs/:id",
        element: <FornisseurDetails />,
      },
      {
        path: "produits/create",
        element: <ProduitsCreate />,
      },

      {
        path: "produits",
        element: <ProduitsList />,
      },

      {
        path: "facture/create",
        element: <PaymentCreate />,
      },
      {
        path: "devis/create",
        element: <DevisCreate />,
      },
      {
        path: "devis/list",
        element: <DevisList />,
      },
      {
        path: "devis/:id",
        element: <DevisDetailsPage />,
      },
      {
        path: "invoices/list",
        element: <InvoicesList />,
      },
      {
        path: "factures/:id",
        element: <FactureDetailsPage />,
      },

      {
        path: "bon-livraisons/list",
        element: <BonLivraisonsList />,
      },
      {
        path: "bon-livraison/create",
        element: <BonLivrCreate />,
      },
      {
        path: "bon-livraisons/:id",
        element: <BonLivraisonDetailsPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
    ],
  },
  // Fallback: if route not found, redirect to login
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
