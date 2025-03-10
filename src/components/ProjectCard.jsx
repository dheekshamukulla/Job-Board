import { MapPin, Calendar, DollarSign } from 'lucide-react';

const ProjectCard = ({ prompt, searchTerm, isAdmin, isApproved, onApprove }) => {
    const truncateText = (text, maxLength) => {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substr(0, maxLength) + '...';
    };

    // Function to highlight the search term in text
    const highlightText = (text, term) => {
        if (!term) return text;
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return parts.map((part, index) => 
            part.toLowerCase() === term.toLowerCase() ? 
                <span key={index} className="bg-yellow-200 dark:bg-yellow-700">{part}</span> : part
        );
    };

    // Format date to be more readable
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 ${!isApproved && 'opacity-70'}`}>
            {!isApproved && (
                <div className="absolute top-2 right-2 flex gap-2">
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">
                        Pending Approval
                    </span>
                    {isAdmin && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onApprove();
                            }}
                            className="bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded hover:bg-green-600"
                        >
                            Approve
                        </button>
                    )}
                </div>
            )}
            
            <div className="flex items-center mb-4">
                <img
                    src={prompt.logo}
                    alt={`${prompt.company} logo`}
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                />
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {highlightText(prompt.name, searchTerm)}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        {highlightText(prompt.company, searchTerm)}
                    </p>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">
                        {highlightText(prompt.location, searchTerm)}
                    </span>
                </div>
                <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">
                        {prompt.type}
                    </span>
                </div>
                <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">
                        {prompt.salary}
                    </span>
                </div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
                Posted {formatDate(prompt.postDate)}
            </div>
        </div>
    );
};

export default ProjectCard;
