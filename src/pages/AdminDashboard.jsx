import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!user?.isAdmin) {
            navigate('/admin/login');
            return;
        }
        fetchJobs();
    }, [user, navigate]);

    const fetchJobs = async () => {
        try {
            const response = await fetch('http://localhost:5050/api/admin/jobs', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch jobs');
            const data = await response.json();
            setJobs(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredJobs = jobs.filter(job => {
        if (filter === 'approved') return job.isApproved;
        if (filter === 'pending') return !job.isApproved;
        return true;
    });

    const handleApprove = async (jobId, e) => {
        e.stopPropagation();
        try {
            const response = await fetch(`http://localhost:5050/api/admin/jobs/${jobId}/approve`, {
                method: 'PATCH',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to approve job');
            await fetchJobs();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (jobId, e) => {
        e.stopPropagation();
        try {
            const response = await fetch(`http://localhost:5050/api/jobs/${jobId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to delete job');
            await fetchJobs();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    const handleRowClick = (jobId) => {
        navigate(`/admin/jobs/${jobId}`);
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-700 dark:text-gray-300 mr-4">Welcome, {user?.name}</span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {error && (
                    <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Job Listings</h2>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                                        filter === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('approved')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                                        filter === 'approved'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Approved
                                </button>
                                <button
                                    onClick={() => setFilter('pending')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                                        filter === 'pending'
                                            ? 'bg-yellow-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Pending
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Job</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Posted By</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredJobs.map((job) => (
                                        <tr 
                                            key={job.id}
                                            onClick={() => handleRowClick(job.id)}
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{job.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{job.company}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{job.user.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    job.isApproved
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                                }`}>
                                                    {job.isApproved ? 'Approved' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {!job.isApproved && (
                                                    <button
                                                        onClick={(e) => handleApprove(job.id, e)}
                                                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(job.id, e)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;