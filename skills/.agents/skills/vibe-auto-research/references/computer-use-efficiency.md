# Computer Use Efficiency

Use this reference when Vibe Auto Research needs to inspect or control the actual Windows desktop/app surface.

## Role

Computer Use adds evidence from real Windows app windows. It is not a replacement for repo search, tests, Browser, or direct APIs. Use it when the real visible app surface is the source of truth.

## Best Uses

- Native Windows app inspection or control.
- Desktop-installed app builds.
- Office document, spreadsheet, slide, and export checks.
- App windows that can be captured even when occluded.
- Dialogs, file pickers, canvas apps, and app UI that Browser cannot inspect.
- Visual confirmation of an app state after a script/export/build operation.

## Prefer Other Tools When

- The target is a local web app: use Browser/in-app browser first.
- The task is code or file analysis: use `rg`, direct file reads, tests, and build commands.
- The task is a terminal command: use the shell, not Computer Use.
- The task needs precise DOM, console, or responsive web checks: use Browser.
- The task has an app-native scripting/API route that is safer and deterministic: use that first, then Computer Use only to verify the visible result.

## Efficient Workflow

1. Decide whether the desktop window is actually needed.
2. Identify the target app/window from the returned app/window list.
3. Take one focused window state snapshot.
4. Use screenshot by default for visual app review.
5. Request accessibility text only when it will drive the next action.
6. Batch related clicks/keys/text actions when the target is stable.
7. Verify once with a fresh state snapshot after the batch.
8. Report the app/window checked, action path, visible result, and any blocker.

## Safety Boundaries

Do not use Computer Use to:

- automate Windows terminal apps or command prompts
- automate Codex desktop app UI
- automate password managers
- change Windows security or privacy settings
- bypass security warnings, CAPTCHAs, paywalls, or age gates
- submit forms, upload sensitive files, install software, delete data, or transmit sensitive data without the required confirmation

If confirmation is required, describe the exact action, destination, and data involved before acting.
