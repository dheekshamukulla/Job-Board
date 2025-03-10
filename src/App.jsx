import { RecoilRoot } from 'recoil';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Body from './components/Body';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminJobDetails from './pages/AdminJobDetails';
import JobApplication from './pages/JobApplication';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
	return (
		<RecoilRoot>
			<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
				<AuthProvider>
					<Router>
						<main className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
							<Routes>
								<Route path="/" element={<Body />} />
								<Route path="/login" element={<Login />} />
								<Route path="/register" element={<Register />} />
								<Route path="/admin/login" element={<AdminLogin />} />
								<Route path="/admin/dashboard" element={<AdminDashboard />} />
								<Route path="/admin/jobs/:id" element={<AdminJobDetails />} />
								<Route path="/jobs/:id/apply" element={<JobApplication />} />
								<Route path="*" element={<Navigate to="/" replace />} />
							</Routes>
						</main>
					</Router>
				</AuthProvider>
			</GoogleOAuthProvider>
		</RecoilRoot>
	);
}

export default App;
