import express, { Request, Response, Router } from 'express'
import { TasksService, TaskStatus } from './tasks.service'
import { authenticateToken } from '../auth/auth.middleware'

export class TasksController {
  private service = new TasksService()

  router(): Router {
    const router = express.Router()

    // Get all tasks
    router.get('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const tasks = await this.service.findAll()
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks' })
      }
    })

    // Search tasks
    router.get('/search', authenticateToken, async (req: Request, res: Response) => {
      try {
        const query = req.query.q as string
        if (!query) {
          return res.status(400).json({ error: 'Search query required' })
        }
        const tasks = await this.service.search(query)
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to search tasks' })
      }
    })

    // Get tasks by status
    router.get('/status/:status', authenticateToken, async (req: Request, res: Response) => {
      try {
        const status = Array.isArray(req.params.status)
          ? req.params.status[0]
          : req.params.status

        // Validate status
        const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed']
        if (!validStatuses.includes(status as TaskStatus)) {
          return res.status(400).json({
            error: 'Invalid status',
            validStatuses
          })
        }

        const tasks = await this.service.findByStatus(status as TaskStatus)
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks by status' })
      }
    })

    // Get tasks by department
    router.get('/department/:departmentId', authenticateToken, async (req: Request, res: Response) => {
      try {
        const departmentId = Array.isArray(req.params.departmentId)
          ? req.params.departmentId[0]
          : req.params.departmentId

        const tasks = await this.service.findByDepartment(departmentId)
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks by department' })
      }
    })

    // Get tasks by assignee
    router.get('/assignee/:assigneeId', authenticateToken, async (req: Request, res: Response) => {
      try {
        const assigneeId = Array.isArray(req.params.assigneeId)
          ? req.params.assigneeId[0]
          : req.params.assigneeId

        const tasks = await this.service.findByAssignee(assigneeId)
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks by assignee' })
      }
    })

    // Get task by ID
    router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const task = await this.service.findById(id)

        if (!task) {
          return res.status(404).json({ error: 'Task not found' })
        }

        res.json(task)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch task' })
      }
    })

    // Create task
    router.post('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const { title, description, status, departmentId, assigneeId } = req.body

        if (!title) {
          return res.status(400).json({ error: 'Title is required' })
        }

        if (!departmentId) {
          return res.status(400).json({ error: 'Department ID is required' })
        }

        const task = await this.service.create({
          title,
          description,
          status,
          departmentId,
          assigneeId,
        })

        res.status(201).json(task)
      } catch (error: any) {
        if (error.code === 'P2003') {
          return res.status(400).json({
            error: 'Invalid department or assignee ID'
          })
        }
        res.status(500).json({ error: 'Failed to create task' })
      }
    })

    // Update task
    router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const { title, description, status, departmentId, assigneeId } = req.body

        // Check if task exists
        const existingTask = await this.service.findById(id)
        if (!existingTask) {
          return res.status(404).json({ error: 'Task not found' })
        }

        const task = await this.service.update(id, {
          title,
          description,
          status,
          departmentId,
          assigneeId,
        })

        res.json(task)
      } catch (error: any) {
        if (error.code === 'P2003') {
          return res.status(400).json({
            error: 'Invalid department or assignee ID'
          })
        }
        res.status(500).json({ error: 'Failed to update task' })
      }
    })

    // Delete task
    router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

        // Check if task exists
        const existingTask = await this.service.findById(id)
        if (!existingTask) {
          return res.status(404).json({ error: 'Task not found' })
        }

        await this.service.delete(id)
        res.json({ message: 'Task deleted successfully' })
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' })
      }
    })

    return router
  }
}
