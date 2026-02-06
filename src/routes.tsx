import { createBrowserRouter, Outlet } from 'react-router';
import { Layout } from './components/Layout';
import { Launchpad } from './components/Launchpad';
import { Dashboard } from './components/Dashboard';
import { Cadastros } from './pages/Cadastros';
import { Operacoes } from './pages/Operacoes';
import { Checklists } from './pages/Checklists';
import { Relatorios } from './pages/Relatorios';
import { Vendas } from './pages/Vendas';
import { Perfil } from './pages/Perfil';
import { Mapeamentos } from './pages/Mapeamentos';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Layout>
        <Outlet />
      </Layout>
    ),
    children: [
      {
        index: true,
        element: <Launchpad />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'perfil',
        element: <Perfil />,
      },
      {
        path: 'cadastros',
        element: <Cadastros />,
      },
      {
        path: 'operacoes',
        element: <Operacoes />,
      },
      {
        path: 'checklists',
        element: <Checklists />,
      },
      {
        path: 'relatorios',
        element: <Relatorios />,
      },
      {
        path: 'vendas',
        element: <Vendas />,
      },
      {
        path: 'mapeamentos',
        element: <Mapeamentos />,
      },
    ],
  },
]);
