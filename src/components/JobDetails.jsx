import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const JobDetails = ({ job, onClose, onDelete }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const canDelete = user?.isAdmin || user?.id === job.userId;
    const canApply = user && user.id !== job.userId && !user.isAdmin;
    const isJobPoster = user?.id === job.userId;
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedJob, setEditedJob] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        if (job) {
            setEditedJob({
                jobTitle: job.name,
                companyName: job.company,
                jobDescription: job.description,
                location: job.location,
                category: job.type,
                salary: job.salary
            });
        }
    }, [job]);

    useEffect(() => {
        if (isJobPoster) {
            fetchApplications();
        }
    }, [job.id, isJobPoster]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`http://localhost:5050/api/jobs/${job.id}/applications`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch applications');
            }
            
            const data = await response.json();
            setApplications(data);
        } catch (err) {
            console.error('Error fetching applications:', err);
            setError(err.message || 'Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 3;
        
        const tryFetchApplications = async () => {
            if (!isJobPoster) return;
            
            try {
                await fetchApplications();
            } catch (error) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(tryFetchApplications, 1000 * retryCount);
                }
            }
        };
        
        tryFetchApplications();
    }, [job.id, isJobPoster]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleApply = () => {
        onClose();
        navigate(`/jobs/${job.id}/apply`);
    };

    const downloadResume = (resumeUrl) => {
        window.open(`http://localhost:5050${resumeUrl}`, '_blank');
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            const response = await fetch(`http://localhost:5050/api/jobs/${job.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: editedJob.jobTitle,
                    company: editedJob.companyName,
                    description: editedJob.jobDescription,
                    location: editedJob.location,
                    type: editedJob.category,
                    salary: editedJob.salary
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update job');
            }

            setIsEditing(false);
            onClose();
            window.location.reload();
        } catch (error) {
            console.error('Error updating job:', error);
            setError('Failed to update job. Please try again.');
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedJob({
            jobTitle: job.name,
            companyName: job.company,
            jobDescription: job.description,
            location: job.location,
            category: job.type,
            salary: job.salary
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedJob(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = (formData) => {
        const errors = {};

        // Job Title validation
        if (formData.jobTitle.length < 3) {
            errors.jobTitle = "Job title must be at least 3 characters long";
        } else if (formData.jobTitle.length > 100) {
            errors.jobTitle = "Job title cannot exceed 100 characters";
        }

        // Company Name validation
        if (formData.companyName.length < 2) {
            errors.companyName = "Company name must be at least 2 characters long";
        } else if (formData.companyName.length > 50) {
            errors.companyName = "Company name cannot exceed 50 characters";
        }

        // Job Description validation
        if (formData.jobDescription.length > 5000) {
            errors.jobDescription = "Job description cannot exceed 5000 characters";
        }

        // Location validation
        if (formData.location.length < 2) {
            errors.location = "Location must be at least 2 characters long";
        } else if (formData.location.length > 100) {
            errors.location = "Location cannot exceed 100 characters";
        }

        // Salary validation
        const salaryRegex = /^\$\d{1,3}(,\d{3})*\s-\s\$\d{1,3}(,\d{3})*$/;
        if (!salaryRegex.test(formData.salary)) {
            errors.salary = "Salary must be in format '$XX,XXX - $XX,XXX'";
        }

        return errors;
    };

    // const formatSalary = (value) => {
    //     // Remove all characters except numbers
    //     const numbers = value.replace(/[^\d]/g, '');
        
    //     // Split into two parts if there's a hyphen
    //     const parts = value.split('-').map(part => part.trim());
        
    //     if (parts.length === 2) {
    //         // Format each number with commas and dollar sign
    //         const formatNumber = (num) => {
    //             const numbers = num.replace(/[^\d]/g, '');
    //             if (numbers) {
    //                 return '$' + parseInt(numbers).toLocaleString('en-US');
    //             }
    //             return '';
    //         };
            
    //         return `${formatNumber(parts[0])} - ${formatNumber(parts[1])}`;
    //     }
        
    //     // // If no hyphen, just format the single number
    //     // if (numbers) {
    //     //     return '$' + parseInt(numbers).toLocaleString('en-US');
    //     // }
        
    //     return value;
    // };

    const formatSalary = (value) => {
        // Split into two parts if there's a hyphen
        const parts = value.split('-').map(part => part.trim());
    
        const formatNumber = (num) => {
            const numbersOnly = num.replace(/[^\d]/g, '');
            return numbersOnly ? '$' + parseInt(numbersOnly).toLocaleString('en-US') : '';
        };
    
        if (parts.length === 2) {
            return `${formatNumber(parts[0])} - ${formatNumber(parts[1])}`;
        }
    
        // If no hyphen, just format the single number
        return formatNumber(value);
    };

    const handleSalaryChange = (e) => {
        const formatted = formatSalary(e.target.value);
        e.target.value = formatted;
        handleInputChange(e);
    };

    const renderError = (fieldName) => {
        if (validationErrors[fieldName]) {
            return (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {validationErrors[fieldName]}
                </p>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        {isEditing ? (
                            <input
                                type="text"
                                name="jobTitle"
                                value={editedJob.jobTitle}
                                onChange={handleInputChange}
                                className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                            />
                        ) : (
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{job.name}</h2>
                        )}
                        {isEditing ? (
                            <input
                                type="text"
                                name="companyName"
                                value={editedJob.companyName}
                                onChange={handleInputChange}
                                className="text-lg text-gray-600 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                            />
                        ) : (
                            <p className="text-lg text-gray-600 dark:text-gray-300">{job.company}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    name="location"
                                    value={editedJob.location}
                                    onChange={handleInputChange}
                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Location"
                                />
                                <input
                                    type="text"
                                    name="salary"
                                    value={editedJob.salary}
                                    onChange={handleSalaryChange}
                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Salary"
                                />
                                <select
                                    name="category"
                                    value={editedJob.category}
                                    onChange={handleInputChange}
                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="TECH">Tech</option>
                                    <option value="EDUCATION">Education</option>
                                    <option value="TRADE">Trade</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {job.location}
                                </div>
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {job.salary}
                                </div>
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {job.type}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Job Description
                        </h3>
                        {isEditing ? (
                            <textarea
                                name="jobDescription"
                                value={editedJob.jobDescription}
                                onChange={handleInputChange}
                                className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Job Description"
                            />
                        ) : (
                            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {job.description}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div>
                            Posted by: {job.user.name}
                        </div>
                        <div>
                            Posted on: {formatDate(job.postDate)}
                        </div>
                    </div>

                    {isJobPoster && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Applications ({applications.length})
                            </h3>
                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
                                </div>
                            ) : error ? (
                                <div className="text-red-600 dark:text-red-400">{error}</div>
                            ) : applications.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400">No applications yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {applications.map((application) => (
                                        <div 
                                            key={application.id}
                                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                                        {application.name}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                                        {application.email}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                                        {application.phone}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Applied: {formatDate(application.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            {application.comments && (
                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <strong>Comments:</strong> {application.comments}
                                                </p>
                                            )}
                                            {application.resumeUrl && (
                                                <button
                                                    onClick={() => downloadResume(application.resumeUrl)}
                                                    className="mt-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                                >
                                                    Download Resume
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                        {isJobPoster && !isEditing && (
                            <button
                                onClick={handleEdit}
                                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Edit
                            </button>
                        )}
                        {isEditing && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        {canApply && !isEditing && (
                            <button
                                onClick={handleApply}
                                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Apply for this Position
                            </button>
                        )}
                        {canDelete && !isEditing && (
                            <button
                                onClick={() => onDelete(job.id)}
                                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Delete Job Posting
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetails; 