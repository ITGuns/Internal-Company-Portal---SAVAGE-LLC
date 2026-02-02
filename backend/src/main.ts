import 'reflect-metadata'
import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import passport from 'passport'
import { AppModule } from './app.module'
import { TasksController } from './tasks/tasks.controller'
import { UsersController } from './users/users.controller'
import { AuthController } from './auth/auth.controller'
import { config, validateConfig } from './config/env.config'
import { PrismaService } from './database/prisma.service'
import { initializePassport } from './auth/passport.config'

async function bootstrap() {
  // Validate environment configuration
  validateConfig()

  // Connect to database
  await PrismaService.connect()

  // Initialize Passport OAuth strategies
  initializePassport()

  const app = express()
  app.use(bodyParser.json())
  app.use(passport.initialize())

  // Enable CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', config.corsOrigin)
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Backend listening on http://localhost:${config.port}`)
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
