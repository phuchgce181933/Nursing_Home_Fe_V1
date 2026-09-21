import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './store/authContext';
import { ToastProvider } from './store/toastContext';
import AppRoutes from './routes';
import GuestChatWidget from './components/GuestChatWidget';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <GuestChatWidget />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
