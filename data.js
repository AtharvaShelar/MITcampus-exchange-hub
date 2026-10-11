/* ==========================================================
   MIT Campus Exchange Hub  —  data.js
   ----------------------------------------------------------
   Initial sample data for the prototype.

   IMPORTANT: This is NOT a database. These are plain
   JavaScript arrays and objects. On first run, script.js
   copies them into the application state. Selected changes
   are then saved in the browser's localStorage.

   All names, emails and prices below are fictional sample
   data created only for this college PBL demonstration.
   ========================================================== */

/* ---------- 1. Categories & report reasons ---------- */

const SAMPLE_CATEGORIES = [
  'Textbooks',
  'Notes',
  'Stationery',
  'Electronics',
  'Lab Equipment',
  'Reference Books',
  'Drawing Instruments',
  'Other'
];

const SAMPLE_CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

const SAMPLE_REPORT_REASONS = [
  'Suspicious or fraudulent activity',
  'Misleading product description',
  'Inappropriate content',
  'Spam',
  'Other'
];

/* ---------- 2. Demo accounts (fictional) ---------- */

const DEMO_USERS = [
  { email: 'student@demo.edu', password: 'demo123', role: 'student', status: 'active',    joined: '12 Jul 2026' },
  { email: 'admin@demo.edu',   password: 'demo123', role: 'admin',   status: 'active',    joined: '02 Jun 2026' },
  { email: 'priya@demo.edu',   password: 'demo123', role: 'student', status: 'active',    joined: '15 Jul 2026' },
  { email: 'rohan@demo.edu',   password: 'demo123', role: 'student', status: 'active',    joined: '18 Jul 2026' },
  { email: 'sneha@demo.edu',   password: 'demo123', role: 'student', status: 'active',    joined: '01 Aug 2026' },
  { email: 'kabir@demo.edu',   password: 'demo123', role: 'student', status: 'suspended', joined: '09 Aug 2026' }
];

/* ---------- 3. Profile details (kept separate from login records) ---------- */

const DEMO_PROFILES = {
  'student@demo.edu': { name: 'Aarav Sharma',   department: 'Computer Engineering',      year: '2nd Year' },
  'admin@demo.edu':   { name: 'Campus Admin',   department: 'Administration',            year: '—' },
  'priya@demo.edu':   { name: 'Priya Deshmukh', department: 'Electronics & Telecom',     year: '3rd Year' },
  'rohan@demo.edu':   { name: 'Rohan Kulkarni', department: 'Mechanical Engineering',    year: '2nd Year' },
  'sneha@demo.edu':   { name: 'Sneha Iyer',     department: 'Computer Engineering',      year: '4th Year' },
  'kabir@demo.edu':   { name: 'Kabir Nair',     department: 'Civil Engineering',         year: '1st Year' }
};

/* ---------- 4. Sample marketplace listings ---------- */

const SAMPLE_PRODUCTS = [
  {
    id: 'p1',
    name: 'Engineering Mathematics-III Textbook',
    price: 450,
    category: 'Textbooks',
    condition: 'Good',
    description: 'Prescribed textbook for M-III (Second Year). Covers linear algebra, complex analysis and transforms. Some solved examples highlighted in pencil, binding is intact.',
    sellerEmail: 'priya@demo.edu',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80',
    status: 'available',
    createdAt: '2026-09-28'
  },
  {
    id: 'p2',
    name: 'Data Structures & Algorithms — Handwritten Notes',
    price: 250,
    category: 'Notes',
    condition: 'Like New',
    description: 'Complete semester notes for DSA with all 5 units, diagrams and previous-year questions solved. Spiral bound, 140 pages.',
    sellerEmail: 'rohan@demo.edu',
    image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&q=80',
    status: 'available',
    createdAt: '2026-10-02'
  },
  {
    id: 'p3',
    name: 'Casio FX-991ES Plus Scientific Calculator',
    price: 750,
    category: 'Electronics',
    condition: 'Good',
    description: '417 functions, natural display. Used for two semesters, works perfectly. Slide-on hard case included.',
    sellerEmail: 'student@demo.edu',
    image: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=600&q=80',
    status: 'available',
    createdAt: '2026-10-04'
  },
  {
    id: 'p4',
    name: 'Complete Stationery Kit (Semester Pack)',
    price: 320,
    category: 'Stationery',
    condition: 'New',
    description: 'Brand new unopened kit — 4 ruled notebooks, 1 graph book, geometry set, gel pens, highlighters and sticky notes.',
    sellerEmail: 'sneha@demo.edu',
    image: 'https://images.unsplash.com/photo-1568205612837-017257d2310a?w=600&q=80',
    status: 'available',
    createdAt: '2026-10-05'
  },
  {
    id: 'p5',
    name: 'Lab Record Book (200 Pages, Unused)',
    price: 90,
    category: 'Stationery',
    condition: 'New',
    description: 'Hard-bound practical record book with margin and graph pages. Never used, cover slightly dusty from storage.',
    sellerEmail: 'kabir@demo.edu',
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80',
    status: 'sold',
    createdAt: '2026-09-22'
  },
  {
    id: 'p6',
    name: 'Higher Engineering Mathematics — B.S. Grewal',
    price: 520,
    category: 'Reference Books',
    condition: 'Good',
    description: '44th edition. The standard reference for first and second year engineering mathematics. No torn pages, minor wear on the spine.',
    sellerEmail: 'priya@demo.edu',
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80',
    status: 'available',
    createdAt: '2026-09-25'
  },
  {
    id: 'p7',
    name: 'Drawing Instruments Box Set',
    price: 400,
    category: 'Drawing Instruments',
    condition: 'Good',
    description: 'Complete engineering drawing instrument box — compass, dividers, set squares, protractor and scale. Ideal for first year ED lab.',
    sellerEmail: 'student@demo.edu',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80',
    status: 'available',
    createdAt: '2026-10-07'
  },
  {
    id: 'p8',
    name: 'boAt Rockerz 450 Bluetooth Headphones',
    price: 1100,
    category: 'Electronics',
    condition: 'Like New',
    description: '15 hours playback, padded ear cushions. Bought 3 months ago, used only for online lectures. Original box and charging cable included.',
    sellerEmail: 'rohan@demo.edu',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
    status: 'available',
    createdAt: '2026-10-08'
  },
  {
    id: 'p9',
    name: 'Digital Logic Design — Morris Mano',
    price: 380,
    category: 'Textbooks',
    condition: 'Good',
    description: 'Standard textbook for Digital Electronics / DLD. All chapters present, few notes written on the last blank pages.',
    sellerEmail: 'sneha@demo.edu',
    image: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80',
    status: 'available',
    createdAt: '2026-10-09'
  },
  {
    id: 'p10',
    name: 'Organic Chemistry Reference Notes',
    price: 180,
    category: 'Notes',
    condition: 'Good',
    description: 'Neatly written reaction-mechanism notes for first year chemistry, with all named reactions and a quick revision chart.',
    sellerEmail: 'student@demo.edu',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&q=80',
    status: 'available',
    createdAt: '2026-10-09'
  },
  {
    id: 'p11',
    name: 'Scientific Calculator — FX-82MS',
    price: 500,
    category: 'Electronics',
    condition: 'Fair',
    description: 'Working calculator with 240 functions. The display has a small scratch but readings are perfectly clear. Battery recently changed.',
    sellerEmail: 'kabir@demo.edu',
    image: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&q=80',
    status: 'available',
    createdAt: '2026-09-30'
  },
  {
    id: 'p12',
    name: 'Engineering Drawing Board + Mini Drafter',
    price: 850,
    category: 'Drawing Instruments',
    condition: 'Good',
    description: 'A2 size drawing board with a working mini drafter attached. Used for one year of ED lab, no cracks or dents.',
    sellerEmail: 'priya@demo.edu',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
    status: 'available',
    createdAt: '2026-10-10'
  }
];

/* ---------- 5. Sample purchase requests ----------
   The demo student is the BUYER in r1 and r2 (Sent Requests)
   and the SELLER in r3, r4 and r5 (Received Requests), so both
   sections are populated for the demonstration.              */

const SAMPLE_REQUESTS = [
  {
    id: 'r1',
    productId: 'p1',
    buyerEmail: 'student@demo.edu',
    sellerEmail: 'priya@demo.edu',
    date: '10 Oct 2026',
    status: 'Pending'
  },
  {
    id: 'r2',
    productId: 'p6',
    buyerEmail: 'student@demo.edu',
    sellerEmail: 'priya@demo.edu',
    date: '06 Oct 2026',
    status: 'Accepted'
  },
  {
    id: 'r3',
    productId: 'p3',
    buyerEmail: 'rohan@demo.edu',
    sellerEmail: 'student@demo.edu',
    date: '09 Oct 2026',
    status: 'Pending'
  },
  {
    id: 'r4',
    productId: 'p7',
    buyerEmail: 'sneha@demo.edu',
    sellerEmail: 'student@demo.edu',
    date: '08 Oct 2026',
    status: 'Pending'
  },
  {
    id: 'r5',
    productId: 'p10',
    buyerEmail: 'kabir@demo.edu',
    sellerEmail: 'student@demo.edu',
    date: '05 Oct 2026',
    status: 'Rejected'
  }
];

/* ---------- 6. Sample conversations & messages ---------- */

const SAMPLE_CONVERSATIONS = [
  {
    id: 'c1',
    withEmail: 'priya@demo.edu',
    productId: 'p1',
    messages: [
      { id: 'm1', from: 'student@demo.edu', text: 'Hi Priya! Is the Engineering Mathematics-III book still available?', time: '09:12' },
      { id: 'm2', from: 'priya@demo.edu',   text: 'Hey Aarav! Yes it is. The cover has a small fold but all pages are fine.', time: '09:18' },
      { id: 'm3', from: 'student@demo.edu', text: 'Great. Would you consider ₹400?', time: '09:21' },
      { id: 'm4', from: 'priya@demo.edu',   text: '₹420 and it is yours. I can meet near the library at 4 pm.', time: '09:25' }
    ]
  },
  {
    id: 'c2',
    withEmail: 'rohan@demo.edu',
    productId: 'p3',
    messages: [
      { id: 'm5', from: 'rohan@demo.edu',   text: 'Hi, I saw your Casio FX-991ES listing. Does it come with the case?', time: '14:02' },
      { id: 'm6', from: 'student@demo.edu', text: 'Yes, the slide-on hard case is included.', time: '14:10' },
      { id: 'm7', from: 'rohan@demo.edu',   text: 'Perfect, I have sent a purchase request.', time: '14:12' }
    ]
  },
  {
    id: 'c3',
    withEmail: 'sneha@demo.edu',
    productId: 'p7',
    messages: [
      { id: 'm8', from: 'sneha@demo.edu',   text: 'Is the drawing instrument box complete? Missing any pieces?', time: '11:40' },
      { id: 'm9', from: 'student@demo.edu', text: 'It is complete — compass, dividers, both set squares and the protractor.', time: '11:47' }
    ]
  }
];

/* ---------- 7. Sample reports ---------- */

const SAMPLE_REPORTS = [
  {
    id: 'rep1',
    type: 'Product',
    targetId: 'p5',
    targetLabel: 'Lab Record Book (200 Pages, Unused)',
    reporterEmail: 'kabir@demo.edu',
    reason: 'Misleading product description',
    description: 'The photos look like a different notebook than the one described in the listing.',
    date: '07 Oct 2026',
    status: 'Pending'
  },
  {
    id: 'rep2',
    type: 'User',
    targetId: 'rohan@demo.edu',
    targetLabel: 'Rohan Kulkarni',
    reporterEmail: 'sneha@demo.edu',
    reason: 'Spam',
    description: 'This user keeps sending the same message repeatedly about unrelated items.',
    date: '06 Oct 2026',
    status: 'Under Review'
  },
  {
    id: 'rep3',
    type: 'Product',
    targetId: 'p11',
    targetLabel: 'Scientific Calculator — FX-82MS',
    reporterEmail: 'priya@demo.edu',
    reason: 'Suspicious or fraudulent activity',
    description: 'Price changed several times within a single day, which looked odd.',
    date: '03 Oct 2026',
    status: 'Resolved'
  }
];

/* ---------- 8. Sample notifications ---------- */

const SAMPLE_NOTIFICATIONS = [
  {
    toEmail: 'student@demo.edu',
    id: 'n1',
    type: 'request',
    title: 'New purchase request',
    message: 'Rohan Kulkarni wants to buy your "Casio FX-991ES Plus Scientific Calculator".',
    time: '09 Oct 2026, 14:12',
    read: false,
    link: 'requests'
  },
  {
    toEmail: 'student@demo.edu',
    id: 'n2',
    type: 'message',
    title: 'New chat message',
    message: 'Priya Deshmukh replied about "Engineering Mathematics-III Textbook".',
    time: '10 Oct 2026, 09:25',
    read: false,
    link: 'chats'
  },
  {
    toEmail: 'student@demo.edu',
    id: 'n3',
    type: 'request',
    title: 'Purchase request accepted',
    message: 'Priya Deshmukh accepted your request for "Higher Engineering Mathematics — B.S. Grewal".',
    time: '06 Oct 2026, 18:40',
    read: false,
    link: 'requests'
  },
  {
    toEmail: 'student@demo.edu',
    id: 'n4',
    type: 'report',
    title: 'Report status changed',
    message: 'Your report on "Scientific Calculator — FX-82MS" has been marked Resolved.',
    time: '04 Oct 2026, 10:05',
    read: true,
    link: 'report'
  },
  {
    toEmail: 'student@demo.edu',
    id: 'n5',
    type: 'sold',
    title: 'Listing marked as sold',
    message: 'Your "Lab Record Book (200 Pages, Unused)" was marked as sold.',
    time: '23 Sep 2026, 16:20',
    read: true,
    link: 'listings'
  }
];

/* ---------- 9. Sample activity log (for the Admin Dashboard) ---------- */

const SAMPLE_ACTIVITY = [
  { id: 'a1', type: 'listing', text: 'Priya Deshmukh listed "Engineering Drawing Board + Mini Drafter".', time: '10 Oct 2026, 11:30' },
  { id: 'a2', type: 'request', text: 'Rohan Kulkarni sent a purchase request for "Casio FX-991ES Plus Scientific Calculator".', time: '09 Oct 2026, 14:12' },
  { id: 'a3', type: 'listing', text: 'Sneha Iyer listed "Digital Logic Design — Morris Mano".', time: '09 Oct 2026, 09:48' },
  { id: 'a4', type: 'report', text: 'Kabir Nair reported "Lab Record Book (200 Pages, Unused)".', time: '07 Oct 2026, 20:15' },
  { id: 'a5', type: 'request', text: 'Kabir Nair sent a purchase request for "Organic Chemistry Reference Notes".', time: '05 Oct 2026, 12:02' },
  { id: 'a6', type: 'report', text: 'Report on "Scientific Calculator — FX-82MS" marked as Resolved.', time: '04 Oct 2026, 10:05' }
];

/* ---------- 10. Sample wishlist (per demo account) ---------- */

const SAMPLE_WISHLIST = [
  { email: 'student@demo.edu', productId: 'p2' },
  { email: 'student@demo.edu', productId: 'p8' }
];
