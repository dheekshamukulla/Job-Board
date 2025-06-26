import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminJobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user?.isAdmin) {
            navigate('/admin/login');
            return;
        }
        fetchJobDetails();
    }, [user, navigate, id]);

    const fetchJobDetails = async () => {
        try {
            const response = await fetch(`http://localhost:5050/api/jobs/${id}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch job details');
            const data = await response.json();
            setJob(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            const response = await fetch(`http://localhost:5050/api/admin/jobs/${id}/approve`, {
                method: 'PATCH',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to approve job');
            const updatedJob = await response.json();
            setJob(updatedJob);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(`http://localhost:5050/api/jobs/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to delete job');
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!job) {
        return <div className="flex justify-center items-center min-h-screen">Job not found</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/admin/dashboard')}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ← Back to Dashboard
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

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {job.name}
                                </h1>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Posted by {job.user.name} ({job.user.email})
                                </p>
                            </div>
                            <div className="flex space-x-4">
                                {!job.isApproved && (
                                    <button
                                        onClick={handleApprove}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        Approve
                                    </button>
                                )}
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.company}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.location}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.type}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Salary Range</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.salary}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                                    <dd className="mt-1">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            job.isApproved
                                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                        }`}>
                                            {job.isApproved ? 'Approved' : 'Pending'}
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Posted Date</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                                        {new Date(job.postDate).toLocaleDateString()}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Job Description</h3>
                            <div className="mt-2 prose dark:prose-invert max-w-none">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {job.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminJobDetails; 