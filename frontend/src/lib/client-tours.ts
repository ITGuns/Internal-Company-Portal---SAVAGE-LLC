import type { TourDefinition, TourStep } from './tour';

// Get-started guides for the client portal, one per page.
//
// Written for someone who has just finished an intake form for a website build
// and has never used this product. Plain language, no feature-speak, and no
// promises about numbers - a brand-new client's portal is almost entirely empty,
// so copy is phrased as "this is where X appears" rather than "here are your X".
//
// Anchors are PANEL SHELLS ([data-tour-panel="<title>"]) rather than rows or
// cards. Panel shells render even with no data; rows do not exist until there is
// data, and a step pointing at nothing is worse than no step at all. Steps whose
// selector matches nothing are skipped at runtime.

const panel = (title: string) => `[data-tour-panel="${title}"]`;

export const CLIENT_TOURS: Record<string, TourDefinition> = {
  '/client': {
    key: 'client.overview',
    steps: [
      {
        title: 'Welcome to your portal',
        body: "This is where you'll follow your website being built. It's quiet right now — that's normal on day one. Let me show you the four things worth knowing.",
      },
      {
        selector: panel('Your website build'),
        title: 'Your build, step by step',
        body: "Your website moves through nine stages, from research to live. Whichever one is glowing is what we're working on today. A preview link appears here as soon as there's something to look at.",
      },
      {
        selector: '#submit-request',
        title: 'Ask us for anything',
        body: 'Need a change, a fix, or an answer? Say it here and it goes straight to your team. You can watch the reply come back without digging through email.',
      },
      {
        selector: panel('Action Queue'),
        title: "What's waiting on you",
        body: "Anything that needs your yes or your answer collects here. When it's empty, there's genuinely nothing for you to do — that's a good sign, not a broken page.",
      },
      {
        selector: panel('Delivery Progress'),
        title: 'The work itself',
        body: 'Each piece of your project shows up here with its own progress bar as we start it. Updates from your team appear just below.',
      },
    ],
  },

  '/client/work': {
    key: 'client.work',
    steps: [
      {
        selector: panel('Website Build Progress'),
        title: 'Where your build stands',
        body: 'The running score on your website: what stage each piece is at, and a bar filling toward finished. The percentage is the average across everything we are building for you.',
      },
      {
        selector: panel('Open Tasks'),
        title: "What we're on right now",
        body: 'The specific jobs your team has open today, and when they are due. This is the honest answer to "what are they actually doing this week".',
      },
      {
        selector: panel('Completed Work Log'),
        title: 'What is already done',
        body: 'Finished work moves down here with the date it was completed, so you always have a record of what you have received.',
      },
    ],
  },

  '/client/tickets': {
    key: 'client.tickets',
    steps: [
      {
        selector: panel('New Request'),
        title: 'This is how you ask',
        body: 'Anything you need after the intake — a change, a fix, a question about your results — starts here. Pick what it is about, say it in your own words, and send.',
      },
      {
        selector: panel('Requests'),
        title: 'Follow the conversation',
        body: 'Every request you send lands in this list with our replies underneath, so the whole back-and-forth stays in one place instead of scattered across email.',
      },
    ],
  },

  '/client/approvals': {
    key: 'client.approvals',
    steps: [
      {
        selector: panel('Approvals'),
        title: 'Nothing ships without you',
        body: 'When we build something that needs your sign-off — a page design, wording, a layout — it waits for you here. You can approve it or ask for changes.',
      },
    ],
  },

  '/client/messages': {
    key: 'client.messages',
    steps: [
      {
        selector: panel('Conversation History'),
        title: 'Your written record',
        body: 'Every message between you and your team, newest first. This page is for reading back through what was said; to write something new, use Requests.',
      },
    ],
  },

  '/client/reports': {
    key: 'client.reports',
    steps: [
      {
        selector: panel('Monthly Report Dashboard'),
        title: 'Your results, monthly',
        body: 'Once your site is live we publish your numbers here each month — how many people got in touch and where they came from. It stays empty until your first report.',
      },
      {
        selector: panel('Growth Areas'),
        title: 'What we track for you',
        body: 'These are the things we will be measuring. Seeing them listed before there is data is normal — it tells you what to expect.',
      },
    ],
  },

  '/client/resources': {
    key: 'client.resources',
    steps: [
      {
        selector: panel('Resource Library'),
        title: 'The shared drop box',
        body: 'Everything passed between you and us lives here — your logo and photos going out, previews and files coming back.',
      },
      {
        selector: '#client-resource-title',
        title: 'Send us your files',
        body: 'Give it a short name, paste the link — a Google Drive or Dropbox folder is fine — and share. This is the fastest way to get us your logo and photos.',
      },
    ],
  },

  '/client/account': {
    key: 'client.account',
    steps: [
      {
        selector: panel('Account Status'),
        title: 'Your account',
        body: 'Your business details and the plan you are on. If the plan says "pending", your account manager is still finishing setup — it fills in shortly.',
      },
      {
        selector: '#client-call-subject',
        title: 'Prefer to talk?',
        body: 'Ask for a call here. Put a short subject and a time that suits you, and your team comes back to confirm.',
      },
      {
        selector: panel('Team Access'),
        title: 'Who else can log in',
        body: 'Everyone from your side with access to this portal. To add or remove someone, ask your account manager.',
      },
    ],
  },

  '/client/calendar': {
    key: 'client.calendar',
    steps: [
      {
        selector: panel('Campaign Calendar'),
        title: 'Your dates',
        body: 'Every date booked for your work — build milestones, content going out, review days. Click any day to add something of your own, like a launch you are planning or a week you are away.',
      },
    ],
  },
};

/** The tour for a route, or null where there isn't one. */
export function tourForPath(pathname: string): TourDefinition | null {
  return CLIENT_TOURS[pathname] ?? null;
}

/**
 * The get-started checklist on the command centre.
 *
 * Deliberately actions, not features: each one is something a new client can go
 * and do today, in the order that gets their build moving fastest.
 */
export interface ChecklistItem {
  key: string;
  label: string;
  hint: string;
  href: string;
}

export const CLIENT_CHECKLIST: ChecklistItem[] = [
  {
    key: 'send-assets',
    label: 'Send us your logo and photos',
    hint: 'The single thing that speeds your build up most.',
    href: '/client/resources',
  },
  {
    key: 'see-progress',
    label: 'See where your build is',
    hint: 'Nine stages from research to live.',
    href: '/client',
  },
  {
    key: 'first-request',
    label: 'Ask us your first question',
    hint: 'Anything at all — this is the channel we watch.',
    href: '/client/tickets',
  },
  {
    key: 'meet-team',
    label: 'Check who can log in',
    hint: 'Add a colleague by asking your account manager.',
    href: '/client/account',
  },
];

export const CHECKLIST_TOUR_KEY = 'client.checklist';

export type { TourStep };
