import { existsSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.VISUAL_SMOKE_BASE_URL || "http://localhost:3000";
const now = new Date().toISOString();

const defaultRoutes = [
  "/",
  "/client",
  "/client/work",
  "/client/tickets",
  "/client/approvals",
  "/client/messages",
  "/client/reports",
  "/client/resources",
  "/client/account",
  "/client/calendar",
  "/operations/clients",
  "/operations/clients/accounts",
  "/operations/clients/delivery",
  "/operations/clients/requests",
  "/operations/clients/approvals",
  "/operations/clients/reports",
  "/operations/clients/assets",
  "/operations/clients/billing",
  "/operations/clients/roadmap",
  "/operations/clients/calendar",
  "/dashboard",
  "/task-tracking",
  "/task-calendar",
  "/daily-logs",
  "/payroll-calendar",
  "/payroll-dashboard",
  "/my-payslips",
  "/announcements",
  "/chat",
  "/company-chat",
  "/private-messages",
  "/file-directory",
  "/operations",
  "/profile",
  "/whiteboard",
  "/discord",
  "/not-a-real-route",
];

const routes = (process.env.VISUAL_SMOKE_ROUTES || "")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const routesToCheck = routes.length > 0 ? routes : defaultRoutes;
const enableInteractionAudit = process.env.VISUAL_SMOKE_INTERACTIONS === "1";
const maxInteractionsPerRoute = Number(process.env.VISUAL_SMOKE_MAX_INTERACTIONS || "0");
const interactionOffset = Number(process.env.VISUAL_SMOKE_INTERACTION_OFFSET || "0");
const interactionTimeoutMs = Number(process.env.VISUAL_SMOKE_INTERACTION_TIMEOUT_MS || "1000");
const interactionWaitMs = Number(process.env.VISUAL_SMOKE_INTERACTION_WAIT_MS || "500");
const routeControlsOnly = process.env.VISUAL_SMOKE_ROUTE_CONTROLS_ONLY === "1";
const requestedThemes = (process.env.VISUAL_SMOKE_THEMES || "dark,light")
  .split(",")
  .map((theme) => theme.trim())
  .filter((theme) => theme === "dark" || theme === "light");
const themes = requestedThemes.length > 0 ? requestedThemes : ["dark", "light"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const smokePersona = (process.env.VISUAL_SMOKE_USER_ROLE || "admin").trim().toLowerCase();

const clientNavigationLeakLabels = new Set([
  "Dashboard",
  "Task Tracking",
  "Task Calendar",
  "Daily Logs",
  "Payroll Calendar",
  "Payroll Dashboard",
  "My Payslips",
  "Announcements",
  "Messages & Chat",
  "Company Chat",
  "Private Messages",
  "File Directory",
  "Operations",
  "Client Operations",
  "Operations Client Requests",
  "Whiteboard",
]);

function findClientNavigationLeaks(labels) {
  if (smokePersona !== "client") return [];
  return labels.filter((label) => clientNavigationLeakLabels.has(label));
}

const adminUser = {
  id: "admin-1",
  email: "admin@example.test",
  name: "Demo Admin",
  role: "admin",
  roles: ["admin"],
  department: "Operations",
  isApproved: true,
  status: "active",
};

const clientUser = {
  id: "client-1",
  email: "owner@example.test",
  name: "Client Owner",
  role: "client",
  roles: ["client_owner"],
  department: "Client",
  isApproved: true,
  status: "active",
};

const employeeUser = {
  id: "employee-1",
  email: "employee@example.test",
  name: "Demo Employee",
  role: "web_developer",
  roles: ["web_developer"],
  department: "Website Developers",
  isApproved: true,
  status: "active",
};

const user = smokePersona === "anonymous"
  ? null
  : smokePersona === "client"
    ? clientUser
    : smokePersona === "employee"
      ? employeeUser
      : adminUser;

const users = [
  adminUser,
  employeeUser,
  clientUser,
];

const departments = [
  { id: "dept-ops", name: "Operations", driveId: "drive-ops", _count: { tasks: 2, roles: 3 } },
  { id: "dept-web", name: "Website Developers", driveId: "drive-web", _count: { tasks: 4, roles: 2 } },
];

const roles = [
  { id: "role-admin", name: "admin", department: departments[0] },
  { id: "role-web", name: "Web Developer", department: departments[1] },
];

const tasks = [
  {
    id: "task-1",
    title: "Client portal mobile QA",
    description: "Review client portal routes at mobile and desktop sizes.",
    status: "in_progress",
    priority: "High",
    departmentId: "dept-web",
    department: departments[1],
    assigneeId: "employee-1",
    assignee: users[1],
    dueDate: "2026-06-03T00:00:00.000Z",
    startDate: "2026-05-30T00:00:00.000Z",
    progress: 72,
    timerStatus: "paused",
    totalElapsed: 5400,
    estimatedTime: 180,
    notes: [{ text: "Smoke pass added.", date: now }],
    createdAt: now,
    updatedAt: now,
    workSessions: [],
  },
  {
    id: "task-2",
    title: "Prepare report draft",
    description: "Collect updates for the client report.",
    status: "review",
    priority: "Med",
    departmentId: "dept-ops",
    department: departments[0],
    assigneeId: "admin-1",
    assignee: adminUser,
    dueDate: "2026-06-05T00:00:00.000Z",
    progress: 86,
    timerStatus: "stopped",
    totalElapsed: 4200,
    estimatedTime: 120,
    notes: [],
    createdAt: now,
    updatedAt: now,
    workSessions: [],
  },
];

const announcements = [
  {
    id: "announcement-1",
    title: "Client portal polish shipped",
    body: "The client and admin portals received touch target and overflow improvements.",
    category: "news",
    timestamp: now,
    createdAt: now,
    author: adminUser,
    likes: [],
    comments: [],
  },
];

const dailyLogs = [
  {
    id: "log-1",
    authorId: "employee-1",
    author: users[1],
    department: "Website Developers",
    date: "2026-05-30T12:00:00.000Z",
    createdAt: now,
    status: "completed",
    hoursLogged: 7.5,
    tasks: [{ id: "task-1", text: "Checked responsive UI controls", completed: true }],
    shiftNotes: "Finished the focused route smoke pass.",
    likes: [],
    logType: "daily",
  },
];

const conversations = [
  {
    id: "conv-1",
    type: "channel",
    name: "General",
    updatedAt: now,
    unreadCount: 0,
    participants: users.map((item) => ({ userId: item.id, user: item })),
  },
];

const messages = [
  {
    id: "message-1",
    conversationId: "conv-1",
    senderId: "admin-1",
    content: "Route smoke checks are running against the local build.",
    createdAt: now,
    sender: adminUser,
  },
];

const folders = [
  {
    id: "folder-1",
    name: "Client Reports",
    department: "Operations",
    driveLink: "",
    parentId: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "folder-2",
    name: "Website Assets",
    department: "Website Developers",
    driveLink: "",
    parentId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const clientOrganization = {
  id: "org-1",
  name: "GemField Roofing",
  slug: "gemfield-roofing",
  status: "active",
  websiteUrl: "https://example.test",
  counts: { memberships: 2, projects: 1, tickets: 2, updates: 1 },
  tierId: "tier-1",
  tier: { id: "tier-1", name: "Growth", description: "Lead generation support" },
};

const clientServiceTiers = [
  {
    id: "tier-1",
    name: "Growth",
    description: "Lead generation support",
    monthlyPrice: 1750,
    priorityRank: 20,
    createdAt: now,
    updatedAt: now,
  },
];

const clientTickets = [
  {
    id: "ticket-1",
    organizationId: "org-1",
    projectId: "project-1",
    title: "Website Update: Replace service area copy",
    description: "Please update the service area copy before launch.",
    category: "website",
    priority: "normal",
    status: "in_review",
    createdById: "client-1",
    createdAt: now,
    updatedAt: now,
    comments: [
      {
        id: "comment-1",
        ticketId: "ticket-1",
        authorId: "admin-1",
        author: adminUser,
        body: "We posted the draft update for your review.",
        visibility: "client",
        createdAt: now,
      },
    ],
  },
  {
    id: "ticket-2",
    organizationId: "org-1",
    title: "Report: Add call tracking note",
    description: "Add a short note about missed calls to the next report.",
    category: "report",
    priority: "high",
    status: "open",
    createdById: "client-1",
    createdAt: now,
    updatedAt: now,
    comments: [],
  },
];

const clientOverview = {
  organization: clientOrganization,
  projects: [
    {
      id: "project-1",
      organizationId: "org-1",
      name: "Local SEO website launch",
      status: "active",
      summary: "Homepage, service pages, reporting, and launch QA.",
      progress: 68,
      updatedAt: now,
    },
  ],
  memberships: [
    {
      id: "membership-1",
      organizationId: "org-1",
      userId: "client-1",
      role: "client_owner",
      status: "active",
      user: clientUser,
    },
  ],
  tickets: clientTickets,
  updates: [
    {
      id: "update-1",
      organizationId: "org-1",
      projectId: "project-1",
      title: "Launch QA is underway",
      body: "The team is checking copy, forms, analytics, and mobile layout before launch.",
      status: "published",
      visibleToClient: true,
      createdAt: now,
    },
  ],
  metrics: [
    {
      id: "metric-1",
      organizationId: "org-1",
      label: "Leads captured",
      value: "42",
      unit: "this month",
      source: "manual",
      visibleToClient: true,
      createdAt: now,
    },
  ],
  resources: [
    {
      id: "resource-1",
      organizationId: "org-1",
      projectId: "project-1",
      label: "Preview site",
      url: "https://preview.example.test",
      type: "link",
      visibleToClient: true,
    },
  ],
  workItems: [
    {
      id: "work-1",
      organizationId: "org-1",
      projectId: "project-1",
      title: "Mobile QA pass",
      status: "in_progress",
      priority: "high",
      progress: 72,
      visibleToClient: true,
      updatedAt: now,
    },
  ],
  approvals: [
    {
      id: "approval-1",
      organizationId: "org-1",
      projectId: "project-1",
      title: "Approve homepage copy",
      description: "Final copy needs approval.",
      status: "pending",
      visibleToClient: true,
      dueAt: now,
      updatedAt: now,
    },
  ],
  reports: [
    {
      id: "report-1",
      organizationId: "org-1",
      title: "May performance report",
      summary: "Lead flow improved.",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-30",
      status: "published",
      visibleToClient: true,
      publishedAt: now,
      updatedAt: now,
    },
  ],
  roadmapRecommendations: [
    {
      id: "roadmap-1",
      organizationId: "org-1",
      title: "Add review capture flow",
      body: "Improve review requests after completed jobs.",
      priority: "high",
      status: "planned",
      visibleToClient: true,
      sortOrder: 1,
    },
  ],
  assets: [
    {
      id: "asset-1",
      organizationId: "org-1",
      label: "Brand photos",
      url: "https://example.test/photos",
      type: "folder",
      status: "ready",
      visibleToClient: true,
    },
  ],
  billingStatus: {
    id: "billing-1",
    organizationId: "org-1",
    planName: "Growth Care",
    status: "active",
    monthlyAmount: 1200,
    currency: "USD",
    renewalAt: "2026-06-30",
    visibleToClient: true,
  },
  calendarItems: [
    {
      id: "calendar-1",
      organizationId: "org-1",
      projectId: "project-1",
      title: "Launch QA review",
      description: "Final QA review.",
      channel: "meeting",
      status: "scheduled",
      startAt: "2026-06-03T09:00:00.000Z",
      endAt: "2026-06-03T10:00:00.000Z",
      visibleToClient: true,
    },
  ],
};

const clientActivities = [
  {
    id: "activity-1",
    organizationId: "org-1",
    actorId: "admin-1",
    actor: adminUser,
    type: "ticket_comment_created",
    subjectType: "ticket",
    subjectId: "ticket-1",
    visibility: "client",
    title: "Team replied to a request",
    body: "Draft update posted for review.",
    createdAt: now,
  },
];

const clientQueue = [
  {
    id: "queue-1",
    organizationId: "org-1",
    organizationName: "GemField Roofing",
    category: "client_response_needed",
    title: "Homepage copy approval",
    summary: "Client needs to confirm the final copy direction.",
    subjectType: "approval",
    subjectId: "approval-1",
    priority: "high",
    dueAt: "2026-06-03T00:00:00.000Z",
    href: "/operations/clients/approvals?client=org-1",
    visibility: "client",
  },
];

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function payrollTimeEntry(overrides = {}) {
  return {
    id: overrides.id || "time-entry-audit",
    userId: overrides.userId || user?.id || "admin-1",
    start: overrides.start || now,
    end: overrides.end,
    duration: overrides.duration,
    notes: overrides.notes || "Visual smoke audit entry",
  };
}

function findChromeExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

async function installMocks(page, theme) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === "/backend-auth/me") {
      if (!user) {
        await route.fulfill(jsonResponse({ error: "Not authenticated" }, 401));
        return;
      }
      await route.fulfill(jsonResponse({ user }));
      return;
    }

    if (path === "/backend-auth/refresh") {
      await route.fulfill(jsonResponse({
        accessToken: "visual-smoke-token",
        refreshToken: "visual-smoke-refresh-token",
      }));
      return;
    }

    if (path === "/backend-auth/login") {
      await route.fulfill(jsonResponse({ error: "Invalid demo credentials" }, 401));
      return;
    }

    if (path === "/backend-auth/signup") {
      await route.fulfill(jsonResponse({ success: true, message: "Signup request submitted for audit." }, 201));
      return;
    }

    if (path === "/backend-auth/forgot-password") {
      await route.fulfill(jsonResponse({ success: true, message: "Password reset email queued for audit." }));
      return;
    }

    if (path === "/backend-auth/reset-password") {
      await route.fulfill(jsonResponse({ success: true, message: "Password reset completed for audit." }));
      return;
    }

    if (!path.startsWith("/api/")) {
      await route.continue();
      return;
    }

    if (path === "/api/users" || path.startsWith("/api/users?")) {
      await route.fulfill(jsonResponse(users));
      return;
    }
    if (path === "/api/departments") {
      await route.fulfill(jsonResponse(departments));
      return;
    }
    if (path === "/api/roles") {
      await route.fulfill(jsonResponse(roles));
      return;
    }
    if (path.startsWith("/api/tasks")) {
      await route.fulfill(jsonResponse(tasks));
      return;
    }
    if (path.startsWith("/api/announcements")) {
      await route.fulfill(jsonResponse(announcements));
      return;
    }
    if (path.startsWith("/api/daily-logs")) {
      await route.fulfill(jsonResponse(dailyLogs));
      return;
    }
    if (path === "/api/employees/pending") {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (path === "/api/employees/deployed") {
      await route.fulfill(jsonResponse(users));
      return;
    }
    if (path.startsWith("/api/payroll/time-entries")) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (path === "/api/payroll/clock-in") {
      await route.fulfill(jsonResponse(payrollTimeEntry({ id: "clock-in-audit" }), 201));
      return;
    }
    if (path === "/api/payroll/clock-out") {
      await route.fulfill(jsonResponse(payrollTimeEntry({ id: "clock-in-audit", end: now, duration: 1 })));
      return;
    }
    if (path === "/api/payroll/entry") {
      await route.fulfill(jsonResponse(payrollTimeEntry({ id: "manual-entry-audit", end: now, duration: 480 }), 201));
      return;
    }
    if (path.startsWith("/api/payroll/entry/")) {
      await route.fulfill(jsonResponse(payrollTimeEntry({ id: path.split("/").pop() || "manual-entry-audit", end: now, duration: 480 })));
      return;
    }
    if (path.startsWith("/api/payroll/events")) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (path.startsWith("/api/payroll/my-payslips")) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (path.startsWith("/api/payroll/payslips/all")) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (path.startsWith("/api/payroll/reports")) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (path === "/api/chat") {
      await route.fulfill(jsonResponse(conversations));
      return;
    }
    if (path === "/api/chat/online") {
      await route.fulfill(jsonResponse({ onlineUserIds: ["admin-1", "employee-1"] }));
      return;
    }
    if (path.startsWith("/api/chat/search")) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (path.includes("/messages")) {
      await route.fulfill(jsonResponse(messages));
      return;
    }
    if (path.startsWith("/api/file-directory")) {
      await route.fulfill(jsonResponse(path.endsWith("/children") ? [] : folders));
      return;
    }
    if (path === "/api/clients/organizations") {
      await route.fulfill(jsonResponse([clientOrganization]));
      return;
    }
    if (path === "/api/clients/service-tiers") {
      await route.fulfill(jsonResponse(clientServiceTiers));
      return;
    }
    if (path === "/api/clients/tickets") {
      await route.fulfill(jsonResponse(clientTickets));
      return;
    }
    if (path === "/api/clients/activity/queue") {
      await route.fulfill(jsonResponse(clientQueue));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/overview")) {
      await route.fulfill(jsonResponse(clientOverview));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/memberships")) {
      await route.fulfill(jsonResponse(clientOverview.memberships));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/activity")) {
      await route.fulfill(jsonResponse(clientActivities));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/projects")) {
      await route.fulfill(jsonResponse(clientOverview.projects));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/tickets")) {
      await route.fulfill(jsonResponse(clientTickets));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/updates")) {
      await route.fulfill(jsonResponse(clientOverview.updates));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/metrics")) {
      await route.fulfill(jsonResponse(clientOverview.metrics));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/resources")) {
      await route.fulfill(jsonResponse(clientOverview.resources));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/work-items")) {
      await route.fulfill(jsonResponse(clientOverview.workItems));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/approvals")) {
      await route.fulfill(jsonResponse(clientOverview.approvals));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/reports")) {
      await route.fulfill(jsonResponse(clientOverview.reports));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/roadmap")) {
      await route.fulfill(jsonResponse(clientOverview.roadmapRecommendations));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/assets")) {
      await route.fulfill(jsonResponse(clientOverview.assets));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/billing-status")) {
      await route.fulfill(jsonResponse(clientOverview.billingStatus));
      return;
    }
    if (path.startsWith("/api/clients/organizations/") && path.endsWith("/calendar-items")) {
      await route.fulfill(jsonResponse(clientOverview.calendarItems));
      return;
    }

    await route.fulfill(jsonResponse([]));
  });

  await page.addInitScript(({ currentUser, themeName }) => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      localStorage.setItem("accessToken", "visual-smoke-token");
      localStorage.setItem("refreshToken", "visual-smoke-refresh-token");
    } else {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    localStorage.setItem("theme", themeName);
    const applyTheme = () => {
      const root = document.documentElement;
      if (!root) return;
      root.setAttribute("data-theme", themeName);
      root.classList.toggle("dark", themeName === "dark");
    };
    applyTheme();
    window.addEventListener("DOMContentLoaded", applyTheme, { once: true });
  }, { currentUser: user, themeName: theme });
}

const interactiveSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([type='hidden']):not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[role='button']:not([aria-disabled='true'])",
  "[role='tab']:not([aria-disabled='true'])",
].join(",");

const skippedInteractionPatterns = [
  /attach/i,
  /download/i,
  /print/i,
  /upload/i,
  /preview site/i,
  /discord/i,
];

function isSkippedInteraction(control) {
  if (control.tag === "input" && control.type === "file") return "file input";
  if (control.href && /^https?:\/\//i.test(control.href) && !control.href.startsWith(baseUrl)) return "external link";
  const label = control.label || "";
  const matchedPattern = skippedInteractionPatterns.find((pattern) => pattern.test(label));
  return matchedPattern ? `skipped action: ${matchedPattern.source}` : "";
}

function valueForInputType(type) {
  switch (type) {
    case "email":
      return "audit@example.test";
    case "password":
      return "AuditPass123";
    case "number":
    case "range":
      return "1";
    case "date":
      return "2026-06-02";
    case "time":
      return "09:00";
    case "datetime-local":
      return "2026-06-02T09:00";
    case "tel":
      return "555-0100";
    case "url":
      return "https://example.test";
    default:
      return "Audit check";
  }
}

async function getVisibleControls(page) {
  return page.evaluate(({ selector, routeOnly }) => {
    const viewportWidth = window.innerWidth;
    const textOf = (element) => (
      element.textContent
      || element.getAttribute("aria-label")
      || element.getAttribute("placeholder")
      || element.getAttribute("name")
      || element.getAttribute("id")
      || ""
    ).replace(/\s+/g, " ").trim();
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.left < viewportWidth
        && style.visibility !== "hidden"
        && style.display !== "none"
        && style.pointerEvents !== "none";
    };

    const controls = Array.from(document.querySelectorAll(selector))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const inPersistentShell = Boolean(element.closest("#primary-sidebar, header"));
        return {
          element,
          tag: element.tagName.toLowerCase(),
          type: (element.getAttribute("type") || "").toLowerCase(),
          role: element.getAttribute("role") || "",
          label: textOf(element).slice(0, 120),
          ariaLabel: element.getAttribute("aria-label") || "",
          href: element.getAttribute("href") || "",
          disabled: Boolean(element.disabled) || element.getAttribute("aria-disabled") === "true",
          inPersistentShell,
          visible: isVisible(element),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((control) => control.visible && !control.disabled && (!routeOnly || !control.inPersistentShell));
    controls.forEach((control, auditIndex) => {
      control.element.setAttribute("data-visual-smoke-control", String(auditIndex));
      control.auditIndex = auditIndex;
      delete control.element;
    });
    return controls;
  }, { selector: interactiveSelector, routeOnly: routeControlsOnly });
}

async function auditInteractions(page, routePath, theme, viewport) {
  if (!enableInteractionAudit) {
    return { enabled: false, total: 0, tested: 0, skipped: [], issues: [] };
  }

  const initialControls = await getVisibleControls(page);
  const interactionLimit = maxInteractionsPerRoute > 0 ? maxInteractionsPerRoute : initialControls.length;
  const controlsToAudit = initialControls.slice(interactionOffset, interactionOffset + interactionLimit);
  const skipped = [];
  const issues = [];
  let tested = 0;

  page.on("dialog", async (dialog) => {
    await dialog.dismiss().catch(() => {});
  });

  for (const control of controlsToAudit) {
    const skipReason = isSkippedInteraction(control);
    if (skipReason) {
      skipped.push({ routePath, viewport: viewport.name, theme, label: control.label, tag: control.tag, reason: skipReason });
      continue;
    }

    try {
      await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(interactionWaitMs);
      const currentControls = await getVisibleControls(page);
      const currentControl = currentControls[control.auditIndex];
      if (!currentControl) {
        skipped.push({ routePath, viewport: viewport.name, theme, label: control.label, tag: control.tag, reason: "control disappeared after reload" });
        continue;
      }
      const locator = page.locator(`[data-visual-smoke-control="${currentControl.auditIndex}"]`);

      const actionableControl = currentControl || control;

      if (actionableControl.tag === "input") {
        if (actionableControl.type === "checkbox" || actionableControl.type === "radio") {
          await locator.click({ timeout: interactionTimeoutMs, force: true });
        } else if (actionableControl.type === "range") {
          await locator.evaluate((element) => {
            const input = element;
            input.value = input.max || "50";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
        } else {
          await locator.fill(valueForInputType(actionableControl.type), { timeout: interactionTimeoutMs });
        }
      } else if (actionableControl.tag === "textarea") {
        await locator.fill("Audit check details", { timeout: interactionTimeoutMs });
      } else if (actionableControl.tag === "select") {
        const options = await locator.locator("option").evaluateAll((items) => items.map((option) => option.value).filter(Boolean));
        if (options.length > 0) {
          await locator.selectOption(options[Math.min(1, options.length - 1)], { timeout: interactionTimeoutMs });
        } else {
          skipped.push({ routePath, viewport: viewport.name, theme, label: control.label, tag: control.tag, reason: "select has no options" });
          continue;
        }
      } else {
        await locator.click({ timeout: interactionTimeoutMs, force: true });
      }

      tested += 1;
      await page.waitForTimeout(interactionWaitMs);
      const health = await page.evaluate(() => ({
        currentPath: location.pathname,
        loginPath: location.pathname.includes("/login"),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      if (!routePath.startsWith("/login") && !routePath.startsWith("/signup") && !routePath.startsWith("/forgot-password") && !routePath.startsWith("/reset-password") && health.loginPath) {
        issues.push({ routePath, viewport: viewport.name, theme, label: control.label, tag: control.tag, issue: "interaction redirected to login", currentPath: health.currentPath });
      }
      if (health.overflowX > 3) {
        issues.push({ routePath, viewport: viewport.name, theme, label: control.label, tag: control.tag, issue: "interaction caused horizontal overflow", overflowX: health.overflowX });
      }
    } catch (error) {
      issues.push({
        routePath,
        viewport: viewport.name,
        theme,
        label: control.label,
        tag: control.tag,
        type: control.type,
        issue: error instanceof Error ? error.message.split("\n")[0] : String(error),
      });
    }
  }

  return {
    enabled: true,
    total: initialControls.length,
    audited: controlsToAudit.length,
    tested,
    skipped,
    issues,
  };
}

async function inspectRoute(browser, routePath, viewport, theme) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
  });

  await installMocks(page, theme);

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}${routePath}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ fullPage: false });

  let commandLabels = [];
  if (smokePersona === "client" && viewport.name === "desktop") {
    await page.keyboard.press("Control+K");
    await page.waitForTimeout(150);
    commandLabels = await page.locator("[data-command-item]").evaluateAll((items) => items
      .map((item) => item.querySelector(".text-sm")?.textContent?.trim() || item.textContent?.trim() || "")
      .filter(Boolean));
    await page.keyboard.press("Escape");
  }

  const metrics = await page.evaluate((expectedRoutePath) => {
    const root = document.documentElement;
    const viewportHeight = window.innerHeight;
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && rect.top < viewportHeight
        && rect.bottom > 0
        && style.visibility !== "hidden"
        && style.display !== "none";
    };
    const textOf = (element) => (
      element.textContent
      || element.getAttribute("aria-label")
      || element.getAttribute("placeholder")
      || ""
    ).replace(/\s+/g, " ").trim();
    const textList = (selector) => Array.from(document.querySelectorAll(selector))
      .filter(isVisible)
      .map(textOf)
      .filter(Boolean);

    const controlSelector = [
      "button",
      "input:not([type='hidden']):not([type='checkbox']):not([type='radio'])",
      "select",
      "textarea",
      "label:has(input[type='checkbox'])",
      "[role='button']",
    ].join(",");

    const smallControls = Array.from(document.querySelectorAll(controlSelector))
      .filter(isVisible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: textOf(element).slice(0, 90),
          height: Math.round(rect.height),
          width: Math.round(rect.width),
        };
      })
      .filter((control) => control.height < 38 || control.width < 28);

    return {
      currentPath: location.pathname,
      h1: document.querySelector("h1")?.textContent?.trim() || null,
      theme: root.getAttribute("data-theme"),
      hasLoginRedirect: !expectedRoutePath.startsWith("/login") && location.pathname.includes("/login"),
      overflowX: root.scrollWidth - root.clientWidth,
      smallControls,
      sidebarLabels: textList("#primary-sidebar a"),
      bodySample: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 220),
    };
  }, routePath);
  metrics.commandLabels = commandLabels;
  metrics.clientNavigationLeaks = [
    ...new Set([
      ...findClientNavigationLeaks(metrics.sidebarLabels),
      ...findClientNavigationLeaks(commandLabels),
    ]),
  ];
  metrics.clientLandingRedirectMiss = smokePersona === "client"
    && ["/", "/dashboard"].includes(routePath)
    && metrics.currentPath !== "/client";
  metrics.interactions = await auditInteractions(page, routePath, theme, viewport);

  await page.close();
  return { routePath, theme, viewport: viewport.name, metrics, pageErrors };
}

async function main() {
  const launchOptions = { headless: true };
  const chromeExecutable = findChromeExecutable();
  if (chromeExecutable) {
    launchOptions.executablePath = chromeExecutable;
  }

  const browser = await chromium.launch(launchOptions);
  const results = [];

  try {
    for (const routePath of routesToCheck) {
      for (const theme of themes) {
        for (const viewport of viewports) {
          results.push(await inspectRoute(browser, routePath, viewport, theme));
        }
      }
    }
  } finally {
    await browser.close();
  }

  const failures = results.filter((result) => (
    result.metrics.hasLoginRedirect
    || result.metrics.overflowX > 3
    || result.metrics.smallControls.length > 0
    || result.metrics.clientNavigationLeaks.length > 0
    || result.metrics.clientLandingRedirectMiss
    || result.metrics.interactions.issues.length > 0
    || result.pageErrors.length > 0
  ));

  const summary = results.map((result) => ({
    routePath: result.routePath,
    currentPath: result.metrics.currentPath,
    theme: result.theme,
    viewport: result.viewport,
    h1: result.metrics.h1,
    appliedTheme: result.metrics.theme,
    overflowX: result.metrics.overflowX,
    smallControls: result.metrics.smallControls.length,
    clientNavigationLeaks: result.metrics.clientNavigationLeaks,
    clientLandingRedirectMiss: result.metrics.clientLandingRedirectMiss,
    interactions: result.metrics.interactions.enabled ? {
      total: result.metrics.interactions.total,
      audited: result.metrics.interactions.audited,
      tested: result.metrics.interactions.tested,
      skipped: result.metrics.interactions.skipped.length,
      skippedSample: result.metrics.interactions.skipped.slice(0, 5),
      issues: result.metrics.interactions.issues.length,
    } : undefined,
    pageErrors: result.pageErrors.length,
  }));

  console.log(JSON.stringify({ ok: failures.length === 0, failures, summary }, null, 2));
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
