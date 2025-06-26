import { useRecoilState } from 'recoil';
import { submissionState } from '../atoms/submission';
import { useState } from 'react';

const Submission = () => {
	const [, setSubState] = useRecoilState(submissionState);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [validationErrors, setValidationErrors] = useState({});

	const validateSalaryFormat = (salary) => {
		// Format should be "$XX,XXX - $XX,XXX" or "$XXX,XXX - $XXX,XXX"
		const salaryRegex = /^\$\d{1,3}(,\d{3})*\s-\s\$\d{1,3}(,\d{3})*$/;
		if (!salaryRegex.test(salary)) {
			return "Salary must be in format '$XX,XXX - $XX,XXX'";
		}
		return null;
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
		const salaryError = validateSalaryFormat(formData.salary);
		if (salaryError) {
			errors.salary = salaryError;
		}

		return errors;
	};

	// const formatSalary = (value) => {
	// 	// Remove all characters except numbers
	// 	const numbers = value.replace(/[^\d]/g, '');
		
	// 	// Split into two parts if there's a hyphen
	// 	const parts = value.split('-').map(part => part.trim());
		
	// 	if (parts.length === 2) {
	// 		// Format each number with commas and dollar sign
	// 		const formatNumber = (num) => {
	// 			const numbers = num.replace(/[^\d]/g, '');
	// 			if (numbers) {
	// 				return '$' + parseInt(numbers).toLocaleString('en-US');
	// 			}
	// 			return '';
	// 		};
			
	// 		return `${formatNumber(parts[0])} - ${formatNumber(parts[1])}`;
	// 	}
		
	// 	// If no hyphen, just format the single number
	// 	if (numbers) {
	// 		return '$' + parseInt(numbers).toLocaleString('en-US');
	// 	}
		
	// 	return value;
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
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);
		setValidationErrors({});

		const formData = {
			jobTitle: e.target.jobTitle.value.trim(),
			companyName: e.target.companyName.value.trim(),
			jobDescription: e.target.jobDescription.value.trim(),
			location: e.target.location.value.trim(),
			category: e.target.category.value,
			salary: e.target.salary.value.trim()
		};

		// Validate form
		const errors = validateForm(formData);
		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			setIsSubmitting(false);
			return;
		}

		try {
			const response = await fetch('http://localhost:5050/api/jobs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				throw new Error('Failed to submit job posting');
			}

			setSubState(false);
			window.location.reload();
		} catch (err) {
			setError('Failed to submit job posting. Please try again.');
			console.error('Error submitting job:', err);
		} finally {
			setIsSubmitting(false);
		}
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
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold dark:text-white">Submit a Job Posting</h2>
					<button
						onClick={() => setSubState(false)}
						className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					>
						✕
    </button>
  </div>

				{error && (
					<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
						{error}
</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Job Title
						</label>
						<input
							type="text"
							id="jobTitle"
							name="jobTitle"
							required
							placeholder="e.g. Senior Software Engineer"
							className={`mt-1 block w-full rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
								validationErrors.jobTitle ? 'border-red-300' : 'border-gray-300'
							}`}
						/>
						{renderError('jobTitle')}
					</div>

					<div>
						<label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Company Name
						</label>
						<input
							type="text"
							id="companyName"
							name="companyName"
							required
							placeholder="e.g. TechCorp Inc."
							className={`mt-1 block w-full rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
								validationErrors.companyName ? 'border-red-300' : 'border-gray-300'
							}`}
						/>
						{renderError('companyName')}
					</div>

					<div>
						<label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Job Description
						</label>
						<textarea
							id="jobDescription"
							name="jobDescription"
							rows="4"
							required
							placeholder="Describe the role, responsibilities, and requirements..."
							className={`mt-1 block w-full rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
								validationErrors.jobDescription ? 'border-red-300' : 'border-gray-300'
							}`}
						></textarea>
						{renderError('jobDescription')}
					</div>

					<div>
						<label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Location
						</label>
						<input
							type="text"
							id="location"
							name="location"
							required
							placeholder="e.g. San Francisco, CA or Remote"
							className={`mt-1 block w-full rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
								validationErrors.location ? 'border-red-300' : 'border-gray-300'
							}`}
						/>
						{renderError('location')}
					</div>

					<div>
						<label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Category
						</label>
						<select
							id="category"
							name="category"
							required
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
						>
							<option value="TECH">Tech</option>
							<option value="EDUCATION">Education</option>
							<option value="TRADE">Trade</option>
							<option value="MARKETING">Marketing</option>
							<option value="OTHER">Other</option>
						</select>
					</div>

					<div>
						<label htmlFor="salary" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Salary Range
						</label>
						<input
							type="text"
							id="salary"
							name="salary"
							required
							placeholder="e.g. $50,000 - $70,000"
							onChange={handleSalaryChange}
							className={`mt-1 block w-full rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
								validationErrors.salary ? 'border-red-300' : 'border-gray-300'
							}`}
						/>
						{renderError('salary')}
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 ${
							isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
						}`}
					>
						{isSubmitting ? 'Submitting...' : 'Submit Job Posting'}
					</button>
				</form>
			</div>
		</div>
	);
};

export default Submission;
