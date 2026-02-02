import express, { Request, Response, Router } from 'express'
import { TasksService } from './tasks.service'

export class TasksController {
  private service = new TasksService()

  router(): Router {
    const router = express.Router()

    router.get('/', (req: Request, res: Response) => {
      res.json(this.service.findAll())
    })

    router.get('/:id', (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const task = this.service.findById(id)
      if (!task) return res.status(404).json({ error: 'Not found' })
      res.json(task)
    })

    router.post('/', (req: Request, res: Response) => {
      const created = this.service.create(req.body)
      res.status(201).json(created)
    })

    return router
  }
}
