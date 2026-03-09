import 'reflect-metadata'
import express, { Request, Response, NextFunction } from 'express'
import { createServer } from 'http' // Added for Socket.io
import bodyParser from 'body-parser'
import passport from 'passport'
import { AppModule } from './app.module'
import { TasksController } from './tasks/tasks.controller'
import { UsersController } from './users/users.controller'
import { DepartmentsController } from './departments/departments.controller'
import { RolesController } from './roles/roles.controller'
import { EmailController } from './email/email.controller'
import { AuthController } from './auth/auth.controller'
import { AnnouncementsController } from './announcements/announcements.controller'
import { DailyLogsController } from './daily-logs/daily-logs.controller'
import { PayrollController } from './payroll/payroll.controller'
import { ChatController } from './chat/chat.controller'
import { UploadsController } from './uploads/uploads.controller'
import { EmployeesController } from './employees/employees.controller'
import { FileDirectoryController } from './file-directory/file-directory.controller'
import { NotificationsController } from './notifications/notifications.controller'
import { config, validateConfig } from './config/env.config'
import path from 'path'
import { PrismaService } from './database/prisma.service'
import { initializePassport } from './auth/passport.config'
import { notificationService } from './notifications/socket.service' // Service for real-time updates

async function bootstrap() {
  // Validate environment configuration
  validateConfig()

  // Connect to database
  await PrismaService.connect()

  // Initialize Passport OAuth strategies
  initializePassport()

  const app = express()
  const httpServer = createServer(app) // Create HTTP server

  // Initialize Notification Service (Socket.io)
  notificationService.initialize(httpServer)

  app.use(bodyParser.json({ limit: '50mb' }))
  app.use(passport.initialize())

  // Serve static uploads (from backend/uploads)
  const uploadsPath = process.env.VERCEL === '1'
    ? path.join('/tmp', 'uploads')
    : path.join(__dirname, '../uploads')
  app.use('/uploads', express.static(uploadsPath))

  // Debug Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Enable CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    // STRENGTHENED SECURITY: Only allow configured origin
    res.header('Access-Control-Allow-Origin', config.corsOrigin)

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.header('Access-Control-Allow-Credentials', 'true') // Added for Socket.io
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }
    next()
  })

  // Health check endpoint
  app.get('/health', async (req: Request, res: Response) => {
    const dbHealthy = await PrismaService.healthCheck()
    res.json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    })
  })

  // Authentication routes
  const authController = new AuthController()
  app.use('/auth', authController.router())

  // API routes
  const usersController = new UsersController()
  app.use('/api/users', usersController.router())

  const tasksController = new TasksController()
  app.use('/api/tasks', tasksController.router())

  const departmentsController = new DepartmentsController()
  app.use('/api/departments', departmentsController.router())

  const rolesController = new RolesController()
  app.use('/api/roles', rolesController.router())

  const emailController = new EmailController()
  app.use('/api/email', emailController.router())

  const announcementsController = new AnnouncementsController()
  app.use('/api/announcements', announcementsController.router())

  const dailyLogsController = new DailyLogsController()
  app.use('/api/daily-logs', dailyLogsController.router())

  const payrollController = new PayrollController()
  app.use('/api/payroll', payrollController.router())

  const chatController = new ChatController()
  app.use('/api/chat', chatController.router())

  const uploadsController = new UploadsController()
  app.use('/api/uploads', uploadsController.router())

  const employeesController = new EmployeesController()
  app.use('/api/employees', employeesController.router())

  const fileDirectoryController = new FileDirectoryController()
  app.use('/api/file-directory', fileDirectoryController.router())

  const notificationsController = new NotificationsController()
  app.use('/api/notifications', notificationsController.router())


  // Expose app for Vercel
  if (process.env.VERCEL) {
    return app;
  }

  // Listen on HTTP Server instead of App
  httpServer.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Backend listening on http://localhost:${config.port}`)
    console.log(`📡 Socket.io server initialized`)
    console.log(`📝 Environment: ${config.nodeEnv}`)
  })
}

// For Vercel, we export the app instance directly
let cachedApp: any;

export default async (req: any, res: any) => {
  if (!cachedApp) {
    try {
      cachedApp = await bootstrap();
    } catch (err) {
      console.error('Failed to bootstrap application:', err);
      return res.status(500).send('Server Boot Error');
    }
  }
  return cachedApp(req, res);
};

// Start the server for local development
if (!process.env.VERCEL) {
  bootstrap().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}




// ts-node-dev trigger reload

// ts-node-dev trigger reload 2

// ts-node-dev trigger reload 3
