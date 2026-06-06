# MyDeskii Admin And Client Workflows

This guide explains how the internal team and clients should use MyDeskii together. It is written for team adoption: use it as the operating playbook for client onboarding, delivery, requests, approvals, reports, assets, billing, roadmap planning, and client portal communication.

## Workflow Principles

- Create the client company first, then add client people under that company.
- Keep internal production work inside Admin Client Operations.
- Show clients only what is ready for them by using client-visible records.
- Do not use chat or scattered messages as the system of record. Requests, approvals, reports, resources, and calendar items should live in the portal.
- Archive instead of deleting client accounts or records when the history should stay available to the internal team.
- Access is role and membership controlled. Frontend visibility is helpful, but backend authorization is the source of truth.

## Access Model

### Internal Admin And Operations Access

Internal users manage clients from:

- `/operations`
- `/operations/onboarding`
- `/operations/clients`
- `/operations/clients/accounts`
- `/operations/clients/delivery`
- `/operations/clients/requests`
- `/operations/clients/approvals`
- `/operations/clients/reports`
- `/operations/clients/assets`
- `/operations/clients/billing`
- `/operations/clients/roadmap`
- `/operations/clients/calendar`

Client operations access is available to full-access, management, and website-delivery roles, including owners/founders, admins, project managers, operations managers, frontend developers, and backend/technical developers.

### Client Portal Access

Client users enter from:

- `/client`
- `/client/work`
- `/client/tickets`
- `/client/approvals`
- `/client/messages`
- `/client/reports`
- `/client/resources`
- `/client/account`
- `/client/calendar`

Client users only see active client organizations where they have an active membership. They do not see other clients, archived client accounts, internal notes, internal-only activity, hidden records, raw service-tier internals, or internal assignment fields.

### Client Membership Roles

Use these roles in `Team And Access`:

- `Owner`: primary client stakeholder or business owner.
- `Admin`: client-side manager who can coordinate details for the client.
- `Member`: normal client team member.
- `Client`: limited client contact.

Use `Active` to grant portal access. Use `Inactive` to keep the contact on record without letting them use the portal.

## Full Admin Workflow

### 1. Prepare Internal Operations

Use this before onboarding clients or employees.

1. Go to `/operations`.
2. Open `Departments`.
3. Confirm the org chart departments exist.
4. If needed, click `Sync Org Chart`.
5. Open `Roles`.
6. Confirm role options exist for the departments.
7. Open `Members`.
8. Add or remove internal role assignments for employees as needed.
9. Go to `/operations/onboarding` for new internal users.
10. Enter the user's email and role.
11. Generate the setup link.
12. Send the setup link to the internal user.

Expected result:

- Internal users have correct system roles.
- Admins can manage operations.
- Website and operations roles can work inside Client Operations.
- Finance roles can access payroll management where allowed.

### 2. Create A Client Account

Use this when a new company/client starts.

1. Go to `/operations/clients/accounts`.
2. In `Create Client`, enter the client company name.
3. Add a slug if needed. If left blank, the system can derive one.
4. Choose `Website Work`:
   - `Improve existing website` for clients with a current site.
   - `Build new website` for new builds.
5. Add the website URL when available.
6. Select the service tier.
7. Add internal notes if needed.
8. Click `Create Client`.

Expected result:

- A `ClientOrganization` exists.
- The client can now be selected across all Client Operations pages.
- Internal teams can start adding delivery records, requests, reports, assets, billing, roadmap, and calendar items.

### 3. Assign Or Manage Service Tiers

Use service tiers to keep client level, billing tier, and priority consistent.

1. Go to `/operations/clients/accounts`.
2. Select the client.
3. Use `Account Profile` to assign or clear the selected client's tier.
4. Use `Service Tiers` to create, update, or delete tier presets.
5. If deleting a tier, confirm that it should be removed from any assigned clients.

Expected result:

- Client tier is visible in admin account context.
- Client billing and account surfaces use the assigned tier label.
- Deleted tiers are removed without deleting client accounts.

### 4. Add Client Contacts And Send Portal Onboarding

Use this after creating the client company.

1. Go to `/operations/clients/accounts`.
2. Select the client.
3. Open `Team And Access`.
4. Use `Invite external client` for a new client login.
5. Enter the client's email.
6. Enter their name if available.
7. Choose portal role: Owner, Admin, Member, or Client.
8. Set status to `Active`.
9. Click `Invite client`.

What the system does:

- Creates or updates the user.
- Approves the user for login.
- Grants the global `client` app role.
- Creates or updates the client membership.
- Creates a password setup token if the user does not already have a password.
- Sends the setup email if email is configured.
- Shows a copyable setup link if email sending is not configured or fails.

Expected result:

- Client contact can set a password from the setup link.
- Client lands in the client portal after login.
- Client can only access the assigned active client workspace.

### 5. Add Existing Users To A Client

Use this when the user already exists in MyDeskii.

1. Go to `/operations/clients/accounts`.
2. Select the client.
3. Open `Team And Access`.
4. In `Existing user`, select the user.
5. Choose their client membership role.
6. Choose `Active` or `Inactive`.
7. Click `Add user`.

Expected result:

- Existing user receives access to that client workspace.
- No setup link is required if the user already has login access.

### 6. Pause, Archive, Or Restore Client Access

Use account status for lifecycle control.

1. Go to `/operations/clients/accounts`.
2. Select the client.
3. Use `Remove Client`.
4. Type the client name to confirm archive.
5. Click `Archive Client`.
6. To restore, use the restore action when the account is archived.

Expected result:

- Archived clients are removed from client-facing access.
- Admins and web developers can still review operational history.
- Records are preserved for reporting, audit, and future reactivation.

## Admin Client Operations Workflow

### Overview: Command Picture

Route: `/operations/clients`

Use this as the daily command center.

Admins should check:

- Action Queue
- Latest Activity
- Latest Client-Facing Updates
- Projects
- Work Areas
- Billing Snapshot

Daily usage:

1. Select a client.
2. Review action queue items.
3. Open the relevant work area.
4. Complete or update the record.
5. Confirm client visibility before publishing or exposing anything.

Action queue categories:

- `Team response needed`: internal team should reply.
- `Client response needed`: client needs to reply.
- `Approval needed`: client decision is pending.
- `Work due soon`: delivery item has a due date approaching.
- `Report ready`: draft or report work needs attention.
- `Recently completed`: recent completed work should be reviewed or communicated.

### Delivery Workflow

Route: `/operations/clients/delivery`

Use Delivery for website progress, project status, work items, and client updates.

Admin steps:

1. Select a client.
2. Create or update projects.
3. Add work items with title, description, status, progress, due date, and client visibility.
4. Move work item statuses through:
   - Open
   - In Progress
   - Review
   - Completed
   - Blocked
   - Archived
5. Add client updates when the client needs a progress note.
6. Mark updates client-visible only when they are ready for the client.

Team rule:

- Use work items for actual delivery tracking.
- Use client updates for communication.
- Do not expose unfinished internal notes as client-visible updates.

Client result:

- Client sees visible work progress on `/client/work`.
- Client sees client-visible updates in the command center and activity.

### Requests Workflow

Admin route: `/operations/clients/requests`
Client route: `/client/tickets`

Use Requests for client questions, change requests, access help, billing questions, and general requests.

Client request categories:

- Website Change
- Content Update
- Results Question
- Access Help
- Billing
- Other Request

Client priority options:

- Normal
- High
- Urgent

Admin steps:

1. Open `/operations/clients/requests`.
2. Select the client.
3. Review new and open tickets.
4. Add a client-visible reply when the client should see the response.
5. Add an internal note when the note should stay hidden.
6. Update request status:
   - New
   - Review
   - In Progress
   - Done
7. If the client needs to confirm the fix, reply with a client-visible review request before marking final completion.

Client steps:

1. Open `/client/tickets`.
2. Submit a request.
3. Choose category and priority.
4. Add details.
5. Watch status and replies.
6. Reply when the team needs clarification or approval.

Team rule:

- All request decisions and clarifications should stay attached to the ticket.
- Internal notes must stay internal.
- Client-visible replies should be written as client-ready communication.

### Approvals Workflow

Admin route: `/operations/clients/approvals`
Client route: `/client/approvals`

Use Approvals for decisions that need client confirmation.

Approval statuses:

- Pending
- Approved
- Changes Requested
- Rejected
- Archived

Admin steps:

1. Create an approval item when the client must decide.
2. Include a clear title and what the client is approving.
3. Set a due date when useful.
4. Keep `visibleToClient` enabled only when the approval is ready.
5. Monitor pending approvals.
6. If the client approves, proceed with the work.
7. If the client requests changes, update the related work item or ticket.
8. Archive approval records when they are no longer needed in the active queue.

Client steps:

1. Open `/client/approvals`.
2. Review pending approval.
3. Choose approve or request changes.
4. If requesting changes, add a short response note.

Team rule:

- Use approvals for decisions, not general discussion.
- Use tickets/messages for back-and-forth context.
- Keep approval titles specific enough that a client can make a decision without guessing.

### Reports Workflow

Admin route: `/operations/clients/reports`
Client route: `/client/reports`

Use Reports for monthly performance, leads, reputation, local visibility, and follow-up status.

Report statuses:

- Draft
- Published
- Archived

Admin steps:

1. Open `/operations/clients/reports`.
2. Select the client.
3. Use `Generate Draft` when existing operational records can produce a starting report.
4. Review the draft.
5. Edit title, summary, period, metrics, and notes.
6. Confirm the report is client-ready.
7. Set status to `Published`.
8. Keep `visibleToClient` enabled only when the client should see it.
9. Archive old reports when they should leave the active list but remain in history.

Client result:

- Client only sees published and client-visible reports.
- Internal draft reports and hidden reports stay admin-only.

Team rule:

- Never publish a report until it has been reviewed for client wording and accuracy.
- Use drafts as a starting point, not as final output.

### Assets And Resources Workflow

Admin route: `/operations/clients/assets`
Client route: `/client/resources`

Use Assets for client files, requested assets, received materials, and shared links.

Asset statuses:

- Draft
- Requested
- Received
- Approved
- Archived

Admin steps:

1. Add resources or assets for the selected client.
2. Mark whether the record is visible to the client.
3. Use `Requested` when waiting for the client to provide an asset.
4. Use `Received` when the client has sent it.
5. Use `Approved` when the material is ready for production use.
6. Archive outdated records.

Client result:

- Client sees shared resources and client-visible assets.
- Client does not see internal-only links or hidden asset records.

Team rule:

- Use client-visible resources for links the client may need.
- Use internal-only resources for production references, private notes, and admin-only links.

### Billing Workflow

Admin route: `/operations/clients/billing`
Client route: `/client/account`

Use Billing for service tier, payment status, renewal details, monthly amount, and account status.

Billing statuses:

- Active
- Trial
- Past Due
- Paused
- Cancelled
- Archived

Admin steps:

1. Confirm the service tier in `/operations/clients/accounts`.
2. Open `/operations/clients/billing`.
3. Set billing status.
4. Add monthly amount, currency, renewal date, and notes where applicable.
5. Decide whether billing details should be client-visible.

Client result:

- Client sees account status and visible billing summary in `/client/account`.
- Internal billing notes stay admin-only when hidden.

Team rule:

- Keep payment-sensitive operational notes internal unless intentionally client-facing.
- Use account status and billing status separately: account status controls access; billing status explains commercial state.

### Roadmap Workflow

Admin route: `/operations/clients/roadmap`

Use Roadmap for recommendations, future work, impact, and effort.

Roadmap statuses:

- Recommended
- Next
- Planned
- Done
- Archived

Admin steps:

1. Add a recommendation with title and body.
2. Choose impact and effort.
3. Set status.
4. Decide whether it should be client-visible.
5. Move items from Recommended to Next to Planned as the client or team commits.
6. Move completed items to Done.
7. Archive stale or rejected recommendations.

Client result:

- Client sees visible roadmap recommendations and future work context.
- Hidden recommendations stay internal.

Team rule:

- Use Roadmap for strategic direction, not daily tasks.
- Use Delivery work items for committed execution.

### Calendar Workflow

Admin route: `/operations/clients/calendar`
Client route: `/client/calendar`

Use Calendar for campaign, content, client-facing work, schedule visibility, and client-owned calendar items.

Calendar statuses:

- Planned
- Scheduled
- Published
- Cancelled
- Archived

Admin steps:

1. Open `/operations/clients/calendar`.
2. Select the client.
3. Click a date or add an item.
4. Add title, description, channel, start/end dates, status, and visibility.
5. Use `Planned` before scheduling is confirmed.
6. Use `Scheduled` when the date is confirmed.
7. Use `Published` when the item has gone live.
8. Archive old items that should leave active planning.

Client steps:

1. Open `/client/calendar`.
2. Review visible campaign/content items.
3. Add client-owned calendar items when they need to tell the team about an important date.
4. Edit or delete their own client-created items when needed.

Team rule:

- Admin calendar items can be shown or hidden from clients.
- Client-created calendar items are visible to the workspace and the internal team.
- Use calendar for timing; use tickets for discussion.

## Client Portal Workflow

### Client Command Center

Route: `/client`

This is the client landing page after login.

Client should use it to:

- Check latest progress.
- See next actions.
- Open approvals.
- Open requests.
- Review reports.
- See visible activity.

Team should keep it useful by:

- Publishing client-visible updates.
- Keeping request statuses current.
- Creating clear approval items.
- Publishing reports only when ready.
- Keeping calendar and resources current.

### Client Work

Route: `/client/work`

Client uses this to see visible projects, open work, and completed work.

Client expectation:

- Work status should be understandable without internal context.
- Completed work should clearly show what changed.
- Open work should show enough progress to reduce follow-up messages.

Admin source:

- Projects and work items managed in `/operations/clients/delivery`.

### Client Requests

Route: `/client/tickets`

Client uses this to submit and track requests.

Client steps:

1. Open Requests.
2. Create a request.
3. Pick category and priority.
4. Add clear details.
5. Submit.
6. Reply in the same request when the team asks questions.

Admin source:

- Tickets managed in `/operations/clients/requests`.

### Client Approvals

Route: `/client/approvals`

Client uses this for decisions.

Client steps:

1. Review the pending item.
2. Approve if ready.
3. Request changes if not ready.
4. Add a change note when changes are requested.

Admin source:

- Approval records managed in `/operations/clients/approvals`.

### Client Messages

Route: `/client/messages`

Client uses this to review client-visible conversations from requests and team replies.

Client expectation:

- Messages are tied to requests and updates.
- Internal notes are not shown.
- The conversation history should explain what happened and what is next.

Admin source:

- Client-visible replies and updates from Client Operations.

### Client Reports

Route: `/client/reports`

Client uses this for published performance reports.

Client expectation:

- Reports are published, client-visible, and reviewed.
- Draft and internal reports are not shown.

Admin source:

- Reports managed in `/operations/clients/reports`.

### Client Resources

Route: `/client/resources`

Client uses this for shared links, resources, reports, and materials.

Client expectation:

- Visible resources are safe to share.
- Internal links do not appear.

Admin source:

- Assets and resource links managed in `/operations/clients/assets`.

### Client Account

Route: `/client/account`

Client uses this to check:

- Account status.
- Service tier.
- Team access.
- Billing summary when visible.

Admin source:

- Account profile, memberships, service tier, and billing controls in `/operations/clients/accounts` and `/operations/clients/billing`.

### Client Calendar

Route: `/client/calendar`

Client uses this to review schedule items and add client-owned calendar notes.

Client expectation:

- Campaign/content dates are visible when marked client-visible.
- Client-created events are shared with the internal team.

Admin source:

- Calendar records managed in `/operations/clients/calendar`.

## Recommended Team Operating Cadence

### Daily Admin Routine

1. Open `/operations/clients`.
2. Review action queue.
3. Reply to requests that need team response.
4. Check approvals waiting for client decisions.
5. Update delivery work items that changed today.
6. Publish only client-ready updates.
7. Review upcoming calendar items.

### Weekly Admin Routine

1. Review each active client's account status.
2. Confirm service tier and billing status are correct.
3. Review open requests.
4. Review delivery progress and blocked work.
5. Create or update roadmap recommendations.
6. Prepare report drafts when enough data exists.
7. Make sure client-visible resources are current.

### Monthly Admin Routine

1. Generate or prepare monthly reports.
2. Review reports internally.
3. Publish reports when client-ready.
4. Review service tier fit.
5. Archive stale roadmap, assets, calendar, and report records.
6. Confirm client team membership is still correct.

## Recommended Client Onboarding Script

Use this when sending a new client their portal setup link.

```text
Hi [Client Name],

We created your MyDeskii client portal account for [Client Company].

Please use this setup link to create your password:
[Setup Link]

Once logged in, you can review project progress, submit requests, approve items, check reports, and see shared resources from one place.

Your main portal link after setup is:
[Portal URL]/client
```

## Recommended Client Usage Instructions

Send this after the client has logged in.

```text
Use MyDeskii as the main place for project communication.

- Use Requests for website changes, content updates, billing questions, access help, or general questions.
- Use Approvals when the team asks you to approve or request changes on an item.
- Use Reports to review monthly results.
- Use Resources for shared files and links.
- Use Calendar for campaign or content schedule items.
- Use Account to check service tier, team access, and visible billing status.
```

## Decision Rules

### When To Use Requests

Use Requests when the client asks a question, reports a problem, requests a change, or needs help.

### When To Use Approvals

Use Approvals when the client must make a clear decision before work proceeds.

### When To Use Updates

Use Updates when the team wants to communicate progress without requiring a decision.

### When To Use Work Items

Use Work Items for internal delivery tracking that may also be client-visible.

### When To Use Roadmap

Use Roadmap for future recommendations and strategic next steps.

### When To Use Calendar

Use Calendar for scheduled work, campaign dates, content dates, and client-provided timing notes.

### When To Use Reports

Use Reports for reviewed performance summaries, not casual updates.

## Visibility Rules

- `visibleToClient = true`: client can see the record if their membership allows it.
- `visibleToClient = false`: internal team only.
- Internal ticket comments stay hidden from clients.
- Client-visible ticket replies appear in the client conversation.
- Draft reports should stay hidden until reviewed.
- Archived client organizations remove client-facing access but preserve internal history.
- Inactive memberships remove user access without deleting the membership record.

## Common Mistakes To Avoid

- Do not invite client users before creating the client company.
- Do not use an internal user role as a client membership role.
- Do not mark internal notes as client-visible.
- Do not publish reports before review.
- Do not use approvals for general discussion.
- Do not delete or archive active client records without confirming the client context.
- Do not rely on the client portal to show hidden/internal records.
- Do not put sensitive billing or payroll details in client-visible notes.

## Implementation Source Of Truth

Current route and workflow sources:

- Admin client operations navigation: `frontend/src/lib/client-operations-navigation.ts`
- Client portal navigation: `frontend/src/lib/client-portal-navigation.ts`
- Client accounts page: `frontend/src/app/operations/clients/accounts/page.tsx`
- Client operations workspace loader: `frontend/src/hooks/useClientOperationsWorkspace.ts`
- Client invite/member panel: `frontend/src/components/client-portal/AdminClientMembersPanel.tsx`
- Client workflow options: `frontend/src/lib/client-portal-options.ts`
- Client activity/action queue helpers: `frontend/src/lib/client-activity.ts`
- Client API notes: `docs/api.md`
- Feature behavior notes: `docs/features.md`
