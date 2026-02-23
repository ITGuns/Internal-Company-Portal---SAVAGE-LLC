import { Request, Response, Router } from 'express';
import { emailService } from '../email/email.service';
import { EmployeesService } from './employees.service';
import { authenticateToken, requireRole } from '../auth/auth.middleware';

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
        this._router.get('/pending', authenticateToken, requireRole(['admin', 'manager', 'operations manager']), this.getPending);
        this._router.get('/deployed', authenticateToken, this.getDeployed);

        // Approve and Reject are strictly for Admins or Operations Managers
        this._router.post('/approve/:id', authenticateToken, requireRole(['admin', 'operations manager']), this.approve);
        this._router.post('/reject/:id', authenticateToken, requireRole(['admin', 'operations manager']), this.reject);
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

    private approve = async (req: Request, res: Response) => {
        try {
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
            const newEmployee = await this.employeesService.createPending({
                email: employeeData.email,
                name: employeeData.name,
                role: employeeData.role || employeeData.jobTitle,
                department: employeeData.department,
                salary: typeof employeeData.salary === 'string' ? parseFloat(employeeData.salary) : (employeeData.salary || 0)
            });

            // Hardcoded recipient as requested by user
            const opsManagerEmail = 'genroujoshcatacutan25@gmail.com';

            // 2. SEND EMAIL
            const emailResult = await emailService.sendEmployeeVerificationEmail(opsManagerEmail, {
                id: newEmployee.id, // Include the ID for potential direct link in email
                name: employeeData.name,
                role: employeeData.role || employeeData.jobTitle,
                department: employeeData.department,
                salary: typeof employeeData.salary === 'string' ? parseFloat(employeeData.salary) : (employeeData.salary || 0),
                status: 'Pending Verification',
                hoursThisWeek: 0,
                performance: 0
            });

            if (!emailResult.success) {
                console.error('[Employees] Email send failed:', emailResult.error);
                return res.status(201).json({
                    success: true,
                    message: 'Employee application saved. Warning: Email notification failed.',
                    employee: newEmployee,
                    emailSent: false
                });
            }

            console.log(`[Employees] Email sent successfully to ${opsManagerEmail}`);

            res.status(201).json({
                success: true,
                message: `Application submitted and notification sent to Operations Manager (${opsManagerEmail})`,
                employee: newEmployee,
                emailSent: true
            });

        } catch (error) {
            console.error('[Employees] Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    public router() {
        return this._router;
    }
}
