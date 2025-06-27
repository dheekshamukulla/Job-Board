// ... existing imports and setup ...
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
     import dotenv from 'dotenv';
     import { sendEmail } from './mailer.js';
     import fs from 'fs';

     dotenv.config();
     console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not set');

     const prisma = new PrismaClient();

     process.on('SIGINT', async () => {
         await prisma.$disconnect();
         process.exit(0);
     });

     process.on('SIGTERM', async () => {
         await prisma.$disconnect();
         process.exit(0);
     });

     const app = express();

     app.get("/", (req, res) => {
         res.send("Backend is working!");
     });

     app.get("/api/test", (req, res) => {
         res.json({ message: "API is working!" });
     });

     const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
     const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
     const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

     const storage = multer.diskStorage({
         destination: function (req, file, cb) {
             cb(null, 'Uploads/');
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

     if (!fs.existsSync('uploads')) {
         fs.mkdirSync('Uploads');
     }

     app.use('/uploads', express.static('uploads'));

     const allowedOrigins = [
         'http://localhost:5173',
         'http://localhost:5174',
         'http://localhost:5175'
     ];

     if (process.env.CORS_ORIGIN) {
         allowedOrigins.push(process.env.CORS_ORIGIN);
     }

     app.use(cors({
         origin: allowedOrigins,
         credentials: true
     }));
     app.use(express.json());
     app.use(cookieParser());

     const isValidEmail = (email) => {
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         return emailRegex.test(email);
     };

     const isValidPassword = (password) => {
         const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
         return passwordRegex.test(password);
     };

     const isValidPhone = (phone) => {
         const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
         return phoneRegex.test(phone);
     };

     // ... existing auth routes ...
     app.post('/api/auth/register', async (req, res) => {
         try {
             const { email, password, name } = req.body;
             if (!isValidEmail(email)) {
                 return res.status(400).json({ error: 'Invalid email format' });
             }
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
                 maxAge: 30 * 24 * 60 * 60 * 1000
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
                 maxAge: 30 * 24 * 60 * 60 * 1000
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

     app.post('/api/auth/apple', async (req, res) => {
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

     app.get('/api/auth/me', authenticateToken, (req, res) => {
        console.log('Cookies:', req.cookies);
        res.json(req.user);
     });

     // New profile creation endpoint
     app.post('/api/profile', authenticateToken, async (req, res) => {
       try {
         const { userId, name, grade, skills, interests, bio } = req.body;
         if (userId !== req.user.id) {
           return res.status(403).json({ error: 'Unauthorized: userId mismatch' });
         }
         const profile = await prisma.profile.create({
           data: {
             userId,
             name,
             grade,
             skills,
             interests,
             bio,
             status: 'approved' // Automatically approved
           }
         });
         res.json({ message: 'Profile created', profile });
       } catch (error) {
         console.error('Error creating profile:', error);
         res.status(500).json({ error: 'Failed to create profile' });
       }
     });

     // ... existing job routes ...
     app.get('/api/jobs', async (req, res) => {
         try {
             const jobs = await prisma.job.findMany({
                 where: { isApproved: true },
                 include: { user: { select: { name: true, email: true } } },
                 orderBy: { postDate: 'desc' }
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
                 where: { id: parseInt(req.params.id) },
                 include: { user: { select: { name: true, email: true } } }
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
                 where: { type: type.toUpperCase(), isApproved: true },
                 include: { user: { select: { name: true, email: true } } },
                 orderBy: { postDate: 'desc' }
             });
             res.json(jobs);
         } catch (error) {
             res.status(500).json({ error: 'Failed to fetch jobs' });
         }
     });

     function formatSalary(salary) {
         if (!salary) return '';
         const parts = salary.split('-').map(part => part.trim());
         const formatPart = (str) => {
             const numStr = str.replace(/[^0-9.]/g, '');
             const amount = parseFloat(numStr);
             if (isNaN(amount)) return str;
             return new Intl.NumberFormat('en-US', {
                 style: 'currency',
                 currency: 'USD',
                 maximumFractionDigits: 0
             }).format(amount);
         };
         if (parts.length === 2) {
             return `${formatPart(parts[0])} - ${formatPart(parts[1])}`;
         }
         return formatPart(salary);
     }

     app.post('/api/jobs', authenticateToken, async (req, res) => {
         try {
             console.log('Creating job for user:', req.user.id);
             console.log('User details:', req.user);
             const companyName = req.body.companyName.toLowerCase().replace(/\s+/g, '');
             const clearbitLogo = `https://logo.clearbit.com/${companyName}.com`;
             const logoResponse = await fetch(clearbitLogo);
             const logo = logoResponse.ok ? clearbitLogo : 'https://cdn-icons-png.flaticon.com/512/3061/3061341.png';
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
                     userEmail:user.email,
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

     app.get('/api/admin/jobs', authenticateToken, isAdmin, async (req, res) => {
         try {
             const jobs = await prisma.job.findMany({
                 include: { user: { select: { name: true, email: true } } },
                 orderBy: { postDate: 'desc' }
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

     function parseSalary(salaryStr) {
         if (!salaryStr) return 0;
         if (salaryStr.includes('-')) {
             const [min, max] = salaryStr.split('-');
             return (parseSalary(min) + parseSalary(max)) / 2;
         }
         let numStr = salaryStr.toLowerCase()
             .replace(/[^0-9.k]/g, '')
             .replace(/\.(?=.*\.)/g, '');
         if (numStr.endsWith('k')) {
             numStr = parseFloat(numStr.slice(0, -1)) * 1000;
         }
         return parseFloat(numStr) || 0;
     }

     app.get('/api/search', async (req, res) => {
         try {
             const { query } = req.query;
             const where = { isApproved: true };
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
                 include: { user: { select: { name: true, email: true } } },
                 orderBy: { postDate: 'desc' }
             });
             if (query && /\d/.test(query)) {
                 const searchSalary = parseSalary(query);
                 if (searchSalary > 0) {
                     const filteredJobs = jobs.filter(job => {
                         const jobSalary = parseSalary(job.salary);
                         if (jobSalary === 0) return false;
                         const percentDiff = Math.abs(jobSalary - searchSalary) / searchSalary;
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

     app.post('/api/jobs/:id/apply', authenticateToken, upload.single('resume'), async (req, res) => {
         try {
             const jobId = parseInt(req.params.id);
             const userId = req.user.id;
             const { name, email, phone, comments } = req.body;
             if (!isValidEmail(email)) {
                 return res.status(400).json({ error: 'Invalid email format' });
             }
             if (!isValidPhone(phone)) {
                 return res.status(400).json({ error: 'Invalid phone number format' });
             }
             const job = await prisma.job.findUnique({
                 where: { id: jobId },
                 select: { isApproved: true, userId: true, name: true }
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
             const formattedPhone = phone.replace(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, '($1) $2-$3');
             const resumePath = req.file ? `/uploads/${req.file.filename}` : null;
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
             let emailWarning = null;
             try {
                 const result = await sendEmail({
                     to: email,
                     subject: `Application Submitted for ${job.name}`,
                     html: `
                         <p>Dear ${name},</p>
                         <p>Thank you for applying to the ${job.name} position. We have received your application and will review it shortly.</p>
                         <p>Best regards,<br>TestHireEmail Team</p>
                     `
                 });
                 if (!result.success) {
                     throw new Error(result.error);
                 }
             } catch (emailError) {
                 console.error('Failed to send confirmation email:', emailError);
                 emailWarning = 'Confirmation email could not be sent';
             }
             res.status(201).json({
                 application,
                 ...(emailWarning && { warning: emailWarning })
             });
         } catch (err) {
             console.error('Application error:', err);
             res.status(500).json({ error: 'Failed to submit application' });
         }
     });

     app.get('/api/jobs/:id/applications', authenticateToken, async (req, res) => {
         try {
             const jobId = parseInt(req.params.id);
             const job = await prisma.job.findUnique({
                 where: { id: jobId }
             });
             if (!job) {
                 return res.status(404).json({ error: 'Job not found' });
             }
             if (job.userId !== req.user.id && !req.user.isAdmin) {
                 return res.status(403).json({ error: 'Not authorized to view applications' });
             }
             const applications = await prisma.jobApplication.findMany({
                 where: { jobId },
                 orderBy: { createdAt: 'desc' }
             });
             res.json(applications);
         } catch (error) {
             console.error('Error fetching applications:', error);
             res.status(500).json({ error: 'Failed to fetch applications' });
         }
     });

     app.get('/api/jobs/my-postings', authenticateToken, async (req, res) => {
         try {
             console.log('=== My Postings Request ===');
             console.log('User ID:', req.user.id);
             console.log('User details:', req.user);
             console.log('Request headers:', req.headers);
             const user = await prisma.user.findUnique({
                 where: { id: req.user.id }
             });
             if (!user) {
                 console.error('User not found:', req.user.id);
                 return res.status(404).json({ error: 'User not found' });
             }
             console.log('Found user:', user);
             const jobs = await prisma.job.findMany({
                 where: { userId: req.user.id },
                 include: { user: { select: { name: true, email: true } } },
                 orderBy: { postDate: 'desc' }
             });
             console.log('Number of jobs found:', jobs.length);
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

     const PORT = process.env.PORT || 5050;

     const startServer = async () => {
         try {
             await prisma.$connect();
             app.listen(5050, "0.0.0.0", () => {
                 console.log("Server running on http://0.0.0.0:5050");
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