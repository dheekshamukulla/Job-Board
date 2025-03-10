import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { authenticateToken, isAdmin } from './middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import multer from 'multer';
import path from 'path';
import fetch from 'node-fetch';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Create uploads directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Email validation function
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Password validation function
const isValidPassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
};

// Phone validation function
const isValidPhone = (phone) => {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    return phoneRegex.test(phone);
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password strength
        if (!isValidPassword(password)) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' 
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                authProvider: 'EMAIL'
            }
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.cookie('token', token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Google OAuth authentication
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        
        const { email, name, picture } = ticket.getPayload();
        
        let user = await prisma.user.findUnique({
            where: { email }
        });
        
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    authProvider: 'GOOGLE',
                    avatar: picture
                }
            });
        }
        
        const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.cookie('token', jwtToken, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
});

// Apple OAuth authentication
app.post('/api/auth/apple', async (req, res) => {
    // Apple Sign In implementation will go here
    // This requires Apple Developer Account and additional setup
    res.status(501).json({ error: 'Apple Sign In not implemented yet' });
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.cookie('token', token, { httpOnly: true });
        
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log in' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

// Job Routes
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await prisma.job.findMany({
            where: {
                isApproved: true
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                postDate: 'desc'
            }
        });
        
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

app.get('/api/jobs/:id', async (req, res) => {
    try {
        const job = await prisma.job.findUnique({
            where: {
                id: parseInt(req.params.id)
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch job' });
    }
});

app.get('/api/jobs/category/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const jobs = await prisma.job.findMany({
            where: {
                type: type.toUpperCase(),
                isApproved: true
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                postDate: 'desc'
            }
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// Helper function to format salary
function formatSalary(salary) {
    if (!salary) return '';
    // Remove all non-numeric characters
    const numStr = salary.replace(/[^0-9.]/g, '');
    const amount = parseFloat(numStr);
    if (isNaN(amount)) return salary;
    // Format as currency
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
}

// Create job (requires authentication)
app.post('/api/jobs', authenticateToken, async (req, res) => {
    try {
        console.log('Creating job for user:', req.user.id);
        console.log('User details:', req.user);
        const companyName = req.body.companyName.toLowerCase().replace(/\s+/g, '');
        const clearbitLogo = `https://logo.clearbit.com/${companyName}.com`;
        
        // Check if the Clearbit logo exists
        const logoResponse = await fetch(clearbitLogo);
        const logo = logoResponse.ok ? clearbitLogo : 'https://cdn-icons-png.flaticon.com/512/3061/3061341.png';

        // Format the salary
        const formattedSalary = formatSalary(req.body.salary);

        const job = await prisma.job.create({
            data: {
                name: req.body.jobTitle,
                company: req.body.companyName,
                description: req.body.jobDescription,
                location: req.body.location,
                type: req.body.category,
                salary: formattedSalary,
                logo: logo,
                userId: req.user.id,
                postDate: new Date()
            }
        });
        console.log('Created job:', job);
        res.json(job);
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ error: 'Failed to create job posting' });
    }
});

// Delete job (requires authentication and ownership or admin)
app.delete('/api/jobs/:id', authenticateToken, async (req, res) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this job' });
        }

        await prisma.job.delete({
            where: { id: parseInt(req.params.id) }
        });

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete job' });
    }
});

// Admin Routes
app.get('/api/admin/jobs', authenticateToken, isAdmin, async (req, res) => {
    try {
        const jobs = await prisma.job.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                postDate: 'desc'
            }
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

app.patch('/api/admin/jobs/:id/approve', authenticateToken, isAdmin, async (req, res) => {
    try {
        const job = await prisma.job.update({
            where: { id: parseInt(req.params.id) },
            data: { isApproved: true }
        });
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve job' });
    }
});

// Helper function to parse salary string to number
function parseSalary(salaryStr) {
    if (!salaryStr) return 0;
    
    // Handle ranges (e.g., "$45,000-$50,000" or "45k-50k")
    if (salaryStr.includes('-')) {
        const [min, max] = salaryStr.split('-');
        // Return the average of the range
        return (parseSalary(min) + parseSalary(max)) / 2;
    }

    // Remove all non-numeric characters except decimal point
    let numStr = salaryStr.toLowerCase()
        .replace(/[^0-9.k]/g, '')  // Remove everything except numbers, decimal points, and 'k'
        .replace(/\.(?=.*\.)/g, ''); // Remove all decimal points except the last one

    // Handle 'k' notation (e.g., "45k" -> 45000)
    if (numStr.endsWith('k')) {
        numStr = parseFloat(numStr.slice(0, -1)) * 1000;
    }

    return parseFloat(numStr) || 0;
}

// Search jobs
app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        // Build the where clause
        const where = {
            isApproved: true
        };

        // Add text search if query exists
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { company: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { location: { contains: query, mode: 'insensitive' } },
                { salary: { contains: query, mode: 'insensitive' } }
            ];
        }

        const jobs = await prisma.job.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                postDate: 'desc'
            }
        });

        // If query contains numbers, try salary filtering
        if (query && /\d/.test(query)) {
            const searchSalary = parseSalary(query);
            if (searchSalary > 0) {
                const filteredJobs = jobs.filter(job => {
                    const jobSalary = parseSalary(job.salary);
                    if (jobSalary === 0) return false;

                    // Calculate the percentage difference
                    const percentDiff = Math.abs(jobSalary - searchSalary) / searchSalary;
                    
                    // Accept if within 15% of search value
                    return percentDiff <= 0.15;
                });
                return res.json(filteredJobs);
            }
        }

        res.json(jobs);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to search jobs' });
    }
});

// Job Application Routes
app.post('/api/jobs/:id/apply', authenticateToken, upload.single('resume'), async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        const userId = req.user.id;
        const { name, email, phone, comments } = req.body;

        // Validate phone number
        if (!isValidPhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Check if job exists and is approved
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { isApproved: true, userId: true }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (!job.isApproved) {
            return res.status(400).json({ error: 'Cannot apply to unapproved jobs' });
        }

        if (job.userId === userId) {
            return res.status(400).json({ error: 'Cannot apply to your own job posting' });
        }

        // Format phone number to (XXX) XXX-XXXX format
        const formattedPhone = phone.replace(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, '($1) $2-$3');

        // Get the resume file path if uploaded
        const resumePath = req.file ? `/uploads/${req.file.filename}` : null;

        // Create the application
        const application = await prisma.jobApplication.create({
            data: {
                jobId,
                userId,
                name,
                email,
                phone: formattedPhone,
                resumeUrl: resumePath,
                comments
            }
        });

        res.status(201).json(application);
    } catch (error) {
        console.error('Error creating job application:', error);
        if (error.message === 'Only PDF and Word documents are allowed') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to submit application' });
        }
    }
});

// Get applications for a job (requires authentication and ownership)
app.get('/api/jobs/:id/applications', authenticateToken, async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        
        // Check if the user owns the job or is an admin
        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to view applications' });
        }

        // Fetch applications
        const applications = await prisma.jobApplication.findMany({
            where: { jobId },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(applications);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// Get jobs created by the current user
app.get('/api/jobs/my-postings', authenticateToken, async (req, res) => {
    try {
        console.log('=== My Postings Request ===');
        console.log('User ID:', req.user.id);
        console.log('User details:', req.user);
        console.log('Request headers:', req.headers);
        
        // First, check if the user exists
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        
        if (!user) {
            console.error('User not found:', req.user.id);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('Found user:', user);
        
        // Get all jobs for this user
        const jobs = await prisma.job.findMany({
            where: {
                userId: req.user.id
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                postDate: 'desc'
            }
        });
        console.log('Number of jobs found:', jobs.length);
        
        // Double check the user ID matches
        jobs.forEach(job => {
            console.log(`Job ${job.id} user ID: ${job.userId}, Current user ID: ${req.user.id}`);
        });
        
        console.log('=== End My Postings Request ===');
        res.json(jobs);
    } catch (error) {
        console.error('Error in my-postings endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch user jobs' });
    }
});

// Update job (requires authentication and ownership)
app.patch('/api/jobs/:id', authenticateToken, async (req, res) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to update this job' });
        }

        const updatedJob = await prisma.job.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name: req.body.name,
                company: req.body.company,
                description: req.body.description,
                location: req.body.location,
                type: req.body.type,
                salary: req.body.salary
            }
        });

        res.json(updatedJob);
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await prisma.$connect();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
};

startServer().catch(async (error) => {
    console.error('Unhandled error:', error);
    await prisma.$disconnect();
    process.exit(1);
}); 