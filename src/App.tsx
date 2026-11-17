import { AppStateProvider, useAppState } from './context/AppStateContext';
import { LayoutShell } from './components/LayoutShell';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { ScheduleMatrixView } from './components/ScheduleMatrixView';
import { ConflictEngineView } from './components/ConflictEngineView';
import { AttendanceAuditView } from './components/AttendanceAuditView';
import { ScheduleSwapView } from './components/ScheduleSwapView';
import { ReportsExportView } from './components/ReportsExportView';
import { AccountManagementView } from './components/AccountManagementView';

function ModuleRouter() {
  const { state } = useAppState();

  switch (state.activeModule) {
    case 'dashboard':
      return <DashboardView />;
    case 'schedule':
      return <ScheduleMatrixView />;
    case 'conflicts':
      return <ConflictEngineView />;
    case 'attendance':
      return <AttendanceAuditView />;
    case 'swaps':
      return <ScheduleSwapView />;
    case 'reports':
      return <ReportsExportView />;
    case 'accounts':
      return <AccountManagementView />;
    default:
      return <DashboardView />;
  }
}

function AuthenticatedGate() {
  const { authMode } = useAppState();

  if (authMode === 'unauthenticated') {
    return <LoginScreen />;
  }

  return (
    <LayoutShell>
      <ModuleRouter />
    </LayoutShell>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AuthenticatedGate />
    </AppStateProvider>
  );
}
