import express, { Request, Response, Router } from 'express'
import { authenticateToken, AuthRequest } from '../auth/auth.middleware'
import { prisma } from '../database/prisma.service'

/**
 * Notifications Controller
 * Serves recent, persisted notifications pulled from real DB data:
 *   - Recent announcements (last 7 days)
 *   - Tasks assigned to the user (last 7 days)
 *   - Recent chat messages sent to the user (last 7 days)
 */
export class NotificationsController {

    router(): Router {
        const router = express.Router()

        // GET /api/notifications — returns recent notifications for the logged-in user
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const userId = (req as AuthRequest).user.userId
                const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // last 7 days

                const [announcements, tasks, chatMessages] = await Promise.all([
                    // Recent announcements
                    prisma.announcement.findMany({
                        where: { createdAt: { gte: since } },
                        select: { id: true, title: true, category: true, isImportant: true, createdAt: true },
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    }),

                    // Tasks assigned to this user
                    prisma.task.findMany({
                        where: {
                            assigneeId: userId,
                            createdAt: { gte: since }
                        },
                        select: { id: true, title: true, status: true, priority: true, createdAt: true },
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    }),

                    // Chat messages sent to this user's conversations (not from them)
                    prisma.message.findMany({
                        where: {
                            conversation: {
                                participants: { some: { userId } }
                            },
                            senderId: { not: userId },
                            createdAt: { gte: since }
                        },
                        include: {
                            sender: { select: { name: true } },
                            conversation: { select: { name: true } }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    }),
                ])

                // Shape everything into a unified Notification format
                const notifications: Array<{
                    id: string;
                    type: string;
                    title: string;
                    message: string;
                    link: string;
                    createdAt: string;
                    read: boolean;
                }> = []

                for (const a of announcements) {
                    notifications.push({
                        id: `ann-${a.id}`,
                        type: a.isImportant ? 'warning' : 'info',
                        title: a.isImportant ? `📢 Important: ${a.title}` : `📣 ${a.title}`,
                        message: `New ${a.category || 'announcement'} posted`,
                        link: '/announcements',
                        createdAt: a.createdAt.toISOString(),
                        read: false,
                    })
                }

                for (const t of tasks) {
                    notifications.push({
                        id: `task-${t.id}`,
                        type: t.priority === 'High' ? 'warning' : 'info',
                        title: `📋 Task Assigned: ${t.title}`,
                        message: `Priority: ${t.priority} · Status: ${t.status}`,
                        link: '/task-tracking',
                        createdAt: t.createdAt.toISOString(),
                        read: false,
                    })
                }

                for (const m of chatMessages) {
                    notifications.push({
                        id: `msg-${m.id}`,
                        type: 'info',
                        title: `💬 ${m.sender.name || 'Someone'} in #${m.conversation.name || 'chat'}`,
                        message: m.content.length > 80 ? m.content.slice(0, 80) + '…' : m.content,
                        link: '/chat',
                        createdAt: m.createdAt.toISOString(),
                        read: false,
                    })
                }

                // Sort all by date desc
                notifications.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )

                res.json(notifications.slice(0, 20)) // cap at 20
            } catch (error) {
                console.error('Error fetching notifications:', error)
                res.status(500).json({ error: 'Failed to fetch notifications' })
            }
        })

        return router
    }
}
