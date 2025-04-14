import { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Проверка наличия сохраненного пользователя при загрузке
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser) as User;
          setUser(userData);
          
          // Проверяем, валиден ли токен
          try {
            await authAPI.getProfile();
          } catch (error) {
            // Если токен невалидный, выходим из аккаунта
            logout();
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке пользователя:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Функция входа в систему
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = await authAPI.login(email, password);
      
      // Сохраняем данные пользователя
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userToken', userData.token);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Ошибка при входе в систему');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Функция регистрации
  const register = async (userData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const newUser = await authAPI.register(userData);
      
      // Сохраняем данные пользователя
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('userToken', newUser.token);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Ошибка при регистрации');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Функция выхода из системы
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userToken');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 