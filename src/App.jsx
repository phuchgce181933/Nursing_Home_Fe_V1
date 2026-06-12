import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './store/authContext';
import AppRoutes from './routes';
import GuestChatWidget from './components/GuestChatWidget';

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <GuestChatWidget />
      </Router>
    </AuthProvider>
  );
}

export default App;
