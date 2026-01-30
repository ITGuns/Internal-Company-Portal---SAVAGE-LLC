import express from 'express'
import { TasksService } from './tasks.service'

export class TasksController {
  private service = new TasksService()

  router() {
    const router = express.Router()

    router.get('/', (req, res) => {
      res.json(this.service.findAll())
    })

    router.get('/:id', (req, res) => {
      const task = this.service.findById(req.params.id)
      if (!task) return res.status(404).json({ error: 'Not found' })
      res.json(task)
    })

    router.post('/', (req, res) => {
      const created = this.service.create(req.body)
      res.status(201).json(created)
    })

    return router
  }
}
