import 'reflect-metadata'
import express, { Request, Response, NextFunction } from 'express'
import { createServer } from 'http' // Added for Socket.io
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
import { ClientsController } from './clients/clients.controller'
import { SearchController } from './search/search.controller'
import { WorkspaceController } from './workspace/workspace.controller'
import { SchedulerController } from './scheduler/scheduler.controller'
import { resolveCorsResponseOrigin } from './config/cors.config'
import { config, validateConfig } from './config/env.config'
import { PrismaService } from './database/prisma.service'
import { initializePassport } from './auth/passport.config'
import { notificationService } from './notifications/socket.service' // Service for real-time updates
import { createAuthRateLimiters } from './security/rate-limits'
import { connectAuthRateLimitStoreFactory } from './security/redis-rate-limit.store'
import { configureJsonBodyParsers } from './security/json-body-limits'
import { createSecurityHeadersMiddleware } from './security/security-headers'
import { createLogger } from './observability/logger'
import { createHealthRouter } from './health/health.routes'
import { isRefreshSessionPersistenceAvailable } from './auth/refresh-session.service'
import { createUploadStorage } from './uploads/upload.storage'
import { validateCommercialRuntimeDependencies } from './config/production-readiness.config'

const logger = createLogger('backend.main')

async function bootstrap() {
  // Validate environment configuration
  validateConfig()

  // Connect to database
  await PrismaService.connect()

  const uploadStorage = createUploadStorage()
  if (config.commercialReadinessMode) {
    const [refreshSessionPersistenceAvailable, uploadStorageAvailable] = await Promise.all([
      isRefreshSessionPersistenceAvailable(),
      uploadStorage.healthCheck(),
    ])
    validateCommercialRuntimeDependencies({
      refreshSessionPersistenceAvailable,
      uploadStorageAvailable,
    })
  }

  // Initialize Passport OAuth strategies
  initializePassport()

  const app = express()
  const httpServer = createServer(app) // Create HTTP server

  if (config.trustProxyHops > 0) {
    app.set('trust proxy', config.trustProxyHops)
  }

  app.use(createSecurityHeadersMiddleware({ nodeEnv: config.nodeEnv }))

  // Initialize Notification Service (Socket.io)
  await notificationService.initialize(httpServer)

  const authRateLimitStoreFactory = await connectAuthRateLimitStoreFactory({
    nodeEnv: config.nodeEnv,
    prefix: config.authRateLimitRedisPrefix,
    redisUrl: config.redisUrl,
    storeMode: config.authRateLimitStore,
  })

  configureJsonBodyParsers(app)
  app.use(passport.initialize())

  const shouldLogRequests = config.nodeEnv !== 'production' || config.logLevel.toLowerCase() === 'debug'

  // Request logging is useful locally, but too noisy for normal production traffic.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (shouldLogRequests) {
      logger.info('HTTP request received', { method: req.method, path: req.path });
    }
    next();
  });

  // Enable CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    const responseOrigin = resolveCorsResponseOrigin(req.headers.origin, config.corsOrigins)
    if (responseOrigin) {
      res.header('Access-Control-Allow-Origin', responseOrigin)
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.header('Access-Control-Allow-Credentials', 'true') // Added for Socket.io
    res.header('Vary', 'Origin')
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }
    next()
  })

  app.use(createHealthRouter({
    checkDatabase: () => PrismaService.healthCheck(),
    checkReadiness: async () => {
      const databaseHealthy = await PrismaService.healthCheck()
      if (!databaseHealthy) return false
      if (!config.commercialReadinessMode) return true
      const [refreshSessionsAvailable, storageAvailable] = await Promise.all([
        isRefreshSessionPersistenceAvailable(),
        uploadStorage.healthCheck(),
      ])
      return refreshSessionsAvailable && storageAvailable
    },
  }))

  // Authentication routes
  const authController = new AuthController({
    rateLimiters: createAuthRateLimiters({
      settings: config.authRateLimits,
      storeFactory: authRateLimitStoreFactory,
    }),
  })
  const authRouter = authController.router()
  app.use('/auth', authRouter)
  app.use('/backend-auth', authRouter)

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

  const uploadsController = new UploadsController(uploadStorage)
  app.use('/api/uploads', uploadsController.router())

  const employeesController = new EmployeesController()
  app.use('/api/employees', employeesController.router())

  const fileDirectoryController = new FileDirectoryController()
  app.use('/api/file-directory', fileDirectoryController.router())

  const notificationsController = new NotificationsController()
  app.use('/api/notifications', notificationsController.router())

  const clientsController = new ClientsController()
  app.use('/api/clients', clientsController.router())

  const searchController = new SearchController()
  app.use('/api/search', searchController.router())

  const workspaceController = new WorkspaceController()
  app.use('/api/workspace', workspaceController.router())

  const schedulerController = new SchedulerController()
  app.use('/api/scheduler', schedulerController.router())


  // Expose app for Vercel
  if (process.env.VERCEL) {
    return app;
  }

  // Listen on HTTP Server instead of App
  httpServer.listen(config.port, () => {
    logger.info('Backend listening', { port: config.port })
    logger.info('Socket.io server initialized')
    logger.info('Backend environment configured', { nodeEnv: config.nodeEnv })
  })
}

// For Vercel, we export the app instance directly
let cachedApp: express.Express | undefined;

export default async (req: Request, res: Response) => {
  if (!cachedApp) {
    try {
      cachedApp = await bootstrap();
    } catch (err) {
      logger.error('Failed to bootstrap application', err);
      return res.status(500).send('Server Boot Error');
    }
  }
  return cachedApp(req, res);
};

// Start the server for local development
if (!process.env.VERCEL) {
  bootstrap().catch(err => {
    logger.error('Failed to start server', err);
    process.exit(1);
  });
}
