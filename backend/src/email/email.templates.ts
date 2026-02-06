/**
 * Email Templates
 * HTML email templates for various notification types
 */

import {
    WelcomeEmailData,
    TaskAssignedEmailData,
    TaskStatusChangedEmailData,
    DailyDigestEmailData,
    DepartmentUpdateEmailData,
    EmailTemplateType,
    EmailTemplateData,
} from './email.types';

// Base email wrapper with styling
const emailWrapper = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAVAGE LLC Internal Portal</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .task-card {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-todo { background-color: #e3f2fd; color: #1976d2; }
    .status-in_progress { background-color: #fff3e0; color: #f57c00; }
    .status-review { background-color: #f3e5f5; color: #7b1fa2; }
    .status-completed { background-color: #e8f5e9; color: #388e3c; }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
`;

// Welcome Email Template
export const welcomeEmailTemplate = (data: WelcomeEmailData): string => {
    const content = `
    <div class="container">
      <div class="header">
        <h1>🎉 Welcome to SAVAGE LLC!</h1>
      </div>
      <div class="content">
        <p>Hi <strong>${data.userName}</strong>,</p>
        <p>Welcome to the SAVAGE LLC Internal Company Portal! We're excited to have you on board.</p>
        <p>Your account has been successfully created with the email: <strong>${data.userEmail}</strong></p>
        <p>You can now access the portal to view your tasks, collaborate with your department, and stay updated on company activities.</p>
        <center>
          <a href="${data.loginUrl}" class="button">Access Portal</a>
        </center>
        <p>If you have any questions or need assistance, please don't hesitate to reach out to your department lead.</p>
        <p>Best regards,<br><strong>SAVAGE LLC Team</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated message from SAVAGE LLC Internal Portal</p>
        <p>&copy; 2026 SAVAGE LLC. All rights reserved.</p>
      </div>
    </div>
  `;
    return emailWrapper(content);
};

// Task Assigned Email Template
export const taskAssignedEmailTemplate = (data: TaskAssignedEmailData): string => {
    const content = `
    <div class="container">
      <div class="header">
        <h1>📋 New Task Assigned</h1>
      </div>
      <div class="content">
        <p>Hi <strong>${data.userName}</strong>,</p>
        <p>You have been assigned a new task by <strong>${data.assignedBy}</strong>.</p>
        <div class="task-card">
          <h3 style="margin-top: 0;">${data.taskTitle}</h3>
          <p>${data.taskDescription}</p>
          <p><strong>Department:</strong> ${data.departmentName}</p>
          ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
        </div>
        <center>
          <a href="${data.taskUrl}" class="button">View Task</a>
        </center>
        <p>Please review the task details and update the status as you make progress.</p>
        <p>Best regards,<br><strong>SAVAGE LLC Team</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated message from SAVAGE LLC Internal Portal</p>
        <p>&copy; 2026 SAVAGE LLC. All rights reserved.</p>
      </div>
    </div>
  `;
    return emailWrapper(content);
};

// Task Status Changed Email Template
export const taskStatusChangedEmailTemplate = (data: TaskStatusChangedEmailData): string => {
    const getStatusClass = (status: string) => {
        return `status-${status.toLowerCase().replace(' ', '_')}`;
    };

    const content = `
    <div class="container">
      <div class="header">
        <h1>🔄 Task Status Updated</h1>
      </div>
      <div class="content">
        <p>Hi <strong>${data.userName}</strong>,</p>
        <p>The status of your task "<strong>${data.taskTitle}</strong>" has been updated by <strong>${data.changedBy}</strong>.</p>
        <div class="task-card">
          <h3 style="margin-top: 0;">${data.taskTitle}</h3>
          <p>
            <span class="status-badge ${getStatusClass(data.oldStatus)}">${data.oldStatus}</span>
            →
            <span class="status-badge ${getStatusClass(data.newStatus)}">${data.newStatus}</span>
          </p>
        </div>
        <center>
          <a href="${data.taskUrl}" class="button">View Task</a>
        </center>
        <p>Best regards,<br><strong>SAVAGE LLC Team</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated message from SAVAGE LLC Internal Portal</p>
        <p>&copy; 2026 SAVAGE LLC. All rights reserved.</p>
      </div>
    </div>
  `;
    return emailWrapper(content);
};

// Daily Digest Email Template
export const dailyDigestEmailTemplate = (data: DailyDigestEmailData): string => {
    const tasksList = data.assignedTasks.length > 0 ? data.assignedTasks.map(task => `
    <div class="task-card">
      <h4 style="margin: 0 0 8px 0;">${task.title}</h4>
      <p style="margin: 4px 0;">
        <span class="status-badge status-${task.status}">${task.status.replace('_', ' ')}</span>
        ${task.dueDate ? `<span style="margin-left: 10px;">📅 Due: ${task.dueDate}</span>` : ''}
      </p>
      <a href="${task.url}" style="color: #667eea; text-decoration: none; font-size: 14px;">View Task →</a>
    </div>
  `).join('') : '<p><em>No pending tasks</em></p>';

    const overdueList = data.overdueTasks.length > 0 ? data.overdueTasks.map(task => `
    <div class="task-card" style="border-left-color: #dc3545;">
      <h4 style="margin: 0 0 8px 0; color: #dc3545;">⚠️ ${task.title}</h4>
      <p style="margin: 4px 0; color: #dc3545;">
        <strong>${task.daysOverdue} day${task.daysOverdue > 1 ? 's' : ''} overdue</strong>
      </p>
      <a href="${task.url}" style="color: #dc3545; text-decoration: none; font-size: 14px;">View Task →</a>
    </div>
  `).join('') : '';

    const content = `
    <div class="container">
      <div class="header">
        <h1>📊 Daily Task Summary</h1>
      </div>
      <div class="content">
        <p>Hi <strong>${data.userName}</strong>,</p>
        <p>Here's your daily task summary for <strong>${data.date}</strong>.</p>
        
        <div class="stats">
          <div class="stat-item">
            <div class="stat-number">${data.totalPending}</div>
            <div class="stat-label">Pending</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${data.completedToday}</div>
            <div class="stat-label">Completed Today</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${data.overdueTasks.length}</div>
            <div class="stat-label">Overdue</div>
          </div>
        </div>

        ${data.overdueTasks.length > 0 ? `
          <h3 style="color: #dc3545;">⚠️ Overdue Tasks</h3>
          ${overdueList}
        ` : ''}

        <h3>Your Assigned Tasks</h3>
        ${tasksList}

        <center>
          <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
        </center>

        <p>Keep up the great work!</p>
        <p>Best regards,<br><strong>SAVAGE LLC Team</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated daily digest from SAVAGE LLC Internal Portal</p>
        <p>You're receiving this because you have active tasks assigned to you.</p>
        <p>&copy; 2026 SAVAGE LLC. All rights reserved.</p>
      </div>
    </div>
  `;
    return emailWrapper(content);
};

// Department Update Email Template
export const departmentUpdateEmailTemplate = (data: DepartmentUpdateEmailData): string => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'new_member': return '👋';
            case 'task_created': return '📋';
            case 'announcement': return '📢';
            default: return '📌';
        }
    };

    const content = `
    <div class="container">
      <div class="header">
        <h1>${getIcon(data.updateType)} Department Update</h1>
      </div>
      <div class="content">
        <p>Hi <strong>${data.userName}</strong>,</p>
        <p>There's a new update in the <strong>${data.departmentName}</strong> department.</p>
        <div class="task-card">
          <p style="font-size: 16px;">${data.updateMessage}</p>
        </div>
        <center>
          <a href="${data.departmentUrl}" class="button">View Department</a>
        </center>
        <p>Best regards,<br><strong>SAVAGE LLC Team</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated message from SAVAGE LLC Internal Portal</p>
        <p>&copy; 2026 SAVAGE LLC. All rights reserved.</p>
      </div>
    </div>
  `;
    return emailWrapper(content);
};

// Template selector function
export const getEmailTemplate = (
    type: EmailTemplateType,
    data: EmailTemplateData
): string => {
    switch (type) {
        case 'welcome':
            return welcomeEmailTemplate(data as WelcomeEmailData);
        case 'task_assigned':
            return taskAssignedEmailTemplate(data as TaskAssignedEmailData);
        case 'task_status_changed':
            return taskStatusChangedEmailTemplate(data as TaskStatusChangedEmailData);
        case 'daily_digest':
            return dailyDigestEmailTemplate(data as DailyDigestEmailData);
        case 'department_update':
            return departmentUpdateEmailTemplate(data as DepartmentUpdateEmailData);
        default:
            throw new Error(`Unknown email template type: ${type}`);
    }
};

// Generate plain text version from HTML
export const htmlToPlainText = (html: string): string => {
    return html
        .replace(/<style[^>]*>.*?<\/style>/gs, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};
