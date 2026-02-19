import { Request, Response, Router } from 'express';
import { emailService } from '../email/email.service';

export class EmployeesController {
    private _router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Handle employee creation/verification request
        this._router.post('/', this.requestVerification);
        this._router.post('/request-verification', this.requestVerification);
    }

    private requestVerification = async (req: Request, res: Response) => {
        try {
            const employeeData = req.body;

            // Log the request
            console.log(`[Employees] New verification request for: ${employeeData.name}`);

            // Hardcoded recipient as requested by user
            const opsManagerEmail = 'genroujoshcatacutan25@gmail.com';

            // Send Email
            const emailResult = await emailService.sendEmployeeVerificationEmail(opsManagerEmail, {
                name: employeeData.name,
                role: employeeData.role,
                department: employeeData.department,
                salary: typeof employeeData.salary === 'string' ? parseFloat(employeeData.salary) : employeeData.salary,
                status: 'Pending Verification', // Override status to Pending
                hoursThisWeek: 0,
                performance: 0
            });

            if (!emailResult.success) {
                console.error('[Employees] Email send failed:', emailResult.error);
                // Return success anyway for the UI flow, but include warning
                return res.status(200).json({
                    success: true,
                    message: 'Employee added locally. Warning: Email verification failed (Check server logs/configuration).',
                    emailSent: false
                });
            }

            console.log(`[Employees] Email sent successfully to ${opsManagerEmail}`);

            res.status(201).json({
                success: true,
                message: `Verification email sent to Operations Manager (${opsManagerEmail})`,
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
