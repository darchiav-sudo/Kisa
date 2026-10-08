import type { Launch } from '@/src/models/types';

const OFFER_POST = `🍂 NORTHEAST PHILLY — FRONT YARD LEAF RESET — $49

I'm offering a simple 30-minute leaf cleanup for small front yards, sidewalks and driveways.

✅ Blow/rake dry leaves
✅ Bag them
✅ Clean up sidewalk/driveway
✅ No contract
✅ Flat $49 for 30 minutes

I leave the filled bags neatly at your property for your normal city collection.

Send me a photo of the area + your ZIP code and I'll tell you if it fits the $49 job.`;

const REPLY_SCRIPT = `Thanks! Please send me 2–3 photos of the front yard / sidewalk / driveway and your ZIP code.

The $49 service is for up to 30 minutes of leaf cleanup. I bag the leaves and leave the bags neatly at your property for your normal collection.

If the photos show a bigger job, I'll tell you the price before you book — no surprises.`;

const REF_SCRIPT = `All done ✅

If one of your neighbors needs the same cleanup, feel free to send them my number. If I can book them while I'm already in the neighborhood, I can usually keep the same simple flat-rate format.`;

export const leafCleanupLaunch: Launch = {
  id: 'leaf-cleanup-ne-philly',
  mode: 'money',
  rank: 1,
  isPrimary: true,
  title: 'FRONT YARD LEAF RESET → $49',
  kicker: '$200 → local service · no spend before signal',
  summary:
    'Prove demand first. Publish a flat $49 / 30-min leaf cleanup, book a lead from photos, then buy only the small starter kit.',
  tags: ['⚡ primary', 'no spend first', 'car helpful', 'either channel'],
  locationLabel: 'Northeast Philadelphia',
  whyNow:
    'Philadelphia Fall Leaf Recycling 2026: official season starts Nov 2 and runs through Dec 19. Bag & stage — do not haul away.',
  economics: {
    currency: 'USD',
    starterCost: 110.97,
    reserveLeft: 89.03,
    offerPrice: 49,
    offerLabel: '$49 · 30 min',
    targetUnits: 3,
    adSpend: 0,
    notes: [
      'Starter kit ≈ $111 only AFTER a booked job.',
      'Keep ~$89 reserve until demand is proven.',
      '$49 is a test offer — not a guaranteed income.',
    ],
  },
  evidence: [
    {
      id: 'leaf-season',
      title: 'Seasonal demand signal',
      detail:
        'City leaf recycling window is live. Dry leaves on sidewalks/driveways are a recurring neighborhood need.',
      sourceLabel: 'Philly Fall Leaf Recycling 2026',
    },
    {
      id: 'flat-offer',
      title: 'Buyable offer',
      detail:
        'Flat 30-minute reset beats vague “landscaping.” Customer sends photos; you accept or decline remotely.',
    },
    {
      id: 'low-kit',
      title: 'Capital discipline',
      detail:
        'Only risk ≈$111 of $200 after a booked job. No pro blower, trailer, vacuum, or ads first.',
    },
  ],
  steps: [
    {
      id: 'demand',
      kind: 'info',
      title: 'Demand signal confirmed',
      description:
        'Leaf season is active in NE Philly. Small front-yard / sidewalk / driveway cleanups fit a flat $49 job. Do not buy equipment yet.',
      actions: [{ id: 'demand-ok', type: 'approve', label: 'Continue', primary: true }],
    },
    {
      id: 'offer',
      kind: 'offer',
      title: 'Your offer is ready',
      description:
        'One clear offer: Front Yard Leaf Reset — $49 for 30 minutes. Blow/rake, bag, stage for city collection. No contract.',
      script: OFFER_POST,
      actions: [
        { id: 'copy-offer', type: 'copy', label: 'Copy offer', copyText: OFFER_POST },
        { id: 'approve-offer', type: 'approve', label: 'Approve offer', primary: true },
      ],
    },
    {
      id: 'distribution',
      kind: 'distribution',
      title: 'We found places to publish',
      description: 'Start with free local channels. No paid ads. Copy the offer, then approve publish simulation.',
      channels: [
        {
          id: 'fb-groups',
          name: 'Facebook local groups',
          kind: 'social',
          url: 'https://www.facebook.com/search/groups/?q=northeast%20philadelphia%20community',
        },
        { id: 'nextdoor', name: 'Nextdoor', kind: 'social', url: 'https://nextdoor.com/' },
      ],
      actions: [
        {
          id: 'open-fb',
          type: 'open_link',
          label: 'Open Facebook groups',
          url: 'https://www.facebook.com/search/groups/?q=northeast%20philadelphia%20community',
        },
        {
          id: 'open-nd',
          type: 'open_link',
          label: 'Open Nextdoor',
          url: 'https://nextdoor.com/',
        },
        { id: 'dist-ok', type: 'approve', label: 'Approve distribution', primary: true },
      ],
    },
    {
      id: 'publish',
      kind: 'approve',
      title: 'Approve publish',
      description:
        'App will simulate posting your offer to the selected channels. Nothing spends money. You stay in control.',
      actions: [
        {
          id: 'sim-publish',
          type: 'simulate_publish',
          label: 'Simulate publish',
          primary: true,
        },
      ],
    },
    {
      id: 'wait',
      kind: 'wait',
      title: 'Waiting for signal',
      description: 'Listening for replies. In demo mode we simulate the first lead after a short wait.',
      autoAdvanceMs: 1800,
      actions: [
        { id: 'sim-wait', type: 'simulate_wait', label: 'Simulate wait', primary: true },
      ],
    },
    {
      id: 'lead',
      kind: 'lead',
      title: 'Lead received',
      description:
        'Maya from 19111: “Hi — leaves covering our sidewalk and small front yard. Can you do the $49 job this week?”',
      actions: [
        { id: 'sim-lead', type: 'simulate_lead', label: 'Open lead', primary: true },
      ],
    },
    {
      id: 'reply',
      kind: 'script',
      title: 'Reply — ask for photos',
      description: 'Do not drive over. Ask for 2–3 photos + ZIP, then accept or reprice.',
      script: REPLY_SCRIPT,
      actions: [
        { id: 'copy-reply', type: 'copy', label: 'Copy reply', copyText: REPLY_SCRIPT },
        { id: 'reply-sent', type: 'approve', label: 'Mark reply sent', primary: true },
      ],
    },
    {
      id: 'photos',
      kind: 'info',
      title: 'Photos look like a $49 job',
      description:
        'Simulated customer photos show dry leaves on a small front yard + sidewalk. Fits the 30-minute scope. Book it.',
      actions: [{ id: 'book', type: 'approve', label: 'Book job', primary: true }],
    },
    {
      id: 'equipment',
      kind: 'equipment',
      title: 'Now buy the starter kit',
      description:
        'Signal proven. Spend ≈$111 of your $200. Keep ~$89 untouched. No pro gear, no ads.',
      items: [
        {
          title: 'RYOBI ONE+ 18V blower + battery + charger',
          price: '$79.00',
          detail: '250 CFM / 90 MPH for light–medium dry leaves.',
          url: 'https://www.homedepot.com/p/RYOBI-ONE-18V-90-MPH-250-CFM-Cordless-Battery-Leaf-Blower-Sweeper-with-2-0-Ah-Battery-and-Charger-P21011K/327353564',
        },
        {
          title: 'Anvil 24" leaf rake',
          price: '$14.98',
          detail: 'Backup for wet leaves or blower limits.',
          url: 'https://www.homedepot.com/p/Anvil-47-in-L-Wood-Handle-24-in-Poly-Leaf-Rake-77855-940/314816652',
        },
        {
          title: '20 biodegradable leaf bags',
          price: '$12.81',
          detail: '30-gallon paper bags for bag & stage.',
          url: 'https://www.homedepot.com/p/The-Home-Depot-30-Gal-Paper-Lawn-and-Leaf-Bags-20-Count-30GPLLB20C/331499748',
        },
        {
          title: 'Work gloves — 3 pairs',
          price: '$4.18',
          detail: 'Simple consumable. No expensive pro kit.',
          url: 'https://www.walmart.com/ip/Hyper-Tough-Nitrile-Dipped-Safety-Work-Gloves-3-Pair-Mechanics-Work-Gloves-Size-Large-Black/141197125',
        },
      ],
      actions: [
        { id: 'kit-bought', type: 'mark_done', label: 'Kit purchased', primary: true },
      ],
    },
    {
      id: 'job',
      kind: 'checklist',
      title: '30 minutes. Timer on. Do not expand scope.',
      description: 'Sell a small result — not “I’ll do the whole yard however long it takes.”',
      checklist: ['dry leaves', 'front yard', 'sidewalk / driveway', 'bag & stage'],
      checklistOut: ['no tree trimming', 'no ladders', 'no hauling away', 'no chemicals'],
      actions: [{ id: 'job-done', type: 'mark_done', label: 'Job complete', primary: true }],
    },
    {
      id: 'payment',
      kind: 'payment',
      title: 'Collect payment → first $49',
      description: 'Get paid. Then ask for a neighbor referral — cheapest next customer.',
      script: REF_SCRIPT,
      actions: [
        { id: 'copy-ref', type: 'copy', label: 'Copy referral text', copyText: REF_SCRIPT },
        {
          id: 'got-paid',
          type: 'collect_payment',
          label: 'Payment received · $49',
          earningAmount: 49,
          primary: true,
        },
      ],
    },
    {
      id: 'repeat',
      kind: 'repeat',
      title: 'Repeat or find another',
      description:
        'Photo → agree $49 → 30 min → bag & stage → pay → neighbor. After 3–5 real jobs, decide on price or a stronger blower.',
      actions: [
        { id: 'repeat-same', type: 'repeat', label: 'Repeat this launch', primary: true },
        { id: 'find-another', type: 'approve', label: 'Find another launch' },
      ],
    },
  ],
};
