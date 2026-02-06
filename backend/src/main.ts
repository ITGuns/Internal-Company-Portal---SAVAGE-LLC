import 'reflect-metadata'
import express, { Request, Response, NextFunction } from 'express'
import { createServer } from 'http' // Added for Socket.io
import bodyParser from 'body-parser'
import passport from 'passport'
import { AppModule } from './app.module'
import { TasksController } from './tasks/tasks.controller'
import { UsersController } from './users/users.controller'
import { DepartmentsController } from './departments/departments.controller'
import { EmailController } from './email/email.controller'
import { AuthController } from './auth/auth.controller'
import { AnnouncementsController } from './announcements/announcements.controller'
import { DailyLogsController } from './daily-logs/daily-logs.controller'
import { PayrollController } from './payroll/payroll.controller'
import { config, validateConfig } from './config/env.config'
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

  app.use(bodyParser.json())
  app.use(passport.initialize())

  // Enable CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
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

  const emailController = new EmailController()
  app.use('/api/email', emailController.router())

  const announcementsController = new AnnouncementsController()
  app.use('/api/announcements', announcementsController.router())

  const dailyLogsController = new DailyLogsController()
  app.use('/api/daily-logs', dailyLogsController.router())

  const payrollController = new PayrollController()
  app.use('/api/payroll', payrollController.router())


  // Listen on HTTP Server instead of App
  httpServer.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Backend listening on http://localhost:${config.port}`)
    console.log(`📡 Socket.io server initialized`)
    console.log(`📝 Environment: ${config.nodeEnv}`)
    console.log(`🔐 OAuth endpoints:`)
    console.log(`   - Google: http://localhost:${config.port}/auth/google`)
    console.log(`   - Discord: http://localhost:${config.port}/auth/discord`)
  })
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to start server', err)
  process.exit(1)
})
