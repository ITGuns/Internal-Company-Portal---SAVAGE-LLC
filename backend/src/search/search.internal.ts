import { prisma } from '../database/prisma.service'
import { getTaskVisibilityFilter } from '../tasks/tasks.permissions'
import type { GlobalSearchAccess } from './search.access'
import type { GlobalSearchResult } from './search.types'
import { ACTIVE_USER_STATUSES, CLIENT_DIRECTORY_ONLY_ROLES, compact, toDateLabel } from './search.utils'

export async function searchInternalRecords(query: string, access: GlobalSearchAccess, limit: number): Promise<GlobalSearchResult[]> {
  const groups = await Promise.all([
    searchTasks(query, access, limit),
    searchDailyLogs(query, access, limit),
    searchAnnouncements(query, limit),
    searchMessages(query, access, limit),
    searchFiles(query, access, limit),
  ])

  return groups.flat()
}

export async function searchPeople(query: string, limit: number): Promise<GlobalSearchResult[]> {
  const users = await prisma.user.findMany({
    where: {
      status: { in: ACTIVE_USER_STATUSES },
      roles: {
        some: {
          role: { notIn: CLIENT_DIRECTORY_ONLY_ROLES },
        },
      },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      roles: {
        include: {
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
    take: limit,
  })

  return users.map((user) => ({
    id: `person:${user.id}`,
    type: 'person',
    title: user.name || user.email,
    subtitle: compact([
      user.email,
      user.roles[0]?.role,
      user.roles[0]?.department?.name,
    ]),
    href: '/chat',
    section: 'People',
  }))
}

async function searchTasks(query: string, access: GlobalSearchAccess, limit: number): Promise<GlobalSearchResult[]> {
  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        getTaskVisibilityFilter({
          requesterId: access.requesterId,
          isPrivileged: access.canSearchManagementRecords,
        }),
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { status: { contains: query, mode: 'insensitive' } },
            { priority: { contains: query, mode: 'insensitive' } },
            { role: { contains: query, mode: 'insensitive' } },
            { department: { name: { contains: query, mode: 'insensitive' } } },
            { project: { name: { contains: query, mode: 'insensitive' } } },
            { assignee: { name: { contains: query, mode: 'insensitive' } } },
            { assignee: { email: { contains: query, mode: 'insensitive' } } },
            { creator: { name: { contains: query, mode: 'insensitive' } } },
            { creator: { email: { contains: query, mode: 'insensitive' } } },
            {
              collaborators: {
                some: {
                  OR: [
                    { user: { name: { contains: query, mode: 'insensitive' } } },
                    { user: { email: { contains: query, mode: 'insensitive' } } },
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      assignee: { select: { name: true, email: true } },
      department: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })

  return tasks.map((task) => ({
    id: `task:${task.id}`,
    type: 'task',
    title: task.title,
    subtitle: compact([task.status, task.assignee?.name || task.assignee?.email, task.department?.name, task.project?.name]),
    href: `/task-tracking?task=${encodeURIComponent(task.id)}`,
    section: 'Tasks',
  }))
}

async function searchDailyLogs(query: string, access: GlobalSearchAccess, limit: number): Promise<GlobalSearchResult[]> {
  const dailyLogs = await prisma.dailyLog.findMany({
    where: {
      AND: [
        access.canSearchManagementRecords ? {} : { authorId: access.requesterId },
        {
          OR: [
            { content: { contains: query, mode: 'insensitive' } },
            { department: { contains: query, mode: 'insensitive' } },
            { status: { contains: query, mode: 'insensitive' } },
            { shiftNotes: { contains: query, mode: 'insensitive' } },
            { logType: { contains: query, mode: 'insensitive' } },
            { author: { name: { contains: query, mode: 'insensitive' } } },
            { author: { email: { contains: query, mode: 'insensitive' } } },
          ],
        },
      ],
    },
    include: {
      author: { select: { name: true, email: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })

  return dailyLogs.map((log) => ({
    id: `daily-log:${log.id}`,
    type: 'daily-log',
    title: log.content || `${log.logType} log`,
    subtitle: compact([toDateLabel(log.date), log.author?.name || log.author?.email, log.department, log.status]),
    href: '/daily-logs',
    section: 'Daily Logs',
  }))
}

async function searchAnnouncements(query: string, limit: number): Promise<GlobalSearchResult[]> {
  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { author: { name: { contains: query, mode: 'insensitive' } } },
      ],
    },
    include: {
      author: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return announcements.map((announcement) => ({
    id: `announcement:${announcement.id}`,
    type: 'announcement',
    title: announcement.title,
    subtitle: compact([announcement.category, announcement.author?.name, toDateLabel(announcement.createdAt)]),
    href: '/announcements',
    section: 'Announcements',
  }))
}

async function searchMessages(query: string, access: GlobalSearchAccess, limit: number): Promise<GlobalSearchResult[]> {
  const messages = await prisma.message.findMany({
    where: {
      content: { contains: query, mode: 'insensitive' },
      conversation: {
        participants: { some: { userId: access.requesterId } },
      },
    },
    include: {
      sender: { select: { name: true, email: true } },
      conversation: { select: { name: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return messages.map((message) => ({
    id: `message:${message.id}`,
    type: 'message',
    title: message.content,
    subtitle: compact([message.sender?.name || message.sender?.email, message.conversation.name || message.conversation.type, toDateLabel(message.createdAt)]),
    href: '/chat',
    section: 'Messages',
  }))
}

async function searchFiles(query: string, access: GlobalSearchAccess, limit: number): Promise<GlobalSearchResult[]> {
  const visibility = access.canSearchAllFileDepartments
    ? {}
    : {
        OR: [
          { department: 'All Departments' },
          ...(access.departmentNames.length > 0 ? [{ department: { in: access.departmentNames } }] : []),
        ],
      }

  const files = await prisma.fileFolder.findMany({
    where: {
      AND: [
        visibility,
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { department: { contains: query, mode: 'insensitive' } },
            { type: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })

  return files.map((file) => ({
    id: `file:${file.id}`,
    type: 'file',
    title: file.name,
    subtitle: compact([file.type, file.department]),
    href: '/file-directory',
    section: 'Files',
  }))
}
