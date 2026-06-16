import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { TasksController } from '../src/tasks/tasks.controller'

type JsonRecord = Record<string, any>

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    token?: string
    body?: JsonRecord
  } = {},
): Promise<{ status: number; body: JsonRecord | JsonRecord[] }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const text = await response.text()
  const body = text
    ? (() => {
        try {
          return JSON.parse(text)
        } catch {
          return { raw: text }
        }
      })()
    : {}

  return {
    status: response.status,
    body,
  }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
  app.use('/api/tasks', new TasksController().router())

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.equal(typeof address, 'object')
  assert.ok(address)
  const port = (address as AddressInfo).port

  try {
    return await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

function tokenFor(user: { id: string; email: string; name: string | null }): string {
  return JwtService.generateAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name || undefined,
  })
}

async function runTaskProjectRouteTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const department = await prisma.department.create({
    data: {
      name: `Task Project Members ${suffix}`,
    },
  })
  const managerEmail = uniqueEmail('task-project-manager')
  const memberEmail = uniqueEmail('task-project-member')
  const outsiderEmail = uniqueEmail('task-project-outsider')
  const projectIds: string[] = []
  const taskIds: string[] = []

  const manager = await prisma.user.create({
    data: {
      email: managerEmail,
      name: 'Task Project Manager',
      status: 'active',
      isApproved: true,
      roles: {
        create: {
          role: 'Project Manager',
          departmentId: department.id,
        },
      },
    },
  })
  const member = await prisma.user.create({
    data: {
      email: memberEmail,
      name: 'Task Project Member',
      status: 'active',
      isApproved: true,
      roles: {
        create: {
          role: 'Frontend Developer',
          departmentId: department.id,
        },
      },
    },
  })
  const outsider = await prisma.user.create({
    data: {
      email: outsiderEmail,
      name: 'Task Project Outsider',
      status: 'active',
      isApproved: true,
      roles: {
        create: {
          role: 'Frontend Developer',
          departmentId: department.id,
        },
      },
    },
  })

  try {
    await withServer(async (baseUrl) => {
      const createProject = await requestJson(baseUrl, '/api/tasks/projects', {
        method: 'POST',
        token: tokenFor(manager),
        body: {
          name: `Member scoped project ${suffix}`,
          description: 'Route test project',
          memberIds: [member.id],
          targetDate: '2026-06-30',
        },
      })

      assert.equal(createProject.status, 201)
      assert.equal(Array.isArray((createProject.body as JsonRecord).members), true)
      assert.equal((createProject.body as JsonRecord).members[0].userId, member.id)
      assert.equal((createProject.body as JsonRecord).members[0].user.email, member.email)

      const projectId = String((createProject.body as JsonRecord).id)
      projectIds.push(projectId)

      const memberProjects = await requestJson(baseUrl, '/api/tasks/projects', {
        token: tokenFor(member),
      })
      assert.equal(memberProjects.status, 200)
      assert.equal((memberProjects.body as JsonRecord[]).some((project) => project.id === projectId), true)

      const outsiderProjects = await requestJson(baseUrl, '/api/tasks/projects', {
        token: tokenFor(outsider),
      })
      assert.equal(outsiderProjects.status, 200)
      assert.equal((outsiderProjects.body as JsonRecord[]).some((project) => project.id === projectId), false)

      const clearMembers = await requestJson(baseUrl, `/api/tasks/projects/${projectId}`, {
        method: 'PATCH',
        token: tokenFor(manager),
        body: {
          memberIds: [],
        },
      })
      assert.equal(clearMembers.status, 200)
      assert.deepEqual((clearMembers.body as JsonRecord).members, [])

      const globalProjects = await requestJson(baseUrl, '/api/tasks/projects', {
        token: tokenFor(outsider),
      })
      assert.equal(globalProjects.status, 200)
      assert.equal((globalProjects.body as JsonRecord[]).some((project) => project.id === projectId), true)

      const createCollaborativeTask = await requestJson(baseUrl, '/api/tasks', {
        method: 'POST',
        token: tokenFor(manager),
        body: {
          title: `Collaborative task ${suffix}`,
          description: 'Invite response route coverage',
          departmentId: department.id,
          assigneeId: manager.id,
          collaboratorIds: [member.id],
        },
      })
      assert.equal(createCollaborativeTask.status, 201)

      const taskId = String((createCollaborativeTask.body as JsonRecord).id)
      taskIds.push(taskId)

      const invitedTask = await requestJson(baseUrl, `/api/tasks/${taskId}`, {
        token: tokenFor(member),
      })
      assert.equal(invitedTask.status, 200)
      assert.equal(
        ((invitedTask.body as JsonRecord).collaborators as JsonRecord[])
          .find((collaborator) => collaborator.userId === member.id)?.status,
        'invited',
      )

      const acceptInvite = await requestJson(baseUrl, `/api/tasks/${taskId}/collaborators/me`, {
        method: 'PATCH',
        token: tokenFor(member),
        body: {
          status: 'accepted',
        },
      })
      assert.equal(acceptInvite.status, 200)
      assert.equal(
        ((acceptInvite.body as JsonRecord).collaborators as JsonRecord[])
          .find((collaborator) => collaborator.userId === member.id)?.status,
        'accepted',
      )

      const outsiderInviteResponse = await requestJson(baseUrl, `/api/tasks/${taskId}/collaborators/me`, {
        method: 'PATCH',
        token: tokenFor(outsider),
        body: {
          status: 'accepted',
        },
      })
      assert.equal(outsiderInviteResponse.status, 404)

      const declineInvite = await requestJson(baseUrl, `/api/tasks/${taskId}/collaborators/me`, {
        method: 'PATCH',
        token: tokenFor(member),
        body: {
          status: 'declined',
        },
      })
      assert.equal(declineInvite.status, 200)
      assert.equal(
        ((declineInvite.body as JsonRecord).collaborators as JsonRecord[])
          .find((collaborator) => collaborator.userId === member.id)?.status,
        'declined',
      )

      const declinedTask = await requestJson(baseUrl, `/api/tasks/${taskId}`, {
        token: tokenFor(member),
      })
      assert.equal(declinedTask.status, 403)
    })
  } finally {
    if (taskIds.length > 0) {
      await prisma.task.deleteMany({ where: { id: { in: taskIds } } })
    }
    if (projectIds.length > 0) {
      await prisma.taskProjectMember.deleteMany({ where: { projectId: { in: projectIds } } })
      await prisma.taskProject.deleteMany({ where: { id: { in: projectIds } } })
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [managerEmail, memberEmail, outsiderEmail],
        },
      },
    })
    await prisma.department.deleteMany({ where: { id: department.id } })
  }
}

runTaskProjectRouteTests()
  .then(() => {
    console.log('tasks.projects tests passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
