import 'reflect-metadata'
import express from 'express'
import bodyParser from 'body-parser'
import { AppModule } from './app.module'
import { TasksController } from './tasks/tasks.controller'

async function bootstrap() {
  const app = express()
  app.use(bodyParser.json())

  // Minimal module wiring — replace with NestJS later if desired
  const tasksController = new TasksController()
  app.use('/api/tasks', tasksController.router())

  const port = process.env.PORT ?? 4000
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${port}`)
  })
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err)
  process.exit(1)
})
