import { Request, Response, Router } from 'express';
import bcrypt from 'bcrypt';
import { emailService } from '../email/email.service';
import { EmployeesService } from './employees.service';
import { authenticateToken, requireRole } from '../auth/auth.middleware';
import * as crypto from 'crypto';
export class EmployeesController {
    private _router = Router();
    private employeesService: EmployeesService;

    constructor() {
        this.employeesService = new EmployeesService();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Handle employee creation/verification request (Likely a public or semi-public endpoint)
        this._router.post('/', this.requestVerification);
        this._router.post('/request-verification', this.requestVerification);

        // Approval Workflow - PROTECTED
        // Managers or Admins can see pending and deployed lists
        this._router.get('/pending', authenticateToken, requireRole(['overlord', 'manager', 'operations_manager', 'operations manager']), this.getPending);
        this._router.get('/deployed', authenticateToken, this.getDeployed);

        // Approve and Reject are strictly for Admins, Operations Managers, or authorized emails
        this._router.post('/approve/:id', authenticateToken, this.approve);
        this._router.post('/reject/:id', authenticateToken, this.reject);
    }

    private getPending = async (req: Request, res: Response) => {
        try {
            const pending = await this.employeesService.getPending();
            res.status(200).json(pending);
        } catch (error) {
            console.error('[Employees] Error fetching pending:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private getDeployed = async (req: Request, res: Response) => {
        try {
            const deployed = await this.employeesService.getDeployed();
            res.status(200).json(deployed);
        } catch (error) {
            console.error('[Employees] Error fetching deployed:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private authorizeBypass = async (req: Request) => {
        const authReq = req as any;
        const email = authReq.user?.email?.toLowerCase();
        const userId = authReq.user?.userId;

        // Specific authorized emails
        const isAuthorizedEmail = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(email || '');
        if (isAuthorizedEmail) return true;

        // Check if admin/manager
        const { prisma } = await import('../database/prisma.service');
        const roles = await prisma.userRole.findMany({ where: { userId } });
        return roles.some(r => ['overlord', 'manager', 'operations_manager', 'operations manager'].includes(r.role.toLowerCase()));
    }

    private approve = async (req: Request, res: Response) => {
        try {
            if (!(await this.authorizeBypass(req))) {
                return res.status(403).json({ error: 'Unauthorized to approve employees' });
            }
            const { id } = req.params;
            const updated = await this.employeesService.approve(id as string);
            res.status(200).json({ success: true, user: updated });
        } catch (error) {
            console.error('[Employees] Error approving:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private reject = async (req: Request, res: Response) => {
        try {
            if (!(await this.authorizeBypass(req))) {
                return res.status(403).json({ error: 'Unauthorized to reject employees' });
            }
            const { id } = req.params;
            const updated = await this.employeesService.reject(id as string);
            res.status(200).json({ success: true, user: updated });
        } catch (error) {
            console.error('[Employees] Error rejecting:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private requestVerification = async (req: Request, res: Response) => {
        try {
            const employeeData = req.body;

            // Log the request
            console.log(`[Employees] New verification request for: ${employeeData.name}`);

            // 1. SAVE TO DATABASE
            // Generate a unique random password (12-char hex + S!)
            const defaultPassword = crypto.randomBytes(6).toString('hex') + 'S!';
            const passwordHash = await bcrypt.hash(defaultPassword, 10);

            const newEmployee = await this.employeesService.createPending({
                email: employeeData.email,
                name: employeeData.name,
                role: employeeData.role || employeeData.jobTitle,
                department: employeeData.department,
                salary: typeof employeeData.salary === 'string' ? parseFloat(employeeData.salary) : (employeeData.salary || 0),
                passwordHash,
                avatar: employeeData.avatar
            });

            // Hardcoded recipient for approval as requested
            const opsManagerEmail = 'genroujoshcatacutan25@gmail.com';

            // 2. SEND WELCOME EMAIL TO NEW HIRE
            const welcomeResult = await emailService.sendWelcomeEmail(
                employeeData.email,
                employeeData.name,
                defaultPassword
            );

            // 3. SEND NOTIFICATION TO OPS MANAGER
            const emailResult = await emailService.sendEmployeeVerificationEmail(opsManagerEmail, {
                id: newEmployee.id,
                name: employeeData.name,
                role: employeeData.role || employeeData.jobTitle,
                department: employeeData.department,
                salary: typeof employeeData.salary === 'string' ? parseFloat(employeeData.salary) : (employeeData.salary || 0),
                status: 'Pending Verification',
                hoursThisWeek: 0,
                performance: 0
            });

            const emailStatus = {
                welcomeSent: welcomeResult.success,
                opsNotified: emailResult.success
            };

            console.log(`[Employees] Welcome email to ${employeeData.email}: ${welcomeResult.success ? 'Success' : 'Failed'}`);
            console.log(`[Employees] Manager notification to ${opsManagerEmail}: ${emailResult.success ? 'Success' : 'Failed'}`);

            res.status(201).json({
                success: true,
                message: `Application submitted. Welcome email sent to ${employeeData.name}.`,
                employee: newEmployee,
                emailStatus
            });

        } catch (error: any) {
            console.error('[Employees] Error:', error);

            // Handle Prisma unique constraint violated for email
            if (error.code === 'P2002') {
                return res.status(400).json({
                    error: 'Email already in use',
                    details: 'An employee application with this email address already exists.'
                });
            }

            res.status(500).json({ error: 'Internal Server Error', details: error.message, stack: error.stack });
        }
    }

    public router() {
        return this._router;
    }
}
