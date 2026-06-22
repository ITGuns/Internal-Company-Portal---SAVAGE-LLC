import { Request, Response, Router } from 'express';
import bcrypt from 'bcrypt';
import { emailService } from '../email/email.service';
import { EmployeesService } from './employees.service';
import { authenticateToken, AuthRequest } from '../auth/auth.middleware';
import * as crypto from 'crypto';
import { isAdminEmail, config } from '../config/env.config';
import { MissingSignupRoleAssignmentError } from '../auth/signup.requests';
import { validateStoredAvatarValue } from '../uploads/upload.validation';
import {
    hasEmployeeManagementAccess,
    serializeDeployedEmployee,
    serializeEmployeeApplication,
    serializeEmployeesForManagement,
} from './employees.security';
import { createLogger } from '../observability/logger';

const logger = createLogger('employees.controller');

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
        this._router.get('/pending', authenticateToken, this.getPending);
        this._router.get('/deployed', authenticateToken, this.getDeployed);

        // Approve and Reject are strictly for Admins, Operations Managers, or authorized emails
        this._router.post('/approve/:id', authenticateToken, this.approve);
        this._router.post('/reject/:id', authenticateToken, this.reject);
    }

    private getPending = async (req: Request, res: Response) => {
        try {
            if (!(await this.authorizeBypass(req))) {
                return res.status(403).json({ error: 'Unauthorized to view pending employees' });
            }
            const pending = await this.employeesService.getPending();
            res.status(200).json(serializeEmployeesForManagement(pending));
        } catch (error) {
            logger.error('Error fetching pending employees', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private getDeployed = async (req: Request, res: Response) => {
        try {
            if (!(await this.authorizeBypass(req))) {
                return res.status(403).json({ error: 'Unauthorized to view deployed employees' });
            }
            const deployed = await this.employeesService.getDeployed();
            res.status(200).json(serializeEmployeesForManagement(deployed));
        } catch (error) {
            logger.error('Error fetching deployed employees', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private authorizeBypass = async (req: Request) => {
        const authReq = req as AuthRequest;
        const email = authReq.user?.email?.toLowerCase();
        const userId = authReq.user?.userId;
        if (!userId) return false;

        // Admin email bypass (configured via ADMIN_EMAILS env var)
        const isAuthorizedEmail = isAdminEmail(email);
        if (isAuthorizedEmail) return true;

        const { prisma } = await import('../database/prisma.service');
        const roles = await prisma.userRole.findMany({ where: { userId } });
        return hasEmployeeManagementAccess(roles);
    }

    private approve = async (req: Request, res: Response) => {
        try {
            if (!(await this.authorizeBypass(req))) {
                return res.status(403).json({ error: 'Unauthorized to approve employees' });
            }
            const { id } = req.params;
            const approval = await this.employeesService.approve(id as string);
            const emailResult = await emailService.sendTemplateEmail(
                approval.user.email,
                'Set up your Deskii workspace access',
                'password_reset',
                {
                    userName: approval.user.name || 'Employee',
                    resetUrl: approval.onboarding.setupUrl,
                    expiresInMinutes: Math.round((approval.onboarding.expiresAt.getTime() - Date.now()) / 60000),
                },
            );
            res.status(200).json({
                success: true,
                user: serializeDeployedEmployee(approval.user),
                onboarding: {
                    setupRequired: true,
                    emailSent: Boolean(emailResult.success),
                    expiresAt: approval.onboarding.expiresAt.toISOString(),
                    ...(emailResult.success ? {} : { setupUrl: approval.onboarding.setupUrl }),
                },
            });
        } catch (error) {
            if (error instanceof MissingSignupRoleAssignmentError) {
                return res.status(400).json({ error: error.message });
            }
            logger.error('Error approving employee', error);
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
            res.status(200).json({ success: true, user: serializeEmployeeApplication(updated) });
        } catch (error) {
            logger.error('Error rejecting employee', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private requestVerification = async (req: Request, res: Response) => {
        try {
            const employeeData = req.body;

            logger.info('New employee verification request received', {
                hasAvatar: employeeData.avatar !== undefined,
            });

            if (employeeData.avatar !== undefined) {
                const avatarValidation = validateStoredAvatarValue(employeeData.avatar);
                if (!avatarValidation.valid) {
                    return res.status(400).json({ error: avatarValidation.error || 'Invalid avatar data' });
                }
            }

            // 1. SAVE TO DATABASE
            // Keep the pending account non-loginable until approval/reset without sending credentials by email.
            const pendingPassword = crypto.randomBytes(24).toString('hex');
            const passwordHash = await bcrypt.hash(pendingPassword, 10);

            const newEmployee = await this.employeesService.createPending({
                email: employeeData.email,
                name: employeeData.name,
                role: employeeData.role || employeeData.jobTitle,
                department: employeeData.department,
                salary: typeof employeeData.salary === 'string' ? parseFloat(employeeData.salary) : (employeeData.salary || 0),
                passwordHash,
                avatar: employeeData.avatar
            });

            // Ops manager email from env config
            const opsManagerEmail = config.opsManagerEmail;

            // 2. SEND NOTIFICATION TO OPS MANAGER
            const emailResult = await emailService.sendEmployeeVerificationEmail(opsManagerEmail, {
                id: newEmployee.id,
                name: employeeData.name,
                role: employeeData.role || employeeData.jobTitle,
                department: employeeData.department,
                salary: typeof employeeData.salary === 'string' ? parseFloat(employeeData.salary) : (employeeData.salary || 0),
                status: 'Pending Verification',
                hoursThisWeek: 0,
                performance: null
            });

            const emailStatus = {
                opsNotified: emailResult.success
            };

            logger.info('Employee verification emails processed', emailStatus);

            res.status(201).json({
                success: true,
                message: `Application submitted. ${employeeData.name} is pending operations approval.`,
                employee: serializeEmployeeApplication(newEmployee),
                emailStatus
            });

        } catch (error) {
            logger.error('Employee verification request failed', error);

            // Handle Prisma unique constraint violated for email
            if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2002') {
                return res.status(400).json({
                    error: 'Email already in use',
                    details: 'An employee application with this email address already exists.'
                });
            }

            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    public router() {
        return this._router;
    }
}
