import { useContext } from 'react';
import { AuthContext } from '../store/authContext';

export default function useAuth() {
  return useContext(AuthContext);
}
