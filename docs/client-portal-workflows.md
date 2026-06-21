# Client Portal Admin And Client Workflows

Last updated: 2026-06-06

This guide explains how to operate the MyDeskii client portal from both sides:

- Admin and internal team side: `/operations/clients` and every `/operations/clients/*` route.
- Client side: `/client` and every `/client/*` route.

The guide is based on the current repository routes, frontend panels, backend client APIs, access helpers, serializers, validation rules, and existing project documentation. It is written as an operator guide, not a product pitch.

## Important Pages At A Glance

Use this table when someone needs to know where to go first without reading the full workflow section.

| Side | Page / Route | Use It For | Key Actions |
|---|---|---|---|
| Admin | Client Operations Overview - `/operations/clients` | Team command center for the selected client. | Check progress, action queue, latest updates, projects, activity, and billing snapshot. |
| Admin | Accounts - `/operations/clients/accounts` | Client setup, access, service tiers, and account administration. | Create clients, edit profile, assign tiers, invite contacts, add approved users, archive or restore clients. |
| Admin | Delivery - `/operations/clients/delivery` | Production work management. | Create projects, publish progress updates, manage work items, track completed work. |
| Admin | Requests - `/operations/clients/requests` | Client ticket handling. | Filter requests, change status, reply to clients, add internal notes, review comment history. |
| Admin | Approvals - `/operations/clients/approvals` | Client sign-off workflow. | Create approvals, update status, read client responses, archive old approval records. |
| Admin | Reports - `/operations/clients/reports` | Monthly reporting and performance summaries. | Generate drafts, publish reports, add metric snapshots, manage visible report content. |
| Admin | Assets - `/operations/clients/assets` | Shared links, resources, and client assets. | Add resources, manage asset records, set visibility, archive old assets. |
| Admin | Billing - `/operations/clients/billing` | Client billing, storage, booking, payment readiness, and invoice records. | Set billing status, storage root, call requests, payment connections, and invoices. |
| Admin | Roadmap - `/operations/clients/roadmap` | Future recommendations and planning board. | Add recommendations, prioritize, update status, archive or restore roadmap items. |
| Admin | Calendar - `/operations/clients/calendar` | Campaign, content, and work schedule. | Add calendar items, edit dates/status/details, archive or delete schedule records. |
| Client | Command Center - `/client` | Main client landing page. | Review progress, actions waiting, updates, activity, resources, and submit a quick request. |
| Client | Work - `/client/work` | Client-visible work progress. | Review projects, open requests, open tasks, and completed work. |
| Client | Requests - `/client/tickets` | Full client request center. | Submit requests, filter requests, edit/delete allowed requests, comment in conversations. |
| Client | Approvals - `/client/approvals` | Client decision queue. | Approve work, request changes, add response notes, open related request conversations. |
| Client | Messages - `/client/messages` | Client-visible conversation history. | Read request conversations and jump back to the request center. |
| Client | Reports - `/client/reports` | Published client reporting. | Review latest reports, metrics, and growth-area summaries. |
| Client | Resources - `/client/resources` | Shared resource library. | Open shared links/assets, share client-owned links, edit/delete owned links. |
| Client | Account - `/client/account` | Client account status, access overview, and call requests. | Review website, service tier, visible billing, active team members, and request a call. |
| Client | Calendar - `/client/calendar` | Client-visible schedule. | Review upcoming items, add client-owned calendar items, edit/delete owned items. |

## 1. Portal Roles And Access

### Admin or internal client operations users

Client Operations access is intended for internal users who manage clients, delivery work, reports, billing state, and communication.

The frontend recognizes these normalized roles for client operations access:

- `admin`
- `administrator`
- `manager`
- `operations_manager`
- `chief_operations_officer`
- `web_developer`
- `website_developer`
- `webdev`

The backend uses the same client-management role set, plus configured admin bypass emails. Frontend hiding is only convenience. The backend remains the source of truth.

Admin-side users can:

- List all client organizations, including archived history.
- Create client organizations.
- Manage service tiers.
- Assign service tiers.
- Invite client contacts.
- Assign existing approved users to client organizations.
- Activate or deactivate client memberships.
- Archive or restore client accounts.
- Create and update projects, updates, work items, approvals, reports, roadmap items, assets, billing status, and admin calendar items.
- See internal notes and internal activity where the serializer allows it.
- Add client-visible ticket replies or internal-only ticket notes.

### Client portal users

Client-side users are scoped to active client organizations through active `ClientMembership` records.

Client portal roles:

- `client_owner`
- `client_admin`
- `client_member`
- `client`

Client users can:

- Open only active organizations where they have an active membership.
- View client-visible projects, updates, metrics, resources, work items, approvals, reports, roadmap items, assets, billing status, calendar items, tickets, and activity.
- Submit client requests.
- Add visible ticket comments.
- Respond to visible approvals with approval or requested changes.
- Share client-owned resource links.
- Edit or delete only the resource links they personally shared.
- Add calendar items visible to the workspace and team.
- Edit or delete only calendar items they personally created.
- Create client-visible manual booking requests from the account page.

Client users cannot:

- Access archived client organizations.
- See internal organization notes.
- See internal ticket comments.
- See assignment fields, internal notes, raw tier IDs, or internal-only report/ticket metadata.
- Set ownership fields such as `organizationId`, `createdById`, or `assignedToId`.
- Create internal comments.
- Update ticket status.
- Create internal production records such as projects, reports, work items, billing state, or roadmap recommendations.
- Manage storage roots, payment connection records, invoice records, or external provider setup.
- Edit completed requests from the client workspace.
- Delete requests that already have comments.

## 2. Core Data Boundaries

### Client organization

Every client workspace is grouped under a `ClientOrganization`.

Important organization fields:

- `name`: Display name for the client account.
- `slug`: URL-safe identifier. If the create form leaves slug blank, the backend slugifies the client name.
- `status`: `active`, `paused`, or `archived`.
- `websiteUrl`: Existing website, target domain, or planned launch URL.
- `websiteWorkType`: `existing_site_improvement` or `new_build`.
- `tierId`: Optional assigned service tier.
- `notes`: Internal-only admin notes.

### Membership

Client users gain access through `ClientMembership`.

Important membership fields:

- `organizationId`: The client organization being granted.
- `userId`: The portal user.
- `role`: `client_owner`, `client_admin`, `client_member`, or `client`.
- `status`: `active` or `inactive`.

Inactive memberships do not provide active client workspace access. Archived client organizations are also hidden from client users.

### Client visibility

Many production records include `visibleToClient`.

If `visibleToClient` is false, client users do not see the record in the client portal. Admin users can still see and manage it from Client Operations.

Client-visible filtering applies to:

- Updates
- Metrics
- Resources
- Work items
- Approvals
- Reports
- Roadmap recommendations
- Assets
- Billing status
- Calendar items
- Activity

Reports and updates have an additional rule: clients only see published client-visible records.

## 3. Admin Navigation Overview

Admin client operations live under:

- `/operations/clients`: Overview and command center.
- `/operations/clients/accounts`: Client setup, users, tiers, account profile, archive/restore.
- `/operations/clients/delivery`: Projects, progress updates, work items, completed work.
- `/operations/clients/requests`: Client tickets, status control, replies, internal notes.
- `/operations/clients/approvals`: Approval records and client decisions.
- `/operations/clients/reports`: Monthly reports and metric snapshots.
- `/operations/clients/assets`: Shared resources and asset records.
- `/operations/clients/billing`: Billing status and service-tier assignment.
- `/operations/clients/roadmap`: Future recommendations and planning board.
- `/operations/clients/calendar`: Campaign/content/work calendar.

The admin client operations shell has:

- A global page header.
- A horizontal top nav for client operations sections.
- A left-side client selector.
- Current clients grouped separately from archived history.
- Query-param preservation for the selected client, for example `/operations/clients/delivery?client=<clientId>`.

If a user does not have client operations access, the admin routes show a "Client operations access required" empty state.

## 4. Admin Workflow: Create A Client Account

Route: `/operations/clients/accounts`

Panel: `Create Client`

Use this flow when a client does not yet exist in the portal.

Steps:

1. Open the main sidebar.
2. Go to `Operations`.
3. Choose `Clients`, then select the `Accounts` section in the client operations top nav.
4. In `Create Client`, enter `Client Name`.
5. Optionally enter `Slug`.
6. Choose `Website Work`.
7. Enter the website URL when available.
8. Optionally assign a service tier.
9. Add internal notes if the team needs account context.
10. Click `Create Client`.

Field behavior:

- `Client Name` is required.
- `Slug` is optional. Blank slug uses a slugified version of the client name.
- `Website Work` can be `Improve existing website` or `Build new website`.
- For `Improve existing website`, the website helper expects the existing website URL.
- For `Build new website`, the URL is optional and can be the current domain, target launch URL, or blank if no domain exists.
- `Service Tier` can be `Not assigned`.
- Notes are internal admin notes.

After saving:

- The new client is created.
- The organization list refreshes.
- The newly created client becomes the selected client.
- The selected client details are loaded.

## 5. Admin Workflow: Select A Client

Applies to every `/operations/clients/*` route.

Steps:

1. Use the `Clients` picker on the left side of Client Operations.
2. Choose a client from the dropdown or click a client card.
3. Current clients appear in the `Current` group.
4. Archived clients appear in `History`.
5. After selection, the URL keeps the selected client through the `client` query parameter.

Why this matters:

- Each operations section works against the selected client.
- If no client is selected, focused routes show empty states such as `Select a client`.
- Preserving `client=<id>` lets admins move between accounts, delivery, requests, reports, assets, billing, roadmap, and calendar without losing context.

## 6. Admin Workflow: Manage Account Profile

Route: `/operations/clients/accounts`

Panel: `Account Profile`

This panel shows the selected client profile.

What it displays:

- Client slug.
- Client name.
- Client account status.
- Website work type.
- Assigned service tier.
- Website link when available.
- Internal notes when available.

Actions:

- Change the assigned service tier from the service-tier dropdown.
- Open the website link in a new tab.

Notes:

- This panel does not edit client name, slug, website URL, website work type, or notes after creation in the current UI.
- The current dev notes list editing existing website profile details as a possible future improvement.

## 7. Admin Workflow: Manage Service Tiers

Route: `/operations/clients/accounts`

Panel: `Service Tiers`

Service tiers define the client service catalog used in account and billing views.

Default SOP-derived tiers:

- Premium Managed Growth System
- Managed Growth Website System
- Conversion and Local Growth System
- Growth Business Website
- Standard Business Website

Create a service tier:

1. Open `/operations/clients/accounts`.
2. Go to `Service Tiers`.
3. Leave the `Tier` dropdown on `New service tier`.
4. Enter `Name`.
5. Optionally enter `Monthly Price`.
6. Optionally enter `Priority Rank`.
7. Optionally enter a description.
8. Click `Add Tier`.

Edit a service tier:

1. Select an existing tier from the `Tier` dropdown or click a tier card.
2. Update name, monthly price, priority rank, or description.
3. Click `Update Tier`.

Start a new tier form:

1. Click `New Tier`.
2. The form resets to a blank tier draft.

Delete a service tier:

1. Select the tier.
2. In the delete confirmation area, type the tier name exactly.
3. Click `Delete Tier`.

Delete behavior:

- Existing clients using the deleted tier are set to not assigned.
- Deleting a service tier does not delete client organizations.

## 8. Admin Workflow: Assign Or Clear A Client Service Tier

Routes:

- `/operations/clients/accounts`
- `/operations/clients/billing`

Use either the Account Profile panel or Billing Status panel.

Assign a tier:

1. Select the client.
2. Open `Accounts` or `Billing`.
3. Choose a tier from `Service Tier`.
4. The app saves the assignment and refreshes client details.

Clear a tier:

1. Select `Not assigned`.
2. The app clears the tier and refreshes the account.

## 9. Admin Workflow: Invite An External Client User

Route: `/operations/clients/accounts`

Panel: `Team And Access`

Section: `Invite external client`

Use this when the client contact does not already have an approved portal account.

Steps:

1. Select the client organization.
2. Open `Accounts`.
3. In `Team And Access`, find `Invite external client`.
4. Enter the client email.
5. Optionally enter the client name.
6. Choose portal role.
7. Choose access status.
8. Click `Invite client`.

Portal role options:

- Owner
- Admin
- Member
- Client

Access status options:

- Active
- Inactive

After invite:

- The backend creates or updates the user as approved and active.
- The backend creates or updates the membership.
- The UI shows delivery information.
- If setup is required, the UI shows a setup link.
- Use `Copy link` to copy the setup link when one is returned.

Important:

- Admins do not receive or expose a plaintext password.
- Setup links are handled through the reset-password/setup-token flow.

## 10. Admin Workflow: Add An Existing Approved User

Route: `/operations/clients/accounts`

Panel: `Team And Access`

Section: `Add existing user to client portal`

Use this when the user already exists and should be attached to a client organization.

Steps:

1. Select the client organization.
2. Open `Accounts`.
3. In the existing-user form, choose the user.
4. Choose the role.
5. Choose the membership status.
6. Click `Add user`.

Notes:

- The existing user list is loaded on the accounts route.
- The backend upserts membership by organization and user, so the same user is not duplicated for the same client.

## 11. Admin Workflow: Change Client Member Role Or Status

Route: `/operations/clients/accounts`

Panel: `Team And Access`

Steps:

1. Find the member card in the member list.
2. Change `Role` or `Status`.
3. Click `Save`.

Deactivate a member:

1. Click `Deactivate`.
2. The membership status changes to inactive.

Reactivate a member:

1. On an inactive member, click `Reactivate`.
2. The membership status changes to active.

Effect:

- Active memberships allow client users to see assigned active organizations.
- Inactive memberships remove client workspace access for that organization.

## 12. Admin Workflow: Archive Or Restore A Client

Route: `/operations/clients/accounts`

Panel: `Remove Client`

Archive a client:

1. Select an active client.
2. Open `Accounts`.
3. Go to `Remove Client`.
4. Read the archive warning.
5. Type the exact client name in the confirmation field.
6. Click `Archive Client`.

Archive behavior:

- The client organization status becomes `archived`.
- Client users cannot open the archived organization.
- Internal teams can still review records, reports, files, billing, and conversation history.
- The account moves into the `History` group in the client selector.

Restore a client:

1. Select the archived client from `History`.
2. Open `Remove Client`.
3. Click `Restore Client Access`.

Restore behavior:

- The client organization status becomes `active`.
- Active client memberships can access the workspace again.

## 13. Admin Workflow: Use The Client Operations Overview

Route: `/operations/clients`

Use the overview as the internal command center before opening a specific work area.

It shows:

- Open work count.
- Open request count.
- Pending approval count.
- Average project progress.
- Action queue.
- Latest activity.
- Latest client-facing update.
- Latest report note when available.
- Projects summary.
- Work area quick links.
- Billing snapshot when billing exists.

Recommended use:

1. Select a client.
2. Review `Action Queue`.
3. Review `Latest Activity`.
4. Use `Work Areas` to jump to the next needed admin route.

Action queue categories:

- Team response needed
- Client response needed
- Approval needed
- Work due soon
- Report ready
- Recently completed

## 14. Admin Workflow: Create And Update Projects

Route: `/operations/clients/delivery`

Panel: `Projects`

Create a project:

1. Select a client.
2. Open `Delivery`.
3. In `Projects`, enter `Project Name`.
4. Choose status.
5. Set progress with the range slider.
6. Add a client-visible summary.
7. Optionally enter `Live URL`.
8. Optionally enter `Preview URL`.
9. Click `Create Project`.

Project statuses:

- Planning
- In Progress
- Review
- Live
- Paused

Update project progress:

1. In `Progress Control`, find the project.
2. Change status or progress.
3. Click `Save`.

Notes:

- Project summaries, progress, live URLs, and preview URLs are client-facing fields.
- Internal notes exist in the backend model, but the current project create form does not expose them.

## 15. Admin Workflow: Publish Client Updates

Route: `/operations/clients/delivery`

Panel: `Published Updates`

Create a progress update:

1. Select a client.
2. Open `Delivery`.
3. In `Published Updates`, enter `Title`.
4. Either click a preset or type a custom body.
5. Optionally attach the update to a project through the project selector.
6. Choose whether `Visible to client` is checked.
7. Click `Publish Update`.

Available update presets:

- Progress made
- Ready for review
- Need client input
- Work completed

Visibility:

- Checked means clients can see the update when it is published.
- Unchecked keeps it internal.

## 16. Admin Workflow: Manage Work Items

Route: `/operations/clients/delivery`

Panel: `Work Items`

Create a work item:

1. Select a client.
2. Open `Delivery`.
3. In `Work Items`, enter `Title`.
4. Add a description.
5. Choose status.
6. Enter progress from 0 to 100.
7. Optionally set due date.
8. Choose visibility.
9. Click `Add Work Item`.

Work item statuses:

- Open
- In Progress
- Review
- Completed
- Blocked
- Archived

Edit a work item:

1. Click the edit control on the item.
2. Change title, description, status, progress, due date, or visibility.
3. Click `Save`.

Quick update a work item:

1. Use the inline status/visibility controls.
2. Save the inline change.

Archive a work item:

1. Click `Archive` from the inline controls.
2. Status changes to `archived`.

Completed work:

- Work items with status `completed` appear in the `Completed Work Log`.
- Completed items also contribute to client-side completed work displays when visible.

## 17. Admin Workflow: Handle Client Requests

Route: `/operations/clients/requests`

Panel: `Requests`

Use this route for client tickets and team responses.

Request list:

- Shows client requests.
- Supports filters.
- Lets admins select a ticket.
- Lets admins update ticket status from the list.
- Shows owner, linked project, SLA state, and next-action labels for quick triage.

Ticket statuses:

- New
- Review
- In Progress
- Done

Filters:

- Search query
- Status
- Priority
- Category

Request categories:

- Website Change
- Content Update
- Results Question
- Access Help
- Billing
- Other Request

Priorities:

- Normal
- High
- Urgent

Update status:

1. Select a client.
2. Open `Requests`.
3. Find the ticket in the list.
4. Change its status.
5. The app refreshes the selected client.

Reply to a client:

1. Select a ticket.
2. Review `Next action`.
3. Choose reply visibility.
4. Use a quick reply or write a custom reply.
5. Click `Send Client Reply`.

Save an internal note:

1. Select a ticket.
2. Choose `Internal note`.
3. Write the note.
4. Click `Save Internal Note`.

Save ticket triage:

1. Select a ticket.
2. In `Triage`, choose service staff or leave it unassigned.
3. Optionally choose a linked project.
4. Optionally update internal notes.
5. Click `Save Triage`.

Triage behavior:

- Assignment and linked project fields are internal workflow fields.
- Linked projects must belong to the selected client organization.
- Internal notes do not appear in the client conversation.
- SLA labels are derived locally from ticket priority and the ticket's latest update time.

Reply visibility options:

- Client-visible reply: the client can see it.
- Internal note: only internal operations users can see it.

Admin quick replies:

- We are reviewing this now and will update this ticket with the next step.
- This is in progress. We will post another update when the change is ready for review.
- This is ready for your review. Please reply here with approval or requested changes.
- Completed. Please confirm everything looks correct on your side.

Next action logic:

- Unassigned non-completed tickets: assign service staff.
- No visible comments: the admin should reply to the client.
- Latest visible comment is from the client: team response is needed.
- Latest visible comment is from the team: waiting on client.
- Ticket status `done`: request is completed.

## 18. Admin Workflow: Manage Approvals

Route: `/operations/clients/approvals`

Panel: `Approvals`

Create an approval:

1. Select a client.
2. Open `Approvals`.
3. Enter title.
4. Enter description.
5. Choose status.
6. Optionally choose due date.
7. Choose visibility.
8. Click `Add Approval`.

Approval statuses:

- Pending
- Approved
- Changes Requested
- Rejected
- Archived

Edit an approval:

1. Click edit on the approval.
2. Change title, description, status, due date, or visibility.
3. Save.

Archive an approval:

1. Click `Archive`.
2. Status changes to `archived`.

Client responses:

- Client users can respond only to visible, non-closed approvals.
- Approving can include an optional response note.
- Requesting changes requires a response note.
- Admins can see the client response note on the approval record.

## 19. Admin Workflow: Publish Reports And Metrics

Route: `/operations/clients/reports`

Panels:

- `Monthly Report`
- `Metric Snapshot`
- `Report Signals`

Publish a monthly report:

1. Select a client.
2. Open `Reports`.
3. Enter report title.
4. Enter client-facing summary.
5. Choose period start.
6. Choose period end.
7. Optionally enter leads captured.
8. Optionally enter missed opportunities.
9. Optionally enter follow-up status.
10. Choose visibility.
11. Click `Publish Report`.

Generate a draft report:

1. Enter period start and period end.
2. Optionally enter title.
3. Choose visibility.
4. Click `Generate Draft`.

Draft behavior:

- The backend builds a draft from existing client operations records.
- Draft reports are editable before publishing.
- Client users only see reports that are both published and visible.

Report statuses:

- Draft
- Published
- Archived

Edit a report:

1. Click edit on a report record.
2. Change title, summary, status, period dates, leads, missed opportunities, follow-up status, or visibility.
3. Save.

Archive a report:

1. Click `Archive`.
2. Status changes to `archived`.

Add a metric snapshot:

1. In `Metric Snapshot`, enter label.
2. Enter value.
3. Optionally enter unit.
4. Choose visibility.
5. Click `Add Metric`.

Report signals:

- Shows latest report leads captured.
- Shows latest report missed opportunities.
- Shows latest report follow-up status.

## 20. Admin Workflow: Manage Shared Resources And Assets

Route: `/operations/clients/assets`

Panels:

- `Shared Resources`
- `Assets`

Add a shared resource:

1. Select a client.
2. Open `Assets`.
3. In `Shared Resources`, enter label.
4. Enter URL.
5. Choose visibility.
6. Click `Add Resource`.

Add an asset:

1. In `Assets`, enter label.
2. Enter URL.
3. Enter type.
4. Choose status.
5. Choose visibility.
6. Click `Add Asset`.

Asset statuses:

- Draft
- Requested
- Received
- Approved
- Archived

Edit an asset:

1. Click edit on the asset.
2. Change label, URL, type, status, notes, or visibility.
3. Save.

Archive an asset:

1. Click `Archive`.
2. Status changes to `archived`.

Important distinction:

- Shared resources are simple links.
- Assets are production asset records with status and notes.
- Client users can also share their own `client_link` resources from the client-side Resources page.

## 21. Admin Workflow: Manage Billing, Storage, Calls, Payments, And Invoices

Route: `/operations/clients/billing`

Panel: `Billing Status`

Save billing status:

1. Select a client.
2. Open `Billing`.
3. Choose service tier or leave not assigned.
4. Choose billing status.
5. Enter monthly amount.
6. Enter currency.
7. Enter renewal date.
8. Add billing notes when internal context is needed.
9. Choose visibility.
10. Click `Save Billing`.

Billing statuses:

- Active
- Trial
- Past Due
- Paused
- Cancelled
- Archived

Visibility:

- Billing status defaults to hidden in the database.
- Check visibility only when billing state should be shown to the client.

Notes:

- Billing notes are saved with billing status and should not include card, bank, or API secret values.
- The backend controls whether billing activity is client-visible based on `visibleToClient`.

Generate a monthly invoice:

1. Confirm billing status is Active, Trial, or Past Due.
2. Confirm monthly amount is greater than zero.
3. Set renewal date or accept the generated due date fallback.
4. Choose visibility.
5. Click `Generate Invoice`.

Manage client storage:

1. Choose storage provider: App Storage, Google Drive, Supabase Storage, or External Link.
2. Choose storage status.
3. Enter a folder name.
4. Add external folder ID or URL when a provider is connected.
5. Click `Save Storage`.

Storage behavior:

- App Storage creates or updates a linked file-directory folder for the selected client.
- Google Drive, Supabase Storage, and External Link fields store provider metadata only until credentials and sync behavior are configured.
- Storage notes are internal.

Create or schedule a call request:

1. Enter the call subject.
2. Choose provider and preferred time.
3. Add timezone, meeting URL, and notes when available.
4. Choose visibility.
5. Click `Add Call Request`.

Call behavior:

- Client-visible call requests appear in the client account page.
- Admins can update call status and meeting URL from the billing page.
- Client-created call requests are always manual, requested, and client-visible.

Manage payment connections:

1. Choose provider: Stripe, Square, Bank Account, or Manual.
2. Set status, mode, and webhook status.
3. Add account label, external customer or merchant ID, masked last four, and notes.
4. Click `Save Connection`.

Payment connection behavior:

- Connection records are readiness records for operations and audit context.
- Do not store API keys, webhooks secrets, card numbers, bank account numbers, or credentials in these fields.
- Live charging, provider sync, and settlement still require configured provider accounts and backend webhook handling.

Create a manual invoice:

1. Choose invoice provider and status.
2. Enter amount and currency.
3. Optionally set invoice number, issue date, due date, hosted invoice URL, and notes.
4. Choose visibility.
5. Click `Create Invoice`.

Invoice behavior:

- Client-visible invoices appear in the client overview payload and can be shown to clients when enabled.
- Manual and generated invoices are durable app records; live Stripe/Square payment collection still depends on provider integration setup.

## 22. Admin Workflow: Manage Roadmap

Route: `/operations/clients/roadmap`

Panel: `Roadmap Board`

Add a recommendation:

1. Select a client.
2. Open `Roadmap`.
3. Click `Add Recommendation`.
4. Enter title.
5. Enter body/details.
6. Choose priority.
7. Choose status.
8. Optionally enter impact.
9. Optionally enter effort.
10. Choose visibility.
11. Click `Add Item`.

Roadmap statuses:

- Recommended
- Next
- Planned
- Done
- Archived

Priorities:

- Low
- Normal
- High
- Urgent

Edit a recommendation:

1. Click `Edit`.
2. Update title, body, priority, status, impact, effort, or visibility.
3. Click `Save Changes`.

Archive a recommendation:

1. Click `Archive`.
2. Status changes to `archived`.

Restore a recommendation:

1. On an archived item, click `Restore`.
2. Status changes back to `recommended`.

Board behavior:

- Full layout groups roadmap records by status.
- Archived items remain in history.
- Client-visible records appear in the client portal when visible.

## 23. Admin Workflow: Manage Client Calendar

Route: `/operations/clients/calendar`

Panel: `Planning Calendar`

Add a calendar item:

1. Select a client.
2. Open `Calendar`.
3. Click a calendar day or click `Add Calendar Item`.
4. Enter title.
5. Optionally enter details.
6. Optionally enter channel.
7. Optionally link a project.
8. Choose status.
9. Choose date.
10. Optionally choose end date.
11. Choose visibility.
12. Click `Add Item`.

Calendar statuses:

- Planned
- Scheduled
- Published
- Cancelled
- Archived

Edit a calendar item:

1. Click the event on the calendar or click edit from the scheduled work list.
2. Update title, details, channel, linked project, status, dates, or visibility.
3. Click `Save Changes`.

Project progress behavior:

- Calendar event labels include linked project progress when a project is selected.
- Scheduled work cards show a compact project progress bar for linked items.
- The Reports route shows a project progress snapshot with average project progress, active project count, and completed work-item count.

Archive a calendar item:

1. Click `Archive`.
2. Status changes to `archived`.

Restore a calendar item:

1. On an archived item, click `Restore`.
2. Status changes to `planned`.

Delete a calendar item:

1. Click `Delete`.
2. Confirm the browser prompt.

Important:

- Delete is permanent for the calendar item.
- Archive preserves history.

## 24. Client Navigation Overview

Client portal routes:

- `/client`: Command center.
- `/client/work`: Website progress, open requests, open work, completed work.
- `/client/tickets`: Full request center.
- `/client/approvals`: Approval queue.
- `/client/messages`: Client-visible request conversations.
- `/client/reports`: Monthly reports and growth snapshots.
- `/client/resources`: Resource library and client-shared links.
- `/client/account`: Account status, service tier, billing when visible, team access.
- `/client/calendar`: Campaign and content schedule.

Client users navigate through the primary sidebar under `Client Portal`.

Client users do not use the admin operations top nav. The client-facing horizontal section nav was removed from client routes, so client portal navigation is driven by the sidebar.

If a client user has more than one assigned organization, client routes show a client organization selector.

Client users land on `/client` after login. Authenticated client users attempting `/dashboard` are redirected back to the client portal.

## 25. Client Workflow: Use The Command Center

Route: `/client`

The command center gives clients a single overview of:

- Average project progress.
- Client actions waiting.
- Open work.
- Report count.
- Latest update.
- Next action.
- Delivery progress.
- Progress updates.
- Communication log.
- Action queue.
- Submit request form.
- Performance snapshot.
- Resources and assets.

Recommended client use:

1. Open `/client`.
2. Review the hero area for delivery progress and next action.
3. Use `Submit Request` for a new request.
4. Use `View Reports` for performance summaries.
5. Review current visible work and latest updates.
6. Review action queue for requests, approvals, or reports that need attention.

Submit a request from the command center:

1. Scroll to `Submit Request`.
2. Choose request type.
3. Choose priority.
4. Select a starter detail or type your own request details.
5. Click `Send Request`.

The app creates a ticket title from the selected category and request detail.

## 26. Client Workflow: Review Work

Route: `/client/work`

This page is read-only for clients.

It shows:

- Website build progress.
- Project status and progress bars.
- Completed work log.
- Open requests.
- Open client-visible work items.

Use this page to answer:

- What is currently being worked on?
- How far along is each visible project?
- What has been completed?
- Which requests are still open?
- What visible tasks are still in progress?

Clients cannot update projects or work items from this page.

## 27. Client Workflow: Submit A New Request

Route: `/client/tickets`

Panel: `New Request`

Steps:

1. Open `Requests` from the client sidebar.
2. Choose `Request Type`.
3. Choose `Priority`.
4. Select a starter detail or write custom request details.
5. Click `Send Request`.

Request types:

- Website Change
- Content Update
- Results Question
- Access Help
- Billing
- Other Request

Priorities:

- Normal
- High
- Urgent

Starter details include examples such as:

- Update hours/contact info.
- Review a page before launch.
- Replace text or photos.
- Explain recent results.
- Login or account help.
- Invoice or payment question.
- Ask the team.

After submit:

- The request appears in the request list.
- The new request becomes selected.
- The team sees the request in admin Client Requests.

## 28. Client Workflow: Filter And Select Requests

Route: `/client/tickets`

Panel: `Requests`

Use filters to narrow the request list.

Available filters:

- Search query.
- Status.
- Priority.
- Category.

Status filter behavior:

- `All` shows every request.
- `Open` shows every request except `done`.
- A specific status shows only that status.

Selecting a request:

1. Click the request card.
2. Its details appear in `Request Detail`.
3. The detail panel shows next action, category, priority, comment count, description, conversation, and reply box.

## 29. Client Workflow: Edit Or Delete A Request

Route: `/client/tickets`

Edit a request:

1. Select a request.
2. If status is not `done`, click `Edit`.
3. Change request type, priority, or details.
4. Click `Save`.

Delete a request:

1. Select a request.
2. If the request has no comments and is not `done`, click `Delete`.
3. Confirm the browser prompt.

Restrictions:

- Completed requests cannot be edited from the client workspace.
- Completed requests cannot be deleted from the client workspace.
- Requests with comments cannot be deleted.
- Clients cannot change status, assignee, internal notes, organization, creator, or comments directly through ticket edit.

## 30. Client Workflow: Comment On A Request

Route: `/client/tickets`

Panel: `Request Detail`

Steps:

1. Select a request.
2. Review the conversation.
3. Choose a quick reply or write a custom comment.
4. Click `Add Comment`.

Client quick replies:

- Approved, please proceed.
- Looks good to me.
- Please make a small change.
- Can we review this on a call?

Next action logic:

- If there is no visible reply yet, the request is waiting on the team.
- If the latest visible message is from the client, the request is waiting on the team.
- If the latest visible message is from the team, the request is waiting on client review.
- If the ticket status is `done`, it is completed.

## 31. Client Workflow: Review Approvals

Route: `/client/approvals`

Panel: `Approval Queue`

This page shows visible approvals and review requests that need client attention.

Respond with approval:

1. Open `Approvals`.
2. Find the approval.
3. Optionally enter a response note.
4. Click `Approve`.

Request changes:

1. Open `Approvals`.
2. Find the approval.
3. Enter a response note explaining the needed changes.
4. Click `Request Changes`.

Important:

- Response note is optional for approval.
- Response note is required when requesting changes.
- Clients can respond only to visible approvals that are not already closed.
- Closed statuses include approved, changes requested, rejected, and archived.

If an item is a ticket-style review request, use `Open Conversation` to continue in the request center.

## 32. Client Workflow: Use Messages

Route: `/client/messages`

This page is a read-only conversation history built from client-visible request conversations.

It shows:

- Initial request messages.
- Client-visible replies.
- Author label.
- Request title.
- Request status.
- Message date.
- Link to open the request.
- Message activity timeline.

Use this page when:

- The client wants to review all conversations without opening each request one by one.
- The client wants to jump back to the request center from a message.

Clients reply from `/client/tickets`, not from this page.

## 33. Client Workflow: Review Reports

Route: `/client/reports`

This page is read-only for clients.

It shows:

- Monthly report dashboard.
- Latest report note.
- Growth areas.
- Lead source breakdown when provided.
- Reputation snapshot when provided.
- Local visibility snapshot when provided.

Client-visible report rules:

- Clients only see reports that are published and visible.
- If no report metrics exist, the page shows an empty report metrics state.
- If no structured growth-area data exists, the page shows placeholder growth-area rows for leads, lead source breakdown, reputation, and local visibility.

Use this page to answer:

- What did the latest report say?
- How many leads or missed opportunities were reported?
- What follow-up status is currently documented?
- What local visibility or reputation signals were shared?

## 34. Client Workflow: Use Resources

Route: `/client/resources`

Panels:

- `Share Resource`
- `Resource Library`

Share a resource:

1. Open `Resources`.
2. Enter title.
3. Enter link.
4. Click `Share Resource`.

Client-shared resource behavior:

- The resource is created as `client_link`.
- It is visible to the client workspace and operations team.
- The creating client user can edit or delete it.

Edit your own resource:

1. Find the resource card.
2. If it is your `client_link`, click `Edit`.
3. Change title or link.
4. Click `Save`.

Delete your own resource:

1. Find the resource card.
2. If it is your `client_link`, click `Delete`.
3. Confirm the browser prompt.

Resource library:

- Admin-added resources appear as links.
- Admin-added assets appear with status.
- Client-added links appear as manageable only for the creating user.
- Client users cannot edit or delete admin-added resources or assets.

## 35. Client Workflow: Review Account

Route: `/client/account`

This page is read-only for clients.

It shows:

- Client name.
- Client status.
- Website link when available.
- Service tier name and description.
- Billing status when visible.
- Monthly amount and renewal date when visible.
- Active team access.
- Member names/emails and client roles.

Use this page to answer:

- Which client account am I viewing?
- What service tier is assigned?
- Is billing information visible?
- Who has active portal access?
- What role does each client user have?

If no active team users appear, ask the account manager to add the right users.

## 36. Client Workflow: Use The Calendar

Route: `/client/calendar`

Panel: `Campaign Calendar`

The calendar lets clients view team-scheduled items and add their own planned items.

Add a calendar item:

1. Open `Calendar`.
2. Click `Add Item` or click a calendar date.
3. Enter title.
4. Add details.
5. Enter channel.
6. Choose date.
7. Optionally choose end date.
8. Click `Add Item`.

Edit a calendar item:

1. Select a calendar item.
2. If you created it, click `Edit`.
3. Change title, details, channel, date, or end date.
4. Click `Save Changes`.

Delete a calendar item:

1. Select a calendar item.
2. If you created it, click `Delete`.
3. Confirm the browser prompt.

Restrictions:

- Clients can add calendar items for their assigned active organization.
- Client-added items are saved as visible to the workspace and team.
- Clients can edit or delete only items they created.
- Admin-created calendar records are visible when client-visible but are not client-editable.
- Client-side calendar create/update uses `planned` status.

## 37. Client Multi-Organization Behavior

If a client user has access to multiple active client organizations:

- Client routes show a client organization selector.
- Changing the selector changes the loaded workspace.
- Requests, reports, approvals, calendar, resources, and account data all refresh for the selected organization.

If a client user has no active assigned organizations:

- Client routes show `No client workspace assigned`.
- The user should contact the account manager or admin to be added to a client organization.

## 38. Practical Admin Operating Sequence

Use this sequence for a new client from setup through ongoing work:

1. Create or verify service tiers.
2. Create the client organization.
3. Assign website work type and website URL during creation.
4. Assign the service tier.
5. Invite the external client owner or add an existing approved user.
6. Create the first project under Delivery.
7. Publish an initial progress update.
8. Add visible work items.
9. Add resources or assets the client needs.
10. Add billing status if billing should be tracked.
11. Add roadmap recommendations.
12. Add calendar items for launch, content, or campaigns.
13. Monitor requests and reply with either client-visible replies or internal notes.
14. Create approvals for decisions that need client sign-off.
15. Generate or publish monthly reports.
16. Archive the client only when client-facing access should be removed while retaining history.

## 39. Practical Client Operating Sequence

Use this sequence for a client user:

1. Log in and land on `/client`.
2. Review progress, next action, updates, and action queue.
3. Open `Work` to review visible progress and completed work.
4. Open `Requests` to submit new requests or reply to team messages.
5. Open `Approvals` to approve or request changes.
6. Open `Messages` for a conversation history overview.
7. Open `Reports` for monthly performance and growth notes.
8. Open `Resources` to open shared links/assets or share client-side resources.
9. Open `Account` to check tier, billing visibility, and active team users.
10. Open `Calendar` to review schedule or add client-owned calendar items.

## 40. Troubleshooting And Expected Empty States

Admin side:

- `Client operations access required`: the user does not have an admin/client-operations role.
- `No client accounts yet`: create the first client from Accounts.
- `Select a client`: choose a client from the client picker.
- `No requests yet`: no client tickets exist for the selected client.
- `No projects yet`: create a project in Delivery.
- `No completed work yet`: no visible work item is completed.
- `No monthly report yet`: publish or draft a report.
- `No calendar items yet`: add a calendar item.

Client side:

- `No client workspace assigned`: the account has no active client membership on an active organization.
- `No active projects yet`: no visible projects exist.
- `No updates published yet`: no visible published updates exist.
- `No requests yet`: the client has not submitted a request or no visible tickets exist.
- `No approvals waiting`: no visible pending approval exists.
- `No client-visible messages yet`: no ticket conversation is visible.
- `No report metrics published yet`: no published visible report or metric exists.
- `No resources shared yet`: no visible resources or assets exist.
- `No scheduled campaign items`: no visible calendar records exist.

Common runtime issue:

- If Socket.IO requests show a 404 while the frontend is otherwise usable, check whether the backend is running from this checkout. A different process may be using port `4000`.

## 41. Source-Of-Truth Files For Future Changes

Frontend route ownership:

- Admin routes: `frontend/src/app/operations/clients/*`
- Client routes: `frontend/src/app/client/*`
- Admin shell: `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- Client frame: `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- Client portal API helpers and types: `frontend/src/lib/client-portal.ts`
- Client role access: `frontend/src/lib/role-access.ts`
- Admin nav config: `frontend/src/lib/client-operations-navigation.ts`
- Client nav config: `frontend/src/lib/client-portal-navigation.ts`
- Status and option labels: `frontend/src/lib/client-portal-options.ts`
- Request next-action logic: `frontend/src/lib/client-communication.ts`
- Command-center derivations: `frontend/src/lib/client-portal-command.ts`
- Summary derivations: `frontend/src/lib/client-portal-summary.ts`

Backend route ownership:

- Client API controller: `backend/src/clients/clients.controller.ts`
- Client service/business logic: `backend/src/clients/clients.service.ts`
- Client access helper: `backend/src/clients/clients.access.ts`
- Client serializers: `backend/src/clients/clients.serializers.ts`
- Client validation: `backend/src/clients/clients.validation.ts`
- Report draft builder: `backend/src/clients/clients.report-builder.ts`
- Service tier presets: `backend/src/clients/client-service-tier-presets.ts`

Database ownership:

- Prisma schema: `backend/prisma/schema.prisma`
- Client portal foundation migration: `backend/prisma/migrations/202605240001_client_portal_foundation/migration.sql`
- Production record migration: `backend/prisma/migrations/202605270001_client_portal_production_records/migration.sql`
- Client activity migration: `backend/prisma/migrations/202605270002_client_activity/migration.sql`
- Client resource ownership migration: `backend/prisma/migrations/202605270003_client_resource_ownership/migration.sql`
- Website work type migration: `backend/prisma/migrations/202606050001_client_website_work_type/migration.sql`

## 42. Verification Commands

For documentation-only updates:

```powershell
git diff --check -- docs/client-portal-workflows.md docs/features.md docs/dev-notes.md
```

For future code or behavior changes touching the client portal:

```powershell
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix backend test
npm --prefix backend run build
```

For schema or Prisma-related client portal changes:

```powershell
cd backend
npx prisma validate
npx prisma generate
```

For broad rendered route coverage when a frontend server is available:

```powershell
$env:VISUAL_SMOKE_ROUTES='/client,/client/work,/client/tickets,/client/approvals,/client/messages,/client/reports,/client/resources,/client/account,/client/calendar,/operations/clients,/operations/clients/accounts,/operations/clients/delivery,/operations/clients/requests,/operations/clients/approvals,/operations/clients/reports,/operations/clients/assets,/operations/clients/billing,/operations/clients/roadmap,/operations/clients/calendar'
npm --prefix frontend run test:visual
```
