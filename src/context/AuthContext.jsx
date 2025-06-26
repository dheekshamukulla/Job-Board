import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [initialCheckDone, setInitialCheckDone] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        console.log('AuthProvider mounted', { initialCheckDone, isRegistering });
        // Skip auth check if we're in the registration process
        if (!initialCheckDone && !isRegistering) {
            checkAuth();
        }
    }, [initialCheckDone, isRegistering]);

    const checkAuth = async () => {
        console.log('Checking auth...');
        try {
            console.log('Making request to /api/auth/me');
            const response = await fetch('http://localhost:5050/api/auth/me', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            console.log('Auth check response:', response.status);
            if (response.ok) {
                const userData = await response.json();
                console.log('User data received:', userData);
                setUser(userData);
            } else {
                console.log('Auth check failed with status:', response.status);
                const errorData = await response.json().catch(() => ({}));
                console.log('Error data:', errorData);
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setError(error.message);
            setUser(null);
        } finally {
            console.log('Auth check complete');
            setLoading(false);
            setInitialCheckDone(true);
        }
    };

    const login = async (email, password) => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5050/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }

            const userData = await response.json();
            setUser(userData);
            return { success: true, user: userData };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const register = async (name, email, password) => {
        try {
            setIsRegistering(true);
            setLoading(true);
            console.log('Starting registration...', { name, email });
            const response = await fetch('http://localhost:5050/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ name, email, password })
            });

            console.log('Registration response status:', response.status);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Registration error:', errorData);
                throw new Error(errorData.error || 'Registration failed');
            }

            const userData = await response.json();
            console.log('Registration successful:', userData);
            setUser(userData);
            return { success: true };
        } catch (error) {
            console.error('Registration failed:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
            setIsRegistering(false);
        }
    };

    const googleSignIn = async (accessToken) => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5050/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ token: accessToken })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Google sign-in failed');
            }

            const userData = await response.json();
            setUser(userData);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            await fetch('http://localhost:5050/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        loading,
        error,
        login,
        register,
        googleSignIn,
        logout,
        isRegistering
    };

    console.log('AuthContext state:', { user, loading, error, isRegistering });

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 