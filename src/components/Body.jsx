import Footer from './Footer';
import ProjectCard from './ProjectCard';
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { submissionState } from '../atoms/submission';
import Submission from './Submission';
import { useAuth } from '../context/AuthContext';
import JobDetails from './JobDetails';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Body = ({ onShowAuth }) => {
    const [jobs, setJobs] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [subState, setSubState] = useRecoilState(submissionState);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobs();
    }, [user?.isAdmin]); // Refetch when admin status changes

    const fetchJobs = async () => {
        try {
            setIsLoading(true);
            const endpoint = user?.isAdmin ? '/api/admin/jobs' : '/api/jobs';
            const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
                credentials: 'include'
            });
            const data = await response.json();
            setJobs(data);
            setFilteredData(data);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJobClick = (job) => {
        setSelectedJob(job);
    };

    const handleDeleteJob = async (jobId) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                setSelectedJob(null);
                fetchJobs();
            } else {
                console.error('Failed to delete job');
            }
        } catch (error) {
            console.error('Error deleting job:', error);
        }
    };

    const handleApproveJob = async (jobId) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/jobs/${jobId}/approve`, {
                method: 'PATCH',
                credentials: 'include'
            });

            if (response.ok) {
                fetchJobs();
            } else {
                console.error('Failed to approve job');
            }
        } catch (error) {
            console.error('Error approving job:', error);
        }
    };

    const filterAll = () => {
        setActiveFilter('All');
        setSearchTerm('');
        try {
            console.log('Showing all jobs...');
            console.log('Total jobs:', jobs.length);
            setFilteredData(jobs);
        } catch (error) {
            console.error('Error in filterAll:', error);
            setFilteredData([]);
        }
    };

    const filterByCategory = async (category) => {
        setActiveFilter(category);
        setSearchTerm('');
        try {
            setIsLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/category/${category}`, {
                credentials: 'include'
            });
            const data = await response.json();
            setFilteredData(data);
        } catch (error) {
            console.error('Error fetching jobs by category:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterMyPostings = () => {
        setActiveFilter('My Postings');
        setSearchTerm('');
        try {
            console.log('Filtering my postings...');
            console.log('Current user:', user);
            console.log('All jobs:', jobs);
            
            // Filter jobs where userId matches the current user's ID
            const myJobs = jobs.filter(job => job.userId === user.id);
            
            console.log('My jobs:', myJobs);
            console.log('Number of my jobs:', myJobs.length);
            
            setFilteredData(myJobs);
        } catch (error) {
            console.error('Error in filterMyPostings:', error);
            setFilteredData([]);
        }
    };

    const handleSearch = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (!value.trim()) {
            setFilteredData(jobs);
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/search?query=${encodeURIComponent(value)}`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            const filteredResults = activeFilter === 'All' 
                ? data 
                : data.filter(item => item.type === activeFilter);
            
            setFilteredData(filteredResults);
        } catch (error) {
            console.error('Error searching jobs:', error);
            setFilteredData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const jobCategories = [
        { id: 'TECH', label: 'Tech' },
        { id: 'EDUCATION', label: 'Education' },
        { id: 'TRADE', label: 'Trade' },
        { id: 'MARKETING', label: 'Marketing' },
        { id: 'OTHER', label: 'Other' }
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <a href="index.html"><h1 className="text-3xl font-bold text-blue-900 dark:text-white">HireWire</h1></a>
                <div className="flex items-center space-x-4">
                    <ThemeToggle />
                    {!user ? (
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500"
                        >
                            Login
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setSubState(true)}
                                className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500"
                            >
                                Post a Job
                            </button>
                            <button
                                onClick={handleLogout}
                                className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                            >
                                Sign Out
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex justify-center gap-4 mb-5 flex-wrap">
                <input
                    type="text"
                    placeholder="Search jobs by title, company, or location..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full md:w-4/5 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
            </div>

            <div className="flex justify-between items-center mb-6 flex-wrap">
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={filterAll}
                        className={`text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 ${
                            activeFilter === 'All' 
                            ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-black' 
                            : 'bg-blue-100 text-blue-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                        }`}
                    >
                        All Jobs
                    </button>
                    {jobCategories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => filterByCategory(category.id)}
                            className={`text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 ${
                                activeFilter === category.id 
                                ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-black' 
                                : 'bg-blue-100 text-blue-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                            }`}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
                {user && (
                    <button
                        onClick={filterMyPostings}
                        className={`text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 ${
                            activeFilter === 'My Postings' 
                            ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-black' 
                            : 'bg-blue-100 text-blue-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                        }`}
                    >
                        My Postings
                    </button>
                )}
            </div>

            {/* Job Listings Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div className="col-span-full text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading jobs...</p>
                    </div>
                ) : filteredData.length > 0 ? (
                    filteredData.map((job) => (
                        <div
                            key={job.id}
                            className="transform transition-transform duration-300 hover:translate-y-[-4px] cursor-pointer"
                            onClick={() => handleJobClick(job)}
                        >
                            <ProjectCard 
                                prompt={job} 
                                searchTerm={searchTerm}
                                isAdmin={user?.isAdmin}
                                isApproved={job.isApproved}
                                onApprove={() => handleApproveJob(job.id)}
                            />
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        <p className="text-lg">No jobs found matching your criteria.</p>
                        <p className="text-sm mt-2">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>

            {selectedJob && (
                <JobDetails
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    onDelete={handleDeleteJob}
                />
            )}

            {subState && <Submission onSuccess={fetchJobs} />}

            <Footer />
        </div>
    );
};

export default Body;
