import { AppProvider } from './context/AppContext';
import { useHashRoute } from './hooks/useHashRoute';
import { AnnouncementPopup } from './components/Announcement';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/AdminPage';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { ShopPage } from './pages/ShopPage';

function Router() {
  const { path } = useHashRoute();

  let page;
  if (path.startsWith('/admin')) page = <AdminPage path={path} />;
  else if (path.startsWith('/cart')) page = <CartPage />;
  else if (path.startsWith('/orders')) page = <OrdersPage />;
  else page = <ShopPage />;

  return (
    <Layout path={path}>
      {page}
      <AnnouncementPopup />
    </Layout>
  );
}

export function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
