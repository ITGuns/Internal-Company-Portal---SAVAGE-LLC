export type Task = {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'completed'
}

export class TasksService {
  private tasks: Task[] = [
    { id: '1', title: 'Update employee handbook', status: 'todo' },
    { id: '2', title: 'API documentation update', status: 'in_progress' },
  ]

  findAll(): Task[] {
    return this.tasks
  }

  findById(id: string): Task | undefined {
    return this.tasks.find((t) => t.id === id)
  }

  create(task: Partial<Task>): Task {
    const newTask: Task = {
      id: String(Date.now()),
      title: task.title ?? 'Untitled',
      description: task.description,
      status: task.status ?? 'todo',
    }
    this.tasks.push(newTask)
    return newTask
  }
}
