/* ==========================================================
   MIT Campus Exchange Hub — script.js   [PART 1 of 4]
   ----------------------------------------------------------
   All application logic for the prototype lives in this file:
     • localStorage data handling (no database)
     • simulated login / registration / logout (no real auth)
     • single-page navigation using the History API
     • marketplace, listings, wishlist, chat, purchase
       requests, reports and notifications
     • the admin dashboard

   No frameworks, no backend, no database, no external APIs.
   ========================================================== */

'use strict';

/* ==========================================================
   1. STORAGE KEYS AND GLOBAL STATE
   ========================================================== */

const DATA_KEY = 'mit_exchange_hub_data_v1';
const SESSION_KEY = 'mit_exchange_hub_session_v1';

let state = null;            // all prototype data (arrays + objects)
let currentUser = null;      // { email, role } of the "logged in" demo account

let currentView = 'home';    // router state
let currentParam = null;

let searchTerm = '';         // marketplace search / filter / sort state
let activeCategory = 'All';
let activeCondition = 'All';
let activeSort = 'newest';

let editingProductId = null; // Sell Item form in edit mode
let activeConversationId = null;
let requestTab = 'sent';
let adminSection = 'overview';
let adminListingQuery = '';
let adminListingFilter = 'all';
let confirmCallback = null;  // callback used by the confirmation modal

const VIEW_IDS = {
  home: 'view-home',
  browse: 'view-browse',
  details: 'view-details',
  sell: 'view-sell',
  listings: 'view-listings',
  chats: 'view-chats',
  requests: 'view-requests',
  wishlist: 'view-wishlist',
  profile: 'view-profile',
  notifications: 'view-notifications',
  report: 'view-report',
  tech: 'view-tech'
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ==========================================================
   2. SMALL HELPERS
   ========================================================== */

/** Shortcut for document.getElementById */
function $(id) { return document.getElementById(id); }

/** Shortcut for querySelectorAll that returns a real array */
function $$(selector, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(selector));
}

/** Deep copy of plain data (used so the sample data is never mutated) */
function deepCopy(value) { return JSON.parse(JSON.stringify(value)); }

/** Escape text before putting it inside HTML */
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format a number as Indian rupees, e.g. 1100 -> ₹1,100 */
function money(amount) {
  return '\u20B9' + Number(amount).toLocaleString('en-IN');
}

/** Simple unique id, e.g. uid('p') -> 'p1712345678901' */
function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

/** Today's date as YYYY-MM-DD (used for sorting "newest first") */
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/** Readable date + time label, e.g. "11 Oct 2026, 14:05" */
function nowLabel() {
  const d = new Date();
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** Clock label for chat messages, e.g. "14:05" */
function clockLabel() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** "Aarav Sharma" -> "AS" (used for the round avatars) */
function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/** Does the visitor prefer reduced motion? */
function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Look up a user record by email */
function userByEmail(email) {
  return state.users.find(function (u) { return u.email === email; }) || null;
}

/** Display name of a user (falls back to the email) */
function nameOf(email) {
  const p = state.profiles[email];
  return p ? p.name : email;
}

/** Department label of a user */
function departmentOf(email) {
  const p = state.profiles[email];
  return p ? p.department : '\u2014';
}

/** Find a product by id */
function productById(id) {
  return state.products.find(function (p) { return p.id === id; }) || null;
}

/** Find a conversation by id */
function conversationById(id) {
  return state.conversations.find(function (c) { return c.id === id; }) || null;
}

/** Is this product in the current user's wishlist? */
function isWishlisted(productId) {
  if (!currentUser) return false;
  return state.wishlist.some(function (w) {
    return w.email === currentUser.email && w.productId === productId;
  });
}

/** Products saved by the current user (skips deleted products) */
function myWishlistProducts() {
  if (!currentUser) return [];
  return state.wishlist
    .filter(function (w) { return w.email === currentUser.email; })
    .map(function (w) { return productById(w.productId); })
    .filter(function (p) { return p !== null; });
}

/* ==========================================================
   3. TOASTS AND CONFIRMATION MODAL
   ========================================================== */

/** Show a small message at the bottom of the screen */
function toast(message, type) {
  const container = $('toastContainer');
  if (!container) return;
  const box = document.createElement('div');
  box.className = 'toast ' + (type || 'info');
  box.textContent = message;
  container.appendChild(box);
  window.setTimeout(function () {
    box.classList.add('fade-out');
    window.setTimeout(function () { box.remove(); }, 320);
  }, 3200);
}

/** Open the shared confirmation dialog */
function askConfirm(title, text, confirmLabel, onConfirm) {
  $('modalTitle').textContent = title;
  $('modalText').textContent = text;
  $('modalConfirmBtn').textContent = confirmLabel || 'Confirm';
  confirmCallback = onConfirm;
  $('modalRoot').classList.remove('hidden');
}

/** Close the confirmation dialog */
function closeConfirm() {
  $('modalRoot').classList.add('hidden');
  confirmCallback = null;
}

/* ==========================================================
   4. DATA: LOAD, SAVE, RESET  (localStorage instead of a database)
   ========================================================== */

/** Build a fresh copy of everything defined in data.js */
function seedData() {
  return {
    users: deepCopy(DEMO_USERS),
    profiles: deepCopy(DEMO_PROFILES),
    products: deepCopy(SAMPLE_PRODUCTS),
    requests: deepCopy(SAMPLE_REQUESTS),
    conversations: deepCopy(SAMPLE_CONVERSATIONS),
    reports: deepCopy(SAMPLE_REPORTS),
    notifications: deepCopy(SAMPLE_NOTIFICATIONS),
    activity: deepCopy(SAMPLE_ACTIVITY),
    wishlist: deepCopy(SAMPLE_WISHLIST)
  };
}

/** Make sure a saved object actually looks like our data */
function isValidData(data) {
  if (!data || typeof data !== 'object') return false;
  const arrays = ['users', 'products', 'requests', 'conversations',
                  'reports', 'notifications', 'activity', 'wishlist'];
  for (let i = 0; i < arrays.length; i++) {
    if (!Array.isArray(data[arrays[i]])) return false;
  }
  return !!data.profiles && typeof data.profiles === 'object';
}

/** Load saved data, or fall back to the sample data from data.js */
function loadData() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(DATA_KEY));
  } catch (error) {
    saved = null; // corrupted JSON -> start from the sample data
  }
  if (isValidData(saved)) {
    state = saved;
  } else {
    state = seedData();
    saveData();
  }
}

/** Save the whole prototype state into localStorage */
function saveData() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(state));
  } catch (error) {
    toast('This browser could not save the data (storage may be full or blocked).', 'error');
  }
}

/** Remove the session (used on logout) */
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (error) { /* ignore */ }
}

/** Restore the session if the browser still remembers it */
function loadSession() {
  currentUser = null;
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (saved && saved.email) {
      const user = userByEmail(saved.email);
      if (user && user.status === 'active') {
        currentUser = { email: user.email, role: user.role };
      }
    }
  } catch (error) {
    currentUser = null;
  }
}

/* ==========================================================
   5. ACTIVITY LOG AND NOTIFICATIONS
   ========================================================== */

/** Add an entry to the activity overview shown to the admin */
function logActivity(type, text) {
  state.activity.unshift({
    id: uid('a'),
    type: type,
    text: text,
    time: nowLabel()
  });
  state.activity = state.activity.slice(0, 40);
}

/** Send an in-app notification to one demo account */
function addNotification(toEmail, type, title, message, link) {
  state.notifications.unshift({
    id: uid('n'),
    toEmail: toEmail,
    type: type,
    title: title,
    message: message,
    time: nowLabel(),
    read: false,
    link: link || 'home'
  });
}

/** Notifications belonging to the logged-in account */
function myNotifications() {
  if (!currentUser) return [];
  return state.notifications.filter(function (n) { return n.toEmail === currentUser.email; });
}

/** How many unread notifications the logged-in account has */
function unreadCount() {
  return myNotifications().filter(function (n) { return !n.read; }).length;
}

/** Refresh the red counters in the navigation */
function updateBadges() {
  const count = unreadCount();
  ['navBadge', 'navBadgeTop'].forEach(function (id) {
    const badge = $(id);
    if (!badge) return;
    const previous = badge.dataset.count || '0';
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
    if (previous !== String(count)) {
      badge.dataset.count = String(count);
      badge.classList.remove('pop');
      void badge.offsetWidth;      // restart the CSS animation
      badge.classList.add('pop');
    }
  });
}

/* ==========================================================
   6. SIMULATED AUTHENTICATION
   ========================================================== */

/** Show the login / registration screen and hide the app shells */
function showAuthScreen() {
  $('authScreen').classList.remove('hidden');
  $('appShell').classList.add('hidden');
  $('adminShell').classList.add('hidden');
  $('userMenu').classList.add('hidden');
  $('loginForm').classList.remove('hidden');
  $('registerForm').classList.add('hidden');
  $('loginError').classList.add('hidden');
  $('registerError').classList.add('hidden');
  document.body.classList.remove('admin-mode');
}

/** Show the student application shell */
function showStudentShell() {
  $('authScreen').classList.add('hidden');
  $('adminShell').classList.add('hidden');
  $('appShell').classList.remove('hidden');

  const profile = state.profiles[currentUser.email] || { name: currentUser.email };
  $('userChipName').textContent = profile.name;
  $('userChipAvatar').textContent = initials(profile.name);

  // The admin can step back into the dashboard from the marketplace.
  const right = document.querySelector('.topbar-right');
  let adminBtn = $('toAdminBtn');
  if (currentUser.role === 'admin') {
    if (!adminBtn) {
      adminBtn = document.createElement('button');
      adminBtn.id = 'toAdminBtn';
      adminBtn.type = 'button';
      adminBtn.className = 'icon-btn';
      adminBtn.innerHTML = '<span aria-hidden="true">\u2B05</span>' +
        '<span class="icon-btn-text">Admin Dashboard</span>';
      adminBtn.addEventListener('click', function () { showAdminShell(); });
      right.insertBefore(adminBtn, right.firstChild);
    }
    adminBtn.classList.remove('hidden');
  } else if (adminBtn) {
    adminBtn.remove();
  }
}

/** Show the admin dashboard shell */
function showAdminShell() {
  if (!currentUser || currentUser.role !== 'admin') {
    toast('The admin dashboard is only available for the demo admin account.', 'error');
    return;
  }
  $('authScreen').classList.add('hidden');
  $('appShell').classList.add('hidden');
  $('adminShell').classList.remove('hidden');
  $('userMenu').classList.add('hidden');
  $('adminNameLabel').textContent = nameOf(currentUser.email);
  renderAdmin();
}

/** Finish a successful login */
function completeLogin(user) {
  currentUser = { email: user.email, role: user.role };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  } catch (error) { /* session simply will not persist */ }

  if (user.role === 'admin') {
    adminSection = 'overview';
    showAdminShell();
    toast('Logged in as the demo admin account.', 'success');
  } else {
    showStudentShell();
    navigate('home');
    toast('Welcome back, ' + nameOf(user.email) + '!', 'success');
  }
}

/** Log out of the prototype */
function logout() {
  const who = currentUser ? nameOf(currentUser.email) : '';
  clearSession();
  currentUser = null;
  editingProductId = null;
  activeConversationId = null;
  searchTerm = '';
  activeCategory = 'All';
  activeCondition = 'All';
  activeSort = 'newest';
  $('loginEmail').value = '';
  $('loginPassword').value = '';
  showAuthScreen();
  toast(who ? 'Logged out of ' + who + '.' : 'Logged out.', 'info');
}

/** Handle the login form */
function handleLogin(event) {
  event.preventDefault();
  const errorBox = $('loginError');
  const email = $('loginEmail').value.trim().toLowerCase();
  const password = $('loginPassword').value;

  errorBox.classList.add('hidden');

  if (!email || !password) {
    errorBox.textContent = 'Please enter both your student email and password.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorBox.textContent = 'That does not look like a valid email address.';
    errorBox.classList.remove('hidden');
    return;
  }

  const user = userByEmail(email);
  if (!user) {
    errorBox.textContent = 'No demo account found for this email. Use a demo account shown above or create one.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (user.password !== password) {
    errorBox.textContent = 'Incorrect password for this demo account. The demo password is demo123.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (user.status === 'suspended') {
    errorBox.textContent = 'This demo account is currently suspended. An admin can set it back to active.';
    errorBox.classList.remove('hidden');
    return;
  }

  completeLogin(user);
}

/** Handle the registration form */
function handleRegister(event) {
  event.preventDefault();
  const errorBox = $('registerError');
  const name = $('regName').value.trim();
  const email = $('regEmail').value.trim().toLowerCase();
  const password = $('regPassword').value;
  const department = $('regDepartment').value;
  const year = $('regYear').value;

  errorBox.classList.add('hidden');

  if (!name || !email || !password || !department || !year) {
    errorBox.textContent = 'Please fill in every field before creating your account.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (name.length < 3) {
    errorBox.textContent = 'Please enter your full student name.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorBox.textContent = 'Please enter a valid email address.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (password.length < 6) {
    errorBox.textContent = 'The password must be at least 6 characters long.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (userByEmail(email)) {
    errorBox.textContent = 'An account with this email already exists. Try logging in instead.';
    errorBox.classList.remove('hidden');
    return;
  }

  // Create the new (simulated) account in localStorage.
  state.users.push({
    email: email,
    password: password,
    role: 'student',
    status: 'active',
    joined: nowLabel().split(',')[0]
  });
  state.profiles[email] = { name: name, department: department, year: year };
  logActivity('user', name + ' created a new demo account.');
  saveData();

  $('registerForm').reset();
  completeLogin({ email: email, role: 'student' });
  toast('Account created. Remember, this is a local prototype account.', 'success');
}

/* ==========================================================
   7. ROUTER (single page navigation with the History API)
   ========================================================== */

/** Move to a view and remember it in the browser history */
function navigate(view, param, options) {
  options = options || {};
  if (!VIEW_IDS[view]) view = 'home';
  currentView = view;
  currentParam = param || null;

  const hash = '#/' + view + (currentParam ? '/' + currentParam : '');
  try {
    if (options.replace) {
      history.replaceState({ view: view, param: currentParam }, '', hash);
    } else if (!options.fromHistory) {
      history.pushState({ view: view, param: currentParam }, '', hash);
    }
  } catch (error) { /* older browsers simply keep the URL unchanged */ }

  renderCurrentView();
}

/** Read the current view out of location.hash */
function parseHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { view: 'home', param: null };
  const parts = raw.split('/');
  const view = VIEW_IDS[parts[0]] ? parts[0] : 'home';
  return { view: view, param: parts[1] || null };
}

/** Go to a view from a data-view element (works from the admin shell too) */
function goToView(view) {
  const adminVisible = !$('adminShell').classList.contains('hidden');
  if (adminVisible && currentUser && currentUser.role === 'admin') {
    showStudentShell();
  }
  navigate(view);
}

/** Draw the currently selected view into its section */
function renderCurrentView() {
  Object.keys(VIEW_IDS).forEach(function (key) {
    const section = $(VIEW_IDS[key]);
    if (section) section.classList.add('hidden');
  });

  const target = $(VIEW_IDS[currentView]);
  if (!target) return;
  target.classList.remove('hidden');
  target.innerHTML = buildView(currentView);

  // restart the fade-in animation
  target.style.animation = 'none';
  void target.offsetWidth;
  target.style.animation = '';

  $$('.nav-item').forEach(function (button) {
    button.classList.toggle('active', button.dataset.view === currentView);
  });

  if (currentView === 'chats') scrollChatToBottom();

  try {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  } catch (error) {
    window.scrollTo(0, 0);
  }

  updateBadges();
}

/** Which builder function draws which view */
function buildView(view) {
  switch (view) {
    case 'browse':        return buildBrowseView();
    case 'details':       return buildDetailsView(currentParam);
    case 'sell':          return buildSellView();
    case 'listings':      return buildListingsView();
    case 'chats':         return buildChatsView();
    case 'requests':      return buildRequestsView();
    case 'wishlist':      return buildWishlistView();
    case 'profile':       return buildProfileView();
    case 'notifications': return buildNotificationsView();
    case 'report':        return buildReportView(currentParam);
    case 'tech':          return buildTechView();
    default:              return buildHomeView();
  }
}
/* ==========================================================
   MIT Campus Exchange Hub — script.js   [PART 2 of 4]
   ----------------------------------------------------------
   Marketplace views: Home, Browse, Product Details,
   Sell Item and My Listings.
   ========================================================== */

/* ==========================================================
   8. SHARED PIECES USED BY SEVERAL VIEWS
   ========================================================== */

/** Empty state block */
function emptyState(icon, title, message, actionHtml) {
  return '<div class="empty-state">' +
    '<span class="empty-icon" aria-hidden="true">' + icon + '</span>' +
    '<h3>' + esc(title) + '</h3>' +
    '<p>' + esc(message) + '</p>' +
    (actionHtml || '') +
    '</div>';
}

/** Apply the search box, category, condition and sorting choices */
function filteredProducts() {
  const term = searchTerm.trim().toLowerCase();
  let list = state.products.slice();

  if (activeCategory !== 'All') {
    list = list.filter(function (p) { return p.category === activeCategory; });
  }
  if (activeCondition !== 'All') {
    list = list.filter(function (p) { return p.condition === activeCondition; });
  }
  if (term) {
    list = list.filter(function (p) {
      return (p.name + ' ' + p.category + ' ' + p.description).toLowerCase().indexOf(term) !== -1;
    });
  }

  if (activeSort === 'price-asc') {
    list.sort(function (a, b) { return a.price - b.price; });
  } else if (activeSort === 'price-desc') {
    list.sort(function (a, b) { return b.price - a.price; });
  } else {
    list.sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }
  return list;
}

/** One product card for the marketplace grid */
function productCard(product) {
  const sold = product.status === 'sold';
  const saved = isWishlisted(product.id);
  return '' +
  '<article class="product-card' + (sold ? ' is-sold' : '') + '">' +
    '<div class="product-media">' +
      '<img src="' + esc(product.image || '') + '" alt="' + esc(product.name) + '" loading="lazy">' +
      '<span class="pill status-tag ' + (sold ? 'pill-sold' : 'pill-available') + '">' +
        (sold ? 'Sold' : 'Available') + '</span>' +
    '</div>' +
    '<div class="product-body">' +
      '<h3 class="product-name">' + esc(product.name) + '</h3>' +
      '<div class="product-price">' + money(product.price) + '</div>' +
      '<div class="product-meta">' +
        '<span class="pill pill-cat">' + esc(product.category) + '</span>' +
        '<span class="pill pill-condition">' + esc(product.condition) + '</span>' +
      '</div>' +
      '<div class="product-seller">Sold by ' + esc(nameOf(product.sellerEmail)) + '</div>' +
      '<div class="product-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="open-product" data-id="' +
          esc(product.id) + '">View Details</button>' +
        '<button type="button" class="btn ' + (saved ? 'btn-danger-soft' : 'btn-ghost') +
          ' btn-sm" data-action="toggle-wishlist" data-id="' + esc(product.id) + '">' +
          (saved ? '\u2764\uFE0F Saved' : '\uD83E\uDD0D Wishlist') + '</button>' +
      '</div>' +
    '</div>' +
  '</article>';
}

/** The grid of product cards (or an empty state) */
function productGrid(list, emptyTitle, emptyMessage) {
  if (!list.length) {
    return emptyState('\uD83D\uDD0D',
      emptyTitle || 'No products match your search',
      emptyMessage || 'Try another keyword, clear the category filter, or post the item yourself.',
      '<button type="button" class="btn btn-primary" data-action="clear-filters">Clear all filters</button>');
  }
  return '<div class="product-grid">' + list.map(productCard).join('') + '</div>';
}

/** Category filter chips */
function categoryChips() {
  const options = ['All'].concat(SAMPLE_CATEGORIES);
  return '<div class="chips">' + options.map(function (cat) {
    return '<button type="button" class="chip' + (activeCategory === cat ? ' active' : '') +
      '" data-action="set-category" data-id="' + esc(cat) + '">' + esc(cat) + '</button>';
  }).join('') + '</div>';
}

/** The sort dropdown */
function sortSelect(id) {
  const options = [
    ['newest', 'Newest first'],
    ['price-asc', 'Price: low to high'],
    ['price-desc', 'Price: high to low']
  ];
  return '<select id="' + id + '" data-input="sort">' + options.map(function (pair) {
    return '<option value="' + pair[0] + '"' + (activeSort === pair[0] ? ' selected' : '') +
      '>' + esc(pair[1]) + '</option>';
  }).join('') + '</select>';
}

/* ==========================================================
   9. PAGE 2 — HOME / MARKETPLACE
   ========================================================== */

function buildHomeView() {
  const list = filteredProducts();
  const available = state.products.filter(function (p) { return p.status === 'available'; }).length;
  const myChats = myConversations().length;

  return '' +
  '<section class="hero">' +
    '<h2>Welcome back, ' + esc(nameOf(currentUser.email).split(' ')[0]) + ' \uD83D\uDC4B</h2>' +
    '<p>Buy and sell textbooks, notes, stationery and electronics inside the campus. ' +
      'Everything here is posted by other students \u2014 no outside sellers.</p>' +
    '<div class="hero-actions">' +
      '<button type="button" class="btn btn-primary btn-lg" data-view="sell">\u2795 Sell an item</button>' +
      '<button type="button" class="btn btn-ghost btn-lg" data-view="wishlist">\u2764\uFE0F My wishlist</button>' +
      '<button type="button" class="btn btn-ghost btn-lg" data-view="chats">\uD83D\uDCAC My chats (' +
        myChats + ')</button>' +
      '<button type="button" class="btn btn-ghost btn-lg" data-view="notifications">\uD83D\uDD14 Notifications (' +
        unreadCount() + ')</button>' +
    '</div>' +
  '</section>' +

  '<div class="stat-grid">' +
    '<div class="stat-card accent"><div class="stat-value">' + state.products.length +
      '</div><div class="stat-label">Total listings</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + available +
      '</div><div class="stat-label">Available now</div></div>' +
    '<div class="stat-card"><div class="stat-value">' +
      state.products.filter(function (p) { return p.sellerEmail === currentUser.email; }).length +
      '</div><div class="stat-label">Your listings</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + myWishlistProducts().length +
      '</div><div class="stat-label">Saved items</div></div>' +
  '</div>' +

  '<h3 class="section-title">Browse the marketplace</h3>' +

  '<div class="toolbar">' +
    '<div class="toolbar-row">' +
      '<label class="field toolbar-search">' +
        '<span class="field-label">Search products</span>' +
        '<input type="search" id="homeSearch" data-input="search" value="' + esc(searchTerm) +
          '" placeholder="e.g. engineering mathematics, calculator, notes">' +
      '</label>' +
      '<label class="field toolbar-field">' +
        '<span class="field-label">Sort by</span>' + sortSelect('homeSort') +
      '</label>' +
    '</div>' +
    categoryChips() +
  '</div>' +

  '<div class="product-grid-area" id="homeGrid">' + productGrid(list) + '</div>' +

  '<p class="muted small mt-2">Showing ' + list.length + ' of ' + state.products.length +
    ' listings. Sold items are shown in grey so you can tell them apart.</p>';
}

/* ==========================================================
   10. PAGE 2b — BROWSE ITEMS (full filter toolbar)
   ========================================================== */

function buildBrowseView() {
  const list = filteredProducts();
  const conditionOptions = ['All'].concat(SAMPLE_CONDITIONS);

  return '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">Browse Items</h2>' +
      '<p class="page-sub">Search, filter and sort every listing posted on the campus marketplace.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-primary" data-view="sell">\u2795 Sell an item</button>' +
  '</div>' +

  '<div class="toolbar">' +
    '<div class="toolbar-row">' +
      '<label class="field toolbar-search">' +
        '<span class="field-label">Search by product name</span>' +
        '<input type="search" id="browseSearch" data-input="search" value="' + esc(searchTerm) +
          '" placeholder="Search textbooks, notes, electronics\u2026">' +
      '</label>' +
      '<label class="field toolbar-field">' +
        '<span class="field-label">Category</span>' +
        '<select data-input="category">' +
          ['All'].concat(SAMPLE_CATEGORIES).map(function (cat) {
            return '<option value="' + esc(cat) + '"' + (activeCategory === cat ? ' selected' : '') +
              '>' + esc(cat) + '</option>';
          }).join('') +
        '</select>' +
      '</label>' +
      '<label class="field toolbar-field">' +
        '<span class="field-label">Condition</span>' +
        '<select data-input="condition">' + conditionOptions.map(function (cond) {
          return '<option value="' + esc(cond) + '"' + (activeCondition === cond ? ' selected' : '') +
            '>' + esc(cond) + '</option>';
        }).join('') + '</select>' +
      '</label>' +
      '<label class="field toolbar-field">' +
        '<span class="field-label">Sort by</span>' + sortSelect('browseSort') +
      '</label>' +
      '<div class="toolbar-actions">' +
        '<button type="button" class="btn btn-ghost" data-action="clear-filters">Clear</button>' +
      '</div>' +
    '</div>' +
  '</div>' +

  '<p class="muted small mb-1" id="browseCounter">' + list.length + ' item(s) found' +
    (searchTerm ? ' for \u201C' + esc(searchTerm) + '\u201D' : '') +
    (activeCategory !== 'All' ? ' in ' + esc(activeCategory) : '') + '.</p>' +

  '<div class="product-grid-area mt-2" id="browseGrid">' + productGrid(list) + '</div>';
}

/* ==========================================================
   11. PAGE 3 — PRODUCT DETAILS
   ========================================================== */

function buildDetailsView(productId) {
  const product = productById(productId);
  if (!product) {
    return emptyState('\u2753', 'This listing is no longer available',
      'It may have been removed by the seller or by an admin.',
      '<button type="button" class="btn btn-primary" data-view="browse">Back to Browse Items</button>');
  }

  const sold = product.status === 'sold';
  const mine = product.sellerEmail === currentUser.email;
  const saved = isWishlisted(product.id);
  const sellerProfile = state.profiles[product.sellerEmail] || { name: product.sellerEmail, department: '\u2014', year: '\u2014' };
  const pending = state.requests.some(function (r) {
    return r.productId === product.id && r.buyerEmail === currentUser.email && r.status === 'Pending';
  });

  let requestButton;
  if (mine) {
    requestButton = '<button type="button" class="btn btn-ghost" disabled>Your own listing</button>';
  } else if (sold) {
    requestButton = '<button type="button" class="btn btn-ghost" disabled>Item already sold</button>';
  } else if (pending) {
    requestButton = '<button type="button" class="btn btn-ghost" disabled>Request already pending</button>';
  } else {
    requestButton = '<button type="button" class="btn btn-success" data-action="send-request" data-id="' +
      esc(product.id) + '">\uD83D\uDCE6 Send Purchase Request</button>';
  }

  return '' +
  '<button type="button" class="back-link" data-view="browse">\u2190 Back to Marketplace</button>' +

  '<div class="details-layout">' +
    '<div class="details-media">' +
      '<img src="' + esc(product.image || '') + '" alt="' + esc(product.name) + '">' +
    '</div>' +

    '<div class="card">' +
      '<div class="product-meta">' +
        '<span class="pill ' + (sold ? 'pill-sold' : 'pill-available') + '">' +
          (sold ? 'Sold' : 'Available') + '</span>' +
        '<span class="pill pill-cat">' + esc(product.category) + '</span>' +
        '<span class="pill pill-condition">' + esc(product.condition) + '</span>' +
      '</div>' +
      '<h2 class="page-title mt-1">' + esc(product.name) + '</h2>' +
      '<div class="details-price">' + money(product.price) + '</div>' +

      '<div class="details-list">' +
        '<div class="details-row"><span>Category</span><span>' + esc(product.category) + '</span></div>' +
        '<div class="details-row"><span>Condition</span><span>' + esc(product.condition) + '</span></div>' +
        '<div class="details-row"><span>Listed on</span><span>' + esc(product.createdAt || '\u2014') + '</span></div>' +
        '<div class="details-row"><span>Availability</span><span>' +
          (sold ? 'Sold' : 'Available for purchase') + '</span></div>' +
      '</div>' +

      '<h3 class="card-title">Description</h3>' +
      '<p class="muted">' + esc(product.description) + '</p>' +

      '<div class="seller-box">' +
        '<span class="avatar">' + esc(initials(sellerProfile.name)) + '</span>' +
        '<div>' +
          '<div><strong>' + esc(sellerProfile.name) + '</strong></div>' +
          '<div class="small muted">' + esc(sellerProfile.department) + ' \u00B7 ' +
            esc(sellerProfile.year) + '</div>' +
          '<div class="small muted">Demo student account \u00B7 ' + esc(product.sellerEmail) + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="details-actions">' +
        (mine ? '' :
          '<button type="button" class="btn btn-primary" data-action="start-chat" data-id="' +
            esc(product.id) + '">\uD83D\uDCAC Chat with Seller</button>') +
        requestButton +
        '<button type="button" class="btn ' + (saved ? 'btn-danger-soft' : 'btn-ghost') +
          '" data-action="toggle-wishlist" data-id="' + esc(product.id) + '">' +
          (saved ? '\u2764\uFE0F Remove from Wishlist' : '\uD83E\uDD0D Add to Wishlist') + '</button>' +
        '<button type="button" class="btn btn-warn-soft" data-action="report-product" data-id="' +
          esc(product.id) + '">\uD83D\uDEA9 Report Listing</button>' +
      '</div>' +

      '<p class="small muted mt-2">Purchase requests and chat are frontend simulations. ' +
        'No payment is taken and no real message leaves this browser.</p>' +
    '</div>' +
  '</div>';
}

/* ==========================================================
   12. PAGE 4 — SELL ITEM / ADD LISTING
   ========================================================== */

function buildSellView() {
  const editing = editingProductId ? productById(editingProductId) : null;
  const draft = editing || {
    name: '', price: '', category: '', condition: 'Good', description: '', image: ''
  };

  return '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">' + (editing ? 'Edit Listing' : 'Sell an Item') + '</h2>' +
      '<p class="page-sub">' + (editing
        ? 'Update the details of your listing and save the changes.'
        : 'Post a textbook, notes, stationery or electronic item for other students.') + '</p>' +
    '</div>' +
  '</div>' +

  '<div class="card">' +
    '<form data-form="sell" novalidate>' +
      '<div class="form-grid">' +
        '<label class="field span-2">' +
          '<span class="field-label">Product name *</span>' +
          '<input type="text" id="sellName" value="' + esc(draft.name) +
            '" placeholder="e.g. Engineering Mathematics-III Textbook">' +
        '</label>' +

        '<label class="field">' +
          '<span class="field-label">Category *</span>' +
          '<select id="sellCategory">' +
            '<option value="">Select category</option>' +
            SAMPLE_CATEGORIES.map(function (cat) {
              return '<option' + (draft.category === cat ? ' selected' : '') + '>' + esc(cat) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +

        '<label class="field">' +
          '<span class="field-label">Condition *</span>' +
          '<select id="sellCondition">' +
            SAMPLE_CONDITIONS.map(function (cond) {
              return '<option' + (draft.condition === cond ? ' selected' : '') + '>' + esc(cond) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +

        '<label class="field">' +
          '<span class="field-label">Price (\u20B9) *</span>' +
          '<input type="number" id="sellPrice" min="1" step="1" value="' + esc(draft.price) +
            '" placeholder="e.g. 450">' +
          '<span class="field-hint">Enter a whole number in Indian rupees. Negative values are rejected.</span>' +
        '</label>' +

        '<label class="field">' +
          '<span class="field-label">Image URL (optional)</span>' +
          '<input type="url" id="sellImage" data-input="image-preview" value="' + esc(draft.image) +
            '" placeholder="https://example.com/photo.jpg">' +
          '<span class="field-hint">Leave blank to use a placeholder image.</span>' +
        '</label>' +

        '<label class="field span-2">' +
          '<span class="field-label">Description *</span>' +
          '<textarea id="sellDescription" placeholder="Mention the edition, condition, any damage and what is included.">' +
            esc(draft.description) + '</textarea>' +
        '</label>' +
      '</div>' +

      '<div class="seller-box">' +
        '<div class="list-row-thumb" id="imagePreviewBox">' +
          (draft.image ? '<img src="' + esc(draft.image) + '" alt="Image preview">'
                       : '<div class="img-fallback">\uD83D\uDDBC\uFE0F</div>') +
        '</div>' +
        '<div>' +
          '<div><strong>Image preview</strong></div>' +
          '<div class="small muted">This preview updates as you type an image URL.</div>' +
        '</div>' +
      '</div>' +

      '<p class="form-error hidden" id="sellError"></p>' +

      '<div class="form-actions">' +
        '<button type="submit" class="btn btn-primary">' +
          (editing ? '\uD83D\uDCBE Save Changes' : '\u2795 Post Item') + '</button>' +
        '<button type="button" class="btn btn-ghost" data-action="cancel-sell">Cancel</button>' +
        (editing ? '<button type="button" class="btn btn-danger-soft" data-action="delete-listing" data-id="' +
          esc(editing.id) + '">Delete this listing</button>' : '') +
      '</div>' +

      '<p class="small muted mt-2">You will be added as the seller automatically, ' +
        'and the listing is saved in this browser only.</p>' +
    '</form>' +
  '</div>';
}

/** Validate and save a listing (new or edited) */
function handleSellSubmit(event) {
  event.preventDefault();
  const errorBox = $('sellError');
  errorBox.classList.add('hidden');

  const name = $('sellName').value.trim();
  const category = $('sellCategory').value;
  const condition = $('sellCondition').value;
  const priceRaw = $('sellPrice').value.trim();
  const description = $('sellDescription').value.trim();
  const image = $('sellImage').value.trim();

  if (!name || !category || !condition || !priceRaw || !description) {
    errorBox.textContent = 'Please fill in the product name, category, condition, price and description.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (name.length < 3) {
    errorBox.textContent = 'The product name should be at least 3 characters long.';
    errorBox.classList.remove('hidden');
    return;
  }

  const price = Number(priceRaw);
  if (!isFinite(price) || price <= 0) {
    errorBox.textContent = 'Please enter a valid price greater than zero. Negative or zero prices are not allowed.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (price > 200000) {
    errorBox.textContent = 'That price looks unrealistic for a campus marketplace. Please enter a lower amount.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (image && !/^https?:\/\/.+/i.test(image)) {
    errorBox.textContent = 'The image URL must start with http:// or https://';
    errorBox.classList.remove('hidden');
    return;
  }

  if (editingProductId) {
    const product = productById(editingProductId);
    if (!product) {
      errorBox.textContent = 'This listing no longer exists.';
      errorBox.classList.remove('hidden');
      return;
    }
    product.name = name;
    product.category = category;
    product.condition = condition;
    product.price = price;
    product.description = description;
    product.image = image;
    logActivity('listing', nameOf(currentUser.email) + ' updated the listing "' + name + '".');
    toast('Listing updated successfully.', 'success');
    editingProductId = null;
    saveData();
    navigate('listings');
    return;
  }

  const newProduct = {
    id: uid('p'),
    name: name,
    price: price,
    category: category,
    condition: condition,
    description: description,
    sellerEmail: currentUser.email,
    image: image,
    status: 'available',
    createdAt: todayISO()
  };
  state.products.unshift(newProduct);
  logActivity('listing', nameOf(currentUser.email) + ' listed "' + name + '".');
  saveData();

  toast('Your listing "' + name + '" is now on the marketplace.', 'success');
  navigate('listings');
}

/* ==========================================================
   13. PAGE 5 — MY LISTINGS
   ========================================================== */

function buildListingsView() {
  const mine = state.products.filter(function (p) { return p.sellerEmail === currentUser.email; });

  const header = '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">My Listings</h2>' +
      '<p class="page-sub">Items you have posted. You can edit them, mark them as sold or delete them.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-primary" data-view="sell">\u2795 Sell an item</button>' +
  '</div>';

  if (!mine.length) {
    return header + emptyState('\uD83C\uDFF7\uFE0F', 'You have no listings yet',
      'Post your first item and it will appear here and on the marketplace.',
      '<button type="button" class="btn btn-primary" data-view="sell">Sell your first item</button>');
  }

  const rows = mine.map(function (p) {
    const sold = p.status === 'sold';
    const requests = state.requests.filter(function (r) { return r.productId === p.id; }).length;
    return '' +
    '<div class="list-row">' +
      '<div class="list-row-thumb">' +
        (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '">'
                 : '<div class="img-fallback">\uD83D\uDDBC\uFE0F</div>') +
      '</div>' +
      '<div class="list-row-main">' +
        '<p class="list-row-title">' + esc(p.name) + '</p>' +
        '<div class="list-row-sub">' + money(p.price) + ' \u00B7 ' + esc(p.category) + ' \u00B7 ' +
          esc(p.condition) + ' \u00B7 ' + requests + ' request(s)</div>' +
        '<div class="mt-1"><span class="pill ' + (sold ? 'pill-sold' : 'pill-available') + '">' +
          (sold ? 'Sold' : 'Available') + '</span></div>' +
      '</div>' +
      '<div class="list-row-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="open-product" data-id="' +
          esc(p.id) + '">View</button>' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="edit-listing" data-id="' +
          esc(p.id) + '">\u270F\uFE0F Edit</button>' +
        (sold ? '<button type="button" class="btn btn-ghost btn-sm" data-action="mark-available" data-id="' +
                  esc(p.id) + '">Mark Available</button>'
              : '<button type="button" class="btn btn-success-soft btn-sm" data-action="mark-sold" data-id="' +
                  esc(p.id) + '">\u2714 Mark as Sold</button>') +
        '<button type="button" class="btn btn-danger-soft btn-sm" data-action="delete-listing" data-id="' +
          esc(p.id) + '">\uD83D\uDDD1\uFE0F Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');

  return header +
    '<div class="stat-grid mt-2">' +
      '<div class="stat-card accent"><div class="stat-value">' + mine.length +
        '</div><div class="stat-label">Your total listings</div></div>' +
      '<div class="stat-card"><div class="stat-value">' +
        mine.filter(function (p) { return p.status === 'available'; }).length +
        '</div><div class="stat-label">Still available</div></div>' +
      '<div class="stat-card"><div class="stat-value">' +
        mine.filter(function (p) { return p.status === 'sold'; }).length +
        '</div><div class="stat-label">Sold</div></div>' +
      '<div class="stat-card"><div class="stat-value">' +
        state.requests.filter(function (r) { return r.sellerEmail === currentUser.email; }).length +
        '</div><div class="stat-label">Requests received</div></div>' +
    '</div>' +
    '<div class="list-stack mt-2">' + rows + '</div>';
}

/** Remove a listing and tidy up everything that points at it */
function removeProduct(productId, reason) {
  const product = productById(productId);
  if (!product) return;

  state.products = state.products.filter(function (p) { return p.id !== productId; });
  state.wishlist = state.wishlist.filter(function (w) { return w.productId !== productId; });

  state.requests.forEach(function (r) {
    if (r.productId === productId && (r.status === 'Pending' || r.status === 'Accepted')) {
      r.status = 'Cancelled';
    }
  });

  state.conversations.forEach(function (c) {
    if (c.productId === productId) c.productId = null;
  });

  logActivity('listing', 'Listing "' + product.name + '" was removed' + (reason ? ' (' + reason + ')' : '') + '.');
  saveData();
}

/** Delete one of my own listings (with confirmation) */
function deleteMyListing(productId) {
  const product = productById(productId);
  if (!product) return;
  askConfirm('Delete this listing?',
    'This will permanently remove "' + product.name + '" from the marketplace. Related requests will be cancelled.',
    'Delete listing', function () {
      removeProduct(productId, 'deleted by the seller');
      toast('Listing deleted.', 'success');
      renderCurrentView();
    });
}

/** Mark a listing as sold or available again */
function setProductStatus(productId, status) {
  const product = productById(productId);
  if (!product) return;
  product.status = status;

  if (status === 'sold') {
    logActivity('sold', nameOf(currentUser.email) + ' marked "' + product.name + '" as sold.');
    // Let anyone with a pending request know the item is gone.
    state.requests.forEach(function (r) {
      if (r.productId === productId && r.status === 'Pending' && r.buyerEmail !== currentUser.email) {
        addNotification(r.buyerEmail, 'sold', 'Listing marked as sold',
          '"' + product.name + '" has been marked as sold by the seller.', 'requests');
      }
    });
    toast('"' + product.name + '" is now marked as sold.', 'success');
  } else {
    logActivity('listing', nameOf(currentUser.email) + ' marked "' + product.name + '" as available again.');
    toast('"' + product.name + '" is available again.', 'success');
  }
  saveData();
  renderCurrentView();
}
/* ==========================================================
   MIT Campus Exchange Hub — script.js   [PART 3 of 4]
   ----------------------------------------------------------
   Chat, purchase requests, wishlist, profile, reports,
   notifications and the Technical Details page.
   ========================================================== */

/* ==========================================================
   14. PAGE 6 — IN-APP CHAT (simulated)
   ========================================================== */

/** Conversations the current user takes part in */
function myConversations() {
  if (!currentUser) return [];
  return state.conversations.filter(function (c) { return c.withEmail !== currentUser.email; });
}

/** The conversation object for a given partner, created if needed */
function ensureConversation(withEmail, productId) {
  let conv = state.conversations.find(function (c) {
    return c.withEmail === withEmail && c.productId === (productId || null);
  });
  if (!conv) {
    conv = {
      id: uid('c'),
      withEmail: withEmail,
      productId: productId || null,
      messages: []
    };
    state.conversations.unshift(conv);
  }
  return conv;
}

function buildChatsView() {
  const conversations = myConversations();

  const header = '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">My Chats</h2>' +
      '<p class="page-sub">Simulated conversations with other demo students. Nothing leaves this browser.</p>' +
    '</div>' +
  '</div>';

  if (!conversations.length) {
    return header + emptyState('\uD83D\uDCAC', 'No conversations yet',
      'Open any product and choose "Chat with Seller" to start a conversation.',
      '<button type="button" class="btn btn-primary" data-view="browse">Browse Items</button>');
  }

  let active = conversationById(activeConversationId);
  if (!active || active.withEmail === currentUser.email) {
    active = conversations[0];
    activeConversationId = active.id;
  }

  const sidebar = conversations.map(function (c) {
    const last = c.messages[c.messages.length - 1];
    const product = c.productId ? productById(c.productId) : null;
    return '' +
    '<button type="button" class="conv-item' + (c.id === active.id ? ' active' : '') +
      '" data-action="open-conversation" data-id="' + esc(c.id) + '">' +
      '<div class="conv-name">' + esc(nameOf(c.withEmail)) + '</div>' +
      '<div class="conv-product">' + esc(product ? product.name : 'Listing no longer available') + '</div>' +
      '<div class="conv-preview">' + esc(last ? (last.from === currentUser.email ? 'You: ' : '') + last.text : 'No messages yet') +
      '</div>' +
    '</button>';
  }).join('');

  const product = active.productId ? productById(active.productId) : null;
  const bubbles = active.messages.length
    ? active.messages.map(function (m) {
        const mine = m.from === currentUser.email;
        return '<div class="msg ' + (mine ? 'msg-me' : 'msg-them') + '">' +
          esc(m.text) +
          '<span class="msg-time">' + esc(m.time) + (mine ? ' \u00B7 you' : ' \u00B7 ' + esc(nameOf(m.from))) +
          '</span></div>';
      }).join('')
    : '<p class="muted small center">No messages in this conversation yet. Say hello \uD83D\uDC4B</p>';

  return header +
  '<div class="chat-layout">' +
    '<div class="chat-sidebar">' +
      '<div class="chat-sidebar-head">Conversations (' + conversations.length + ')</div>' +
      sidebar +
    '</div>' +
    '<div class="chat-panel">' +
      '<div class="chat-head">' +
        '<div>' +
          '<div class="chat-head-title">' + esc(nameOf(active.withEmail)) + '</div>' +
          '<div class="small muted">' +
            (product ? 'About: ' + esc(product.name) : 'General enquiry') + '</div>' +
        '</div>' +
        '<div class="row-actions">' +
          (product ? '<button type="button" class="btn btn-ghost btn-sm" data-action="open-product" data-id="' +
            esc(product.id) + '">View item</button>' : '') +
          '<button type="button" class="btn btn-warn-soft btn-sm" data-action="report-user" data-id="' +
            esc(active.withEmail) + '">\uD83D\uDEA9 Report User</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-body" id="chatBody">' + bubbles + '</div>' +
      '<form class="chat-input" data-form="chat">' +
        '<input type="text" id="chatInput" placeholder="Type a message\u2026" autocomplete="off">' +
        '<button type="submit" class="btn btn-primary">Send</button>' +
      '</form>' +
    '</div>' +
  '</div>' +

  '<p class="small muted mt-2">This is a frontend chat simulation for the prototype. ' +
    'Messages are stored in this browser only \u2014 they are not delivered to another device or user.</p>';
}

/** Scroll the chat panel to the newest message */
function scrollChatToBottom() {
  const body = $('chatBody');
  if (body) body.scrollTop = body.scrollHeight;
}

/** Send a chat message */
function handleChatSubmit(event) {
  event.preventDefault();
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text) {
    toast('Please type a message before sending.', 'error');
    return;
  }
  const conv = conversationById(activeConversationId);
  if (!conv) return;

  conv.messages.push({
    id: uid('m'),
    from: currentUser.email,
    text: text,
    time: clockLabel()
  });
  input.value = '';

  // The other participant receives a simulated notification.
  addNotification(conv.withEmail, 'message', 'New chat message',
    nameOf(currentUser.email) + ' sent you a message about "' +
    (conv.productId && productById(conv.productId) ? productById(conv.productId).name : 'your listing') + '".',
    'chats');

  saveData();
  renderCurrentView();
  scrollChatToBottom();
}

/** Start (or reopen) a conversation about a product from its details page */
function startChatWithSeller(productId) {
  const product = productById(productId);
  if (!product) return;
  if (product.sellerEmail === currentUser.email) {
    toast('This is your own listing, so there is nobody to chat with.', 'error');
    return;
  }
  const conv = ensureConversation(product.sellerEmail, productId);
  activeConversationId = conv.id;
  saveData();
  navigate('chats');
  toast('Conversation opened with ' + nameOf(product.sellerEmail) + '.', 'success');
}

/* ==========================================================
   15. PAGE 7 — PURCHASE REQUESTS (simulated)
   ========================================================== */

const REQUEST_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'];

/** Requests sent by the current user */
function sentRequests() {
  return state.requests.filter(function (r) { return r.buyerEmail === currentUser.email; });
}

/** Requests received by the current user (as a seller) */
function receivedRequests() {
  return state.requests.filter(function (r) { return r.sellerEmail === currentUser.email; });
}

function statusPill(status) {
  return '<span class="pill pill-' + String(status).toLowerCase().replace(/\s+/g, '-') + '">' +
    esc(status) + '</span>';
}

function buildRequestsView() {
  const sent = sentRequests();
  const received = receivedRequests();
  const list = requestTab === 'sent' ? sent : received;

  const header = '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">Purchase Requests</h2>' +
      '<p class="page-sub">Simulated buy requests between demo accounts. No payment is involved.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-ghost" data-view="browse">Browse Items</button>' +
  '</div>' +

  '<div class="tabs">' +
    '<button type="button" class="tab' + (requestTab === 'sent' ? ' active' : '') +
      '" data-action="request-tab" data-id="sent">Sent Requests (' + sent.length + ')</button>' +
    '<button type="button" class="tab' + (requestTab === 'received' ? ' active' : '') +
      '" data-action="request-tab" data-id="received">Received Requests (' + received.length + ')</button>' +
  '</div>';

  if (!list.length) {
    return header + emptyState('\uD83D\uDCE6',
      requestTab === 'sent' ? 'You have not sent any requests' : 'No requests received yet',
      requestTab === 'sent'
        ? 'Open a product and choose "Send Purchase Request" to ask the seller.'
        : 'When a student asks to buy one of your items, the request appears here.',
      '<button type="button" class="btn btn-primary" data-view="browse">Browse Items</button>');
  }

  const rows = list.map(function (r) {
    const product = productById(r.productId);
    const isBuyer = r.buyerEmail === currentUser.email;
    const actions = [];

    if (isBuyer && r.status === 'Pending') {
      actions.push('<button type="button" class="btn btn-danger-soft btn-sm" data-action="cancel-request" data-id="' +
        esc(r.id) + '">Cancel</button>');
    }
    if (!isBuyer && r.status === 'Pending') {
      actions.push('<button type="button" class="btn btn-success-soft btn-sm" data-action="accept-request" data-id="' +
        esc(r.id) + '">Accept</button>');
      actions.push('<button type="button" class="btn btn-danger-soft btn-sm" data-action="reject-request" data-id="' +
        esc(r.id) + '">Reject</button>');
    }
    if (isBuyer && r.status === 'Accepted') {
      actions.push('<button type="button" class="btn btn-primary btn-sm" data-action="complete-request" data-id="' +
        esc(r.id) + '">Mark Completed</button>');
    }
    if (!actions.length) {
      actions.push('<span class="small muted">No action needed</span>');
    }

    return '' +
    '<div class="list-row">' +
      '<div class="list-row-thumb">' +
        (product && product.image
          ? '<img src="' + esc(product.image) + '" alt="' + esc(product.name) + '">'
          : '<div class="img-fallback">\uD83D\uDDBC\uFE0F</div>') +
      '</div>' +
      '<div class="list-row-main">' +
        '<p class="list-row-title">' + esc(product ? product.name : 'Listing removed') + '</p>' +
        '<div class="list-row-sub">' +
          (product ? money(product.price) + ' \u00B7 ' : '') +
          'Buyer: ' + esc(nameOf(r.buyerEmail)) + ' \u00B7 Seller: ' + esc(nameOf(r.sellerEmail)) +
        '</div>' +
        '<div class="list-row-sub">Requested on ' + esc(r.date) + '</div>' +
        '<div class="mt-1">' + statusPill(r.status) + '</div>' +
      '</div>' +
      '<div class="list-row-actions">' +
        (product ? '<button type="button" class="btn btn-ghost btn-sm" data-action="open-product" data-id="' +
          esc(product.id) + '">View item</button>' : '') +
        actions.join('') +
      '</div>' +
    '</div>';
  }).join('');

  return header +
    '<div class="stat-grid mt-2">' +
      '<div class="stat-card accent"><div class="stat-value">' + sent.length +
        '</div><div class="stat-label">Sent by you</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + received.length +
        '</div><div class="stat-label">Received</div></div>' +
      '<div class="stat-card"><div class="stat-value">' +
        state.requests.filter(function (r) {
          return (r.buyerEmail === currentUser.email || r.sellerEmail === currentUser.email) &&
            r.status === 'Pending';
        }).length + '</div><div class="stat-label">Pending action</div></div>' +
      '<div class="stat-card"><div class="stat-value">' +
        state.requests.filter(function (r) {
          return (r.buyerEmail === currentUser.email || r.sellerEmail === currentUser.email) &&
            r.status === 'Completed';
        }).length + '</div><div class="stat-label">Completed</div></div>' +
    '</div>' +
    '<div class="list-stack mt-2">' + rows + '</div>' +
    '<p class="small muted mt-2">Status flow used by the prototype: Pending \u2192 Accepted \u2192 Completed, ' +
      'or Pending \u2192 Rejected / Cancelled.</p>';
}

/** Send a purchase request for a product */
function sendPurchaseRequest(productId) {
  const product = productById(productId);
  if (!product) {
    toast('That listing no longer exists.', 'error');
    return;
  }
  if (product.sellerEmail === currentUser.email) {
    toast('You cannot send a purchase request for your own listing.', 'error');
    return;
  }
  if (product.status === 'sold') {
    toast('This item is already sold, so new requests are not accepted.', 'error');
    return;
  }
  const duplicate = state.requests.some(function (r) {
    return r.productId === productId && r.buyerEmail === currentUser.email && r.status === 'Pending';
  });
  if (duplicate) {
    toast('You already have a pending request for this item.', 'error');
    return;
  }

  state.requests.unshift({
    id: uid('r'),
    productId: productId,
    buyerEmail: currentUser.email,
    sellerEmail: product.sellerEmail,
    date: nowLabel().split(',')[0],
    status: 'Pending'
  });

  addNotification(product.sellerEmail, 'request', 'New purchase request',
    nameOf(currentUser.email) + ' wants to buy your "' + product.name + '".', 'requests');
  logActivity('request', nameOf(currentUser.email) + ' sent a purchase request for "' + product.name + '".');
  saveData();

  toast('Purchase request sent to ' + nameOf(product.sellerEmail) + '.', 'success');
  renderCurrentView();
}

/** Change the status of a purchase request */
function updateRequestStatus(requestId, status) {
  const request = state.requests.find(function (r) { return r.id === requestId; });
  if (!request) return;
  const product = productById(request.productId);
  const productName = product ? product.name : 'the listing';

  request.status = status;

  if (status === 'Accepted') {
    addNotification(request.buyerEmail, 'request', 'Purchase request accepted',
      nameOf(currentUser.email) + ' accepted your request for "' + productName + '".', 'requests');
    logActivity('request', nameOf(currentUser.email) + ' accepted a request for "' + productName + '".');
    toast('Request accepted.', 'success');
  } else if (status === 'Rejected') {
    addNotification(request.buyerEmail, 'request', 'Purchase request rejected',
      nameOf(currentUser.email) + ' rejected your request for "' + productName + '".', 'requests');
    logActivity('request', nameOf(currentUser.email) + ' rejected a request for "' + productName + '".');
    toast('Request rejected.', 'info');
  } else if (status === 'Cancelled') {
    addNotification(request.sellerEmail, 'request', 'Purchase request cancelled',
      nameOf(currentUser.email) + ' cancelled their request for "' + productName + '".', 'requests');
    toast('Request cancelled.', 'info');
  } else if (status === 'Completed') {
    addNotification(request.sellerEmail, 'request', 'Purchase request completed',
      nameOf(currentUser.email) + ' marked the deal for "' + productName + '" as completed.', 'requests');
    logActivity('request', 'A request for "' + productName + '" was marked as completed.');
    toast('Request marked as completed.', 'success');
  }

  saveData();
  renderCurrentView();
}

/* ==========================================================
   16. PAGE 8 — WISHLIST
   ========================================================== */

function buildWishlistView() {
  const savedItems = myWishlistProducts();

  const header = '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">My Wishlist</h2>' +
      '<p class="page-sub">Items you saved to look at again later.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-ghost" data-view="browse">Browse Items</button>' +
  '</div>';

  if (!savedItems.length) {
    return header + emptyState('\u2764\uFE0F', 'Your wishlist is empty',
      'Tap the wishlist button on any product card to save it here.',
      '<button type="button" class="btn btn-primary" data-view="browse">Find something to save</button>');
  }

  const rows = savedItems.map(function (p) {
    const sold = p.status === 'sold';
    return '' +
    '<div class="list-row">' +
      '<div class="list-row-thumb">' +
        (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '">'
                 : '<div class="img-fallback">\uD83D\uDDBC\uFE0F</div>') +
      '</div>' +
      '<div class="list-row-main">' +
        '<p class="list-row-title">' + esc(p.name) + '</p>' +
        '<div class="list-row-sub">' + money(p.price) + ' \u00B7 ' + esc(p.category) +
          ' \u00B7 Sold by ' + esc(nameOf(p.sellerEmail)) + '</div>' +
        '<div class="mt-1"><span class="pill ' + (sold ? 'pill-sold' : 'pill-available') + '">' +
          (sold ? 'Sold \u2014 no longer available' : 'Still available') + '</span></div>' +
      '</div>' +
      '<div class="list-row-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="open-product" data-id="' +
          esc(p.id) + '">View Details</button>' +
        '<button type="button" class="btn btn-danger-soft btn-sm" data-action="toggle-wishlist" data-id="' +
          esc(p.id) + '">Remove</button>' +
      '</div>' +
    '</div>';
  }).join('');

  return header +
    '<p class="muted small">' + savedItems.length + ' saved item(s).</p>' +
    '<div class="list-stack">' + rows + '</div>';
}

/** Add or remove a product from the wishlist */
function toggleWishlist(productId) {
  const product = productById(productId);
  if (!product) {
    toast('That listing no longer exists.', 'error');
    return;
  }
  const index = state.wishlist.findIndex(function (w) {
    return w.email === currentUser.email && w.productId === productId;
  });

  if (index === -1) {
    state.wishlist.push({ email: currentUser.email, productId: productId });
    toast('Added "' + product.name + '" to your wishlist.', 'success');
  } else {
    state.wishlist.splice(index, 1);
    toast('Removed "' + product.name + '" from your wishlist.', 'info');
  }
  saveData();
  renderCurrentView();
}

/* ==========================================================
   17. PAGE 9 — STUDENT PROFILE
   ========================================================== */

function buildProfileView() {
  const profile = state.profiles[currentUser.email] || { name: currentUser.email, department: '\u2014', year: '\u2014' };
  const mine = state.products.filter(function (p) { return p.sellerEmail === currentUser.email; });
  const requests = sentRequests().length + receivedRequests().length;

  return '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">My Profile</h2>' +
      '<p class="page-sub">Demo account details. Nothing here is verified by the university.</p>' +
    '</div>' +
  '</div>' +

  '<div class="card">' +
    '<div class="seller-box" style="background:#f7f9ff">' +
      '<span class="avatar lg">' + esc(initials(profile.name)) + '</span>' +
      '<div>' +
        '<h3 class="card-title">' + esc(profile.name) + '</h3>' +
        '<div class="small muted">' + esc(currentUser.email) + '</div>' +
        '<div class="small muted">' + esc(profile.department) + ' \u00B7 ' + esc(profile.year) + '</div>' +
        '<div class="mt-1"><span class="pill ' + (currentUser.role === 'admin' ? 'pill-under-review' : 'pill-active') +
          '">' + (currentUser.role === 'admin' ? 'Admin demo account' : 'Active student account') + '</span></div>' +
      '</div>' +
    '</div>' +

    '<h3 class="section-title">Edit profile details</h3>' +
    '<form data-form="profile" novalidate>' +
      '<div class="form-grid">' +
        '<label class="field">' +
          '<span class="field-label">Student name</span>' +
          '<input type="text" id="profileName" value="' + esc(profile.name) + '">' +
        '</label>' +
        '<label class="field">' +
          '<span class="field-label">Email (fixed for the demo)</span>' +
          '<input type="text" value="' + esc(currentUser.email) + '" disabled>' +
        '</label>' +
        '<label class="field">' +
          '<span class="field-label">Department</span>' +
          '<input type="text" id="profileDepartment" value="' + esc(profile.department) + '">' +
        '</label>' +
        '<label class="field">' +
          '<span class="field-label">Year of study</span>' +
          '<select id="profileYear">' +
            ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni'].map(function (y) {
              return '<option' + (profile.year === y ? ' selected' : '') + '>' + esc(y) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
      '</div>' +
      '<p class="form-error hidden" id="profileError"></p>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn-primary">\uD83D\uDCBE Save Profile</button>' +
        '<button type="button" class="btn btn-ghost" data-view="listings">\uD83C\uDFF7\uFE0F My Listings (' + mine.length + ')</button>' +
        '<button type="button" class="btn btn-ghost" data-view="requests">\uD83D\uDCE6 Purchase Requests (' + requests + ')</button>' +
        '<button type="button" class="btn btn-ghost" data-view="wishlist">\u2764\uFE0F Wishlist (' + myWishlistProducts().length + ')</button>' +
        '<button type="button" class="btn btn-danger" data-action="logout">\u23FB Logout</button>' +
      '</div>' +
    '</form>' +

    '<p class="small muted mt-2">Profile details are stored in this browser only and are not checked against ' +
      'any university record.</p>' +
  '</div>';
}

/** Save the profile form */
function handleProfileSubmit(event) {
  event.preventDefault();
  const errorBox = $('profileError');
  const name = $('profileName').value.trim();
  const department = $('profileDepartment').value.trim();
  const year = $('profileYear').value;

  errorBox.classList.add('hidden');
  if (name.length < 3) {
    errorBox.textContent = 'Please enter a name of at least 3 characters.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (!department) {
    errorBox.textContent = 'Please enter your department.';
    errorBox.classList.remove('hidden');
    return;
  }

  state.profiles[currentUser.email] = { name: name, department: department, year: year };
  saveData();
  showStudentShell();
  renderCurrentView();
  toast('Profile updated.', 'success');
}

/* ==========================================================
   18. PAGE 10 — REPORT USER / LISTING
   ========================================================== */

/** Small view: a list of my own reports, shown under the form */
function myReportsHtml() {
  const mine = state.reports.filter(function (r) { return r.reporterEmail === currentUser.email; });
  if (!mine.length) {
    return '<p class="small muted">You have not submitted any reports yet.</p>';
  }
  return '<div class="list-stack">' + mine.map(function (r) {
    return '<div class="list-row">' +
      '<div class="list-row-main">' +
        '<p class="list-row-title">' + esc(r.type) + ': ' + esc(r.targetLabel) + '</p>' +
        '<div class="list-row-sub">Reason: ' + esc(r.reason) + '</div>' +
        '<div class="list-row-sub">Submitted on ' + esc(r.date) + '</div>' +
      '</div>' +
      '<div>' + statusPill(r.status) + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

function buildReportView(params) {
  // params may be "product:p1" or "user:priya@demo.edu"
  let reportType = 'Product';
  let targetId = '';
  if (params && params.indexOf(':') !== -1) {
    const parts = params.split(':');
    reportType = parts[0] === 'user' ? 'User' : 'Product';
    targetId = parts.slice(1).join(':');
  }

  const productOptions = state.products.map(function (p) {
    return '<option value="' + esc(p.id) + '"' + (reportType === 'Product' && targetId === p.id ? ' selected' : '') +
      '>' + esc(p.name) + ' \u2014 ' + esc(nameOf(p.sellerEmail)) + '</option>';
  }).join('');

  const userOptions = state.users.map(function (u) {
    return '<option value="' + esc(u.email) + '"' + (reportType === 'User' && targetId === u.email ? ' selected' : '') +
      '>' + esc(nameOf(u.email)) + ' (' + esc(u.email) + ')</option>';
  }).join('');

  return '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">Report a Listing or a User</h2>' +
      '<p class="page-sub">Reports are stored in this browser and appear in the admin dashboard for review.</p>' +
    '</div>' +
  '</div>' +

  '<div class="card">' +
    '<form data-form="report" novalidate>' +
      '<div class="form-grid">' +
        '<label class="field">' +
          '<span class="field-label">Report type *</span>' +
          '<select id="reportType" data-input="report-type">' +
            '<option value="Product"' + (reportType === 'Product' ? ' selected' : '') + '>Product (listing)</option>' +
            '<option value="User"' + (reportType === 'User' ? ' selected' : '') + '>User (student)</option>' +
          '</select>' +
        '</label>' +

        '<label class="field" id="reportTargetProductField">' +
          '<span class="field-label">Select product *</span>' +
          '<select id="reportProduct">' + productOptions + '</select>' +
        '</label>' +

        '<label class="field hidden" id="reportTargetUserField">' +
          '<span class="field-label">Select user *</span>' +
          '<select id="reportUser">' + userOptions + '</select>' +
        '</label>' +

        '<label class="field">' +
          '<span class="field-label">Reason *</span>' +
          '<select id="reportReason">' +
            '<option value="">Select a reason</option>' +
            SAMPLE_REPORT_REASONS.map(function (reason) {
              return '<option>' + esc(reason) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +

        '<label class="field span-2">' +
          '<span class="field-label">Additional description</span>' +
          '<textarea id="reportDescription" placeholder="Explain what looked wrong. This helps the admin review the report."></textarea>' +
        '</label>' +
      '</div>' +

      '<p class="form-error hidden" id="reportError"></p>' +

      '<div class="form-actions">' +
        '<button type="submit" class="btn btn-primary">\uD83D\uDEA9 Submit Report</button>' +
        '<button type="button" class="btn btn-ghost" data-action="cancel-report">Cancel</button>' +
      '</div>' +
    '</form>' +
  '</div>' +

  '<h3 class="section-title">My submitted reports</h3>' +
  '<div class="card">' + myReportsHtml() + '</div>';
}

/** Submit the report form */
function handleReportSubmit(event) {
  event.preventDefault();
  const errorBox = $('reportError');
  const type = $('reportType').value;
  const reason = $('reportReason').value;
  const description = $('reportDescription').value.trim();

  errorBox.classList.add('hidden');

  if (!reason) {
    errorBox.textContent = 'Please choose a reason for the report.';
    errorBox.classList.remove('hidden');
    return;
  }

  let targetId = '';
  let targetLabel = '';
  if (type === 'Product') {
    targetId = $('reportProduct').value;
    const product = productById(targetId);
    if (!product) {
      errorBox.textContent = 'Please select a product to report.';
      errorBox.classList.remove('hidden');
      return;
    }
    targetLabel = product.name;
  } else {
    targetId = $('reportUser').value;
    if (!targetId) {
      errorBox.textContent = 'Please select a user to report.';
      errorBox.classList.remove('hidden');
      return;
    }
    if (targetId === currentUser.email) {
      errorBox.textContent = 'You cannot report your own demo account.';
      errorBox.classList.remove('hidden');
      return;
    }
    targetLabel = nameOf(targetId);
  }

  const duplicate = state.reports.some(function (r) {
    return r.type === type && r.targetId === targetId &&
      r.reporterEmail === currentUser.email && r.status === 'Pending';
  });
  if (duplicate) {
    errorBox.textContent = 'You already have a pending report for this ' + type.toLowerCase() + '.';
    errorBox.classList.remove('hidden');
    return;
  }

  state.reports.unshift({
    id: uid('rep'),
    type: type,
    targetId: targetId,
    targetLabel: targetLabel,
    reporterEmail: currentUser.email,
    reason: reason,
    description: description || 'No extra description was given.',
    date: nowLabel().split(',')[0],
    status: 'Pending'
  });

  logActivity('report', nameOf(currentUser.email) + ' reported ' + type.toLowerCase() + ' "' + targetLabel + '".');
  addNotification('admin@demo.edu', 'report', 'New report submitted',
    type + ' "' + targetLabel + '" was reported as "' + reason + '".', 'admin');
  saveData();

  toast('Report submitted. An admin can review it in the dashboard.', 'success');
  navigate('report');
}

/* ==========================================================
   19. PAGE 12 — NOTIFICATIONS
   ========================================================== */

const NOTIF_ICONS = {
  request: '\uD83D\uDCE6',
  message: '\uD83D\uDCAC',
  sold: '\u2714\uFE0F',
  report: '\uD83D\uDEA9',
  listing: '\uD83C\uDFF7\uFE0F'
};

function buildNotificationsView() {
  const list = myNotifications();
  const unread = list.filter(function (n) { return !n.read; }).length;

  const header = '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">Notifications</h2>' +
      '<p class="page-sub">' + unread + ' unread of ' + list.length +
        ' \u00B7 these are in-app prototype notifications, not real push messages.</p>' +
    '</div>' +
    (list.length
      ? '<button type="button" class="btn btn-ghost" data-action="mark-all-read">Mark all as read</button>'
      : '') +
  '</div>';

  if (!list.length) {
    return header + emptyState('\uD83D\uDD14', 'No notifications yet',
      'Purchase requests, chat messages and report updates will appear here.',
      '<button type="button" class="btn btn-primary" data-view="browse">Browse Items</button>');
  }

  const items = list.map(function (n) {
    return '' +
    '<button type="button" class="notif' + (n.read ? '' : ' unread') + '" data-action="open-notification" data-id="' +
      esc(n.id) + '">' +
      '<span class="notif-icon" aria-hidden="true">' + (NOTIF_ICONS[n.type] || '\uD83D\uDD14') + '</span>' +
      '<span style="flex:1;min-width:0">' +
        '<span class="notif-title">' + esc(n.title) + '</span>' +
        '<span class="notif-msg">' + esc(n.message) + '</span>' +
        '<span class="notif-time">' + esc(n.time) + '</span>' +
      '</span>' +
      (n.read ? '' : '<span class="notif-dot" aria-hidden="true"></span>') +
    '</button>';
  }).join('');

  return header + '<div class="notif-list">' + items + '</div>';
}

/** Open a notification, mark it read and follow its link */
function openNotification(notificationId) {
  const notification = state.notifications.find(function (n) { return n.id === notificationId; });
  if (!notification) return;
  notification.read = true;
  saveData();

  const link = notification.link;
  if (link === 'admin') {
    toast('This report is waiting in the admin dashboard.', 'info');
    renderCurrentView();
    return;
  }
  navigate(VIEW_IDS[link] ? link : 'home');
}

/** Mark every notification of the current user as read */
function markAllRead() {
  myNotifications().forEach(function (n) { n.read = true; });
  saveData();
  renderCurrentView();
  toast('All notifications marked as read.', 'success');
}

/* ==========================================================
   20. PAGE 13 — TECHNICAL DETAILS
   ========================================================== */

function buildTechView() {
  const rows = [
    ['Frontend', 'HTML5 for the page structure, CSS3 for styling and layout, and vanilla JavaScript (ES6+) for all logic. No framework is used.'],
    ['Backend', 'There is no backend server. Every piece of logic runs inside your browser tab.'],
    ['Database', 'No database is used. The starting data lives in JavaScript objects and arrays inside data.js, and selected changes are kept in the browser\u2019s localStorage.'],
    ['External APIs', 'No external APIs are used \u2014 no payment gateway, no maps, no AI service and no messaging service.'],
    ['Authentication', 'Login is simulated in JavaScript for the demonstration. It does not verify a real MIT ADT University account.'],
    ['Chat and purchase requests', 'Both are frontend simulations. Messages and requests are saved in this browser only, so they are not delivered to another device, browser or person, and no money changes hands.'],
    ['Roles', 'The admin dashboard is reached by logging in with the demo admin account. Because everything runs in the browser, this role check is a demonstration only and is not production-grade security.'],
    ['localStorage limits', 'Data is specific to this browser and this device. Clearing browser data or using another browser starts from the sample data again. It is not a real database and is not shared between devices.'],
    ['Icons and images', 'Icons are Unicode characters and inline SVG. Product photos are ordinary image URLs with a placeholder fallback.']
  ];

  const future = [
    'University email verification for real students.',
    'A backend server with a proper database.',
    'Secure authentication and authorization with hashed passwords.',
    'Real-time chat between devices.',
    'Real notifications instead of in-app messages.',
    'Secure image uploads instead of image URLs.',
    'Better moderation tools and a proper report workflow.',
    'Public deployment on a hosting service.'
  ];

  return '' +
  '<div class="page-head">' +
    '<div>' +
      '<h2 class="page-title">Technical Details</h2>' +
      '<p class="page-sub">A short, plain-language summary of how this prototype is built \u2014 useful for the jury.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-ghost" data-action="reset-demo">\u21BB Reset Demo Data</button>' +
  '</div>' +

  '<div class="table-wrap">' +
    '<table>' +
      '<thead><tr><th style="width:190px">Topic</th><th>Explanation</th></tr></thead>' +
      '<tbody>' + rows.map(function (row) {
        return '<tr><td><strong>' + esc(row[0]) + '</strong></td><td>' + esc(row[1]) + '</td></tr>';
      }).join('') + '</tbody>' +
    '</table>' +
  '</div>' +

  '<h3 class="section-title">Future scope</h3>' +
  '<div class="card"><ul style="margin:0;padding-left:20px">' +
    future.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') +
  '</ul></div>' +

  '<h3 class="section-title">How the demo data is stored</h3>' +
  '<div class="card">' +
    '<p class="muted">On the first visit the app copies the sample data from <code>data.js</code> into ' +
      'localStorage under the key <code>' + esc(DATA_KEY) + '</code>. Every change you make ' +
      '(new listing, wishlist item, chat message, request, report, notification read status) is written back ' +
      'to that key, so it survives a page reload.</p>' +
    '<p class="muted">If the saved data is missing or damaged, the app simply falls back to the original sample ' +
      'data instead of breaking. The <strong>Reset Demo Data</strong> button clears everything and restores the ' +
      'original sample data so the presentation can start fresh.</p>' +
  '</div>' +

  '<p class="small muted mt-2">This project is a college Problem-Based Learning prototype. ' +
    'It is not affiliated with, or verified by, MIT ADT University.</p>';
}

/** Reset all prototype data back to the sample data */
function resetDemoData() {
  askConfirm('Reset all demo data?',
    'Every listing, request, chat message, report and notification will be replaced by the original sample data. ' +
    'You will be logged out.',
    'Reset data', function () {
      state = seedData();
      saveData();
      clearSession();
      currentUser = null;
      editingProductId = null;
      activeConversationId = null;
      $('loginEmail').value = '';
      $('loginPassword').value = '';
      showAuthScreen();
      toast('Demo data has been reset to the original sample data.', 'success');
    });
}
/* ==========================================================
   MIT Campus Exchange Hub — script.js   [PART 4 of 4]
   ----------------------------------------------------------
   Admin dashboard, the shared click router (event delegation),
   the startup routine and small extra handlers.
   ========================================================== */

/* ==========================================================
   21. ADMIN DASHBOARD
   ========================================================== */

const ADMIN_VIEW_IDS = {
  overview: 'admin-overview',
  users: 'admin-users',
  listings: 'admin-listings',
  reports: 'admin-reports',
  activity: 'admin-activity'
};

/** Statistics shown at the top of the dashboard */
function adminStats() {
  return {
    users: state.users.length,
    activeListings: state.products.filter(function (p) { return p.status === 'available'; }).length,
    sold: state.products.filter(function (p) { return p.status === 'sold'; }).length,
    pendingReports: state.reports.filter(function (r) { return r.status === 'Pending'; }).length,
    pendingRequests: state.requests.filter(function (r) { return r.status === 'Pending'; }).length,
    totalReports: state.reports.length,
    suspended: state.users.filter(function (u) { return u.status === 'suspended'; }).length
  };
}

/** Draw the currently selected admin section */
function renderAdmin() {
  Object.keys(ADMIN_VIEW_IDS).forEach(function (key) {
    const section = $(ADMIN_VIEW_IDS[key]);
    if (section) section.classList.add('hidden');
  });

  const target = $(ADMIN_VIEW_IDS[adminSection]) || $(ADMIN_VIEW_IDS.overview);
  target.classList.remove('hidden');
  target.innerHTML = buildAdminSection(adminSection);

  $$('.admin-nav-item').forEach(function (button) {
    button.classList.toggle('active', button.dataset.admin === adminSection);
  });
}

function buildAdminSection(section) {
  switch (section) {
    case 'users':    return adminUsersHtml();
    case 'listings': return adminListingsHtml();
    case 'reports':  return adminReportsHtml();
    case 'activity': return adminActivityHtml();
    default:         return adminOverviewHtml();
  }
}

/** Statistics + a quick look at the newest reports and activity */
function adminOverviewHtml() {
  const stats = adminStats();
  const recentReports = state.reports.slice(0, 3);
  const recentActivity = state.activity.slice(0, 6);

  return '' +
  '<div class="stat-grid">' +
    '<div class="stat-card accent"><div class="stat-value">' + stats.users +
      '</div><div class="stat-label">Total demo users</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + stats.activeListings +
      '</div><div class="stat-label">Active listings</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + stats.sold +
      '</div><div class="stat-label">Sold items</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + stats.pendingReports +
      '</div><div class="stat-label">Pending reports</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + stats.pendingRequests +
      '</div><div class="stat-label">Pending purchase requests</div></div>' +
  '</div>' +

  '<div class="admin-grid mt-3">' +
    '<div class="card">' +
      '<h3 class="card-title">Latest reports</h3>' +
      (recentReports.length
        ? recentReports.map(function (r) {
            return '<div class="activity-item">' +
              '<span class="activity-icon">\uD83D\uDEA9</span>' +
              '<div><div class="activity-text">' + esc(r.type) + ': ' + esc(r.targetLabel) + '</div>' +
              '<div class="activity-time">' + esc(r.reason) + ' \u00B7 ' + esc(r.date) + '</div></div>' +
              '<div style="margin-left:auto">' + statusPill(r.status) + '</div>' +
            '</div>';
          }).join('')
        : '<p class="muted small">No reports have been submitted yet.</p>') +
      '<button type="button" class="btn btn-soft mt-2" data-admin-go="reports">Open Report Management</button>' +
    '</div>' +

    '<div class="card">' +
      '<h3 class="card-title">Recent activity</h3>' +
      recentActivity.map(function (a) {
        return '<div class="activity-item">' +
          '<span class="activity-icon">' + activityIcon(a.type) + '</span>' +
          '<div><div class="activity-text">' + esc(a.text) + '</div>' +
          '<div class="activity-time">' + esc(a.time) + '</div></div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>' +

  '<div class="card mt-2">' +
    '<h3 class="card-title">Dashboard scope</h3>' +
    '<p class="muted small">These numbers are calculated from the prototype data stored in this browser. ' +
      'This dashboard does not monitor real students, real listings or real payments.</p>' +
    '<div class="row-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-admin-go="users">\uD83D\uDC65 Users (' + stats.users + ')</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-admin-go="listings">\uD83C\uDFF7\uFE0F Listings (' + state.products.length + ')</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-admin-go="reports">\uD83D\uDEA9 Reports (' + stats.totalReports + ')</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-admin-go="activity">\uD83D\uDD52 Activity</button>' +
    '</div>' +
  '</div>';
}

function activityIcon(type) {
  if (type === 'listing') return '\uD83C\uDFF7\uFE0F';
  if (type === 'request') return '\uD83D\uDCE6';
  if (type === 'report')  return '\uD83D\uDEA9';
  if (type === 'sold')    return '\u2714\uFE0F';
  if (type === 'user')    return '\uD83D\uDC65';
  return '\uD83D\uDD52';
}

/* ---------- A. User management ---------- */

function adminUsersHtml() {
  const rows = state.users.map(function (u) {
    const profile = state.profiles[u.email] || { name: u.email, department: '\u2014', year: '\u2014' };
    const suspended = u.status === 'suspended';
    const isSelf = u.email === currentUser.email;
    const listings = state.products.filter(function (p) { return p.sellerEmail === u.email; }).length;

    return '' +
    '<tr>' +
      '<td>' +
        '<div style="display:flex;gap:9px;align-items:center">' +
          '<span class="avatar" style="background:' + (u.role === 'admin' ? '#6d4aff' : '#2563eb') + '">' +
            esc(initials(profile.name)) + '</span>' +
          '<div><strong>' + esc(profile.name) + '</strong>' +
          '<div class="small muted">' + esc(profile.year) + '</div></div>' +
        '</div>' +
      '</td>' +
      '<td>' + esc(u.email) + (u.role === 'admin' ? '<div class="small muted">Admin demo account</div>' : '') + '</td>' +
      '<td>' + esc(profile.department) + '</td>' +
      '<td>' + listings + '</td>' +
      '<td><span class="pill ' + (suspended ? 'pill-suspended' : 'pill-active') + '">' +
        (suspended ? 'Suspended' : 'Active') + '</span></td>' +
      '<td>' +
        (isSelf
          ? '<span class="small muted">This is you</span>'
          : '<button type="button" class="btn ' + (suspended ? 'btn-success-soft' : 'btn-danger-soft') +
            ' btn-sm" data-admin-action="toggle-user" data-id="' + esc(u.email) + '">' +
            (suspended ? 'Reactivate' : 'Suspend') + '</button>') +
      '</td>' +
    '</tr>';
  }).join('');

  return '' +
  '<div class="card">' +
    '<h3 class="card-title">Demo users (' + state.users.length + ')</h3>' +
    '<p class="muted small">Suspending a demo account blocks that account from logging in. ' +
      'It does not affect any real person.</p>' +
    '<div class="table-wrap mt-2">' +
      '<table>' +
        '<thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Listings</th><th>Status</th><th>Action</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

/** Suspend or reactivate a demo account */
function toggleUserStatus(email) {
  const user = userByEmail(email);
  if (!user) return;
  if (user.email === currentUser.email) {
    toast('You cannot suspend the account you are logged in with.', 'error');
    return;
  }
  const suspending = user.status !== 'suspended';
  askConfirm(suspending ? 'Suspend this demo account?' : 'Reactivate this demo account?',
    (suspending
      ? 'The account ' + email + ' will not be able to log in to the prototype.'
      : 'The account ' + email + ' will be able to log in again.'),
    suspending ? 'Suspend' : 'Reactivate',
    function () {
      user.status = suspending ? 'suspended' : 'active';
      logActivity('user', 'Admin marked ' + email + ' as ' + user.status + '.');
      saveData();
      renderAdmin();
      toast('Account ' + email + ' is now ' + user.status + '.', 'success');
    });
}

/* ---------- B. Listing management ---------- */

function adminListingsHtml() {
  const query = adminListingQuery.trim().toLowerCase();
  let list = state.products.slice();

  if (adminListingFilter === 'available') {
    list = list.filter(function (p) { return p.status === 'available'; });
  } else if (adminListingFilter === 'sold') {
    list = list.filter(function (p) { return p.status === 'sold'; });
  }
  if (query) {
    list = list.filter(function (p) {
      return (p.name + ' ' + p.category + ' ' + nameOf(p.sellerEmail)).toLowerCase().indexOf(query) !== -1;
    });
  }

  const rows = list.map(function (p) {
    const sold = p.status === 'sold';
    return '' +
    '<tr>' +
      '<td>' +
        '<div style="display:flex;gap:10px;align-items:center">' +
          '<span class="list-row-thumb" style="width:46px;height:46px">' +
            (p.image ? '<img src="' + esc(p.image) + '" alt="">' : '<span class="img-fallback">\uD83D\uDDBC\uFE0F</span>') +
          '</span>' +
          '<div><strong>' + esc(p.name) + '</strong>' +
          '<div class="small muted">' + esc(p.category) + ' \u00B7 ' + esc(p.condition) + '</div></div>' +
        '</div>' +
      '</td>' +
      '<td class="nowrap">' + money(p.price) + '</td>' +
      '<td>' + esc(nameOf(p.sellerEmail)) + '</td>' +
      '<td class="nowrap">' + esc(p.createdAt || '\u2014') + '</td>' +
      '<td><span class="pill ' + (sold ? 'pill-sold' : 'pill-available') + '">' +
        (sold ? 'Sold' : 'Available') + '</span></td>' +
      '<td>' +
        '<div class="row-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-admin-action="view-product" data-id="' +
            esc(p.id) + '">View</button>' +
          '<button type="button" class="btn btn-danger-soft btn-sm" data-admin-action="remove-product" data-id="' +
            esc(p.id) + '">Remove</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  return '' +
  '<div class="card">' +
    '<h3 class="card-title">All listings (' + state.products.length + ')</h3>' +
    '<div class="toolbar-row mt-2">' +
      '<label class="field toolbar-search">' +
        '<span class="field-label">Search listings</span>' +
        '<input type="search" id="adminListingSearch" data-input="admin-listing-search" value="' +
          esc(adminListingQuery) + '" placeholder="Search by product name, category or seller">' +
      '</label>' +
      '<label class="field toolbar-field">' +
        '<span class="field-label">Availability</span>' +
        '<select data-input="admin-listing-filter">' +
          ['all', 'available', 'sold'].map(function (value) {
            const label = value === 'all' ? 'All listings' : (value === 'sold' ? 'Sold only' : 'Available only');
            return '<option value="' + value + '"' + (adminListingFilter === value ? ' selected' : '') +
              '>' + label + '</option>';
          }).join('') +
        '</select>' +
      '</label>' +
    '</div>' +
    (list.length
      ? '<div class="table-wrap mt-2"><table>' +
        '<thead><tr><th>Product</th><th>Price</th><th>Seller</th><th>Listed on</th><th>Status</th><th>Action</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>'
      : '<p class="muted small mt-2">No listings match this search.</p>') +
  '</div>';
}

/** Remove an inappropriate listing from the marketplace */
function adminRemoveProduct(productId, reason) {
  const product = productById(productId);
  if (!product) return;
  askConfirm('Remove this listing?',
    '"' + product.name + '" will be removed from the marketplace. Related pending requests are cancelled ' +
    'and it is removed from every wishlist.',
    'Remove listing', function () {
      removeProduct(productId, reason || 'removed by admin');
      renderAdmin();
      toast('Listing removed from the marketplace.', 'success');
    });
}

/* ---------- C. Report management ---------- */

function adminReportsHtml() {
  if (!state.reports.length) {
    return emptyState('\uD83D\uDEA9', 'No reports submitted',
      'When a student reports a listing or a user, it will appear here for review.');
  }

  const rows = state.reports.map(function (r) {
    const isProduct = r.type === 'Product';
    const product = isProduct ? productById(r.targetId) : null;
    const productMissing = isProduct && !product;

    return '' +
    '<tr>' +
      '<td><strong>' + esc(r.type) + '</strong></td>' +
      '<td>' + esc(r.targetLabel) +
        (productMissing ? '<div class="small muted">Listing already removed</div>' : '') + '</td>' +
      '<td>' + esc(nameOf(r.reporterEmail)) + '</td>' +
      '<td>' + esc(r.reason) +
        '<div class="small muted">' + esc(r.description) + '</div></td>' +
      '<td class="nowrap">' + esc(r.date) + '</td>' +
      '<td>' + statusPill(r.status) + '</td>' +
      '<td>' +
        '<div class="row-actions">' +
          (r.status !== 'Under Review'
            ? '<button type="button" class="btn btn-warn-soft btn-sm" data-admin-action="report-review" data-id="' +
              esc(r.id) + '">Under Review</button>' : '') +
          (r.status !== 'Resolved'
            ? '<button type="button" class="btn btn-success-soft btn-sm" data-admin-action="report-resolve" data-id="' +
              esc(r.id) + '">Resolve</button>' : '') +
          (isProduct && product
            ? '<button type="button" class="btn btn-danger-soft btn-sm" data-admin-action="remove-reported" data-id="' +
              esc(r.id) + '">Remove listing</button>' : '') +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  return '' +
  '<div class="card">' +
    '<h3 class="card-title">Submitted reports (' + state.reports.length + ')</h3>' +
    '<p class="muted small">Reports are created by students from the product page or from a chat.</p>' +
    '<div class="table-wrap mt-2">' +
      '<table>' +
        '<thead><tr><th>Type</th><th>Reported item / user</th><th>Reported by</th><th>Reason</th>' +
        '<th>Date</th><th>Status</th><th>Action</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

/** Change a report's status and notify the student who sent it */
function updateReportStatus(reportId, status) {
  const report = state.reports.find(function (r) { return r.id === reportId; });
  if (!report) return;
  report.status = status;
  addNotification(report.reporterEmail, 'report', 'Report status changed',
    'Your report on "' + report.targetLabel + '" is now ' + status + '.', 'report');
  logActivity('report', 'Report on "' + report.targetLabel + '" marked as ' + status + '.');
  saveData();
  renderAdmin();
  toast('Report marked as ' + status + '.', 'success');
}

/** Remove the listing that was reported, straight from the report row */
function adminRemoveReportedListing(reportId) {
  const report = state.reports.find(function (r) { return r.id === reportId; });
  if (!report) return;
  const product = productById(report.targetId);
  if (!product) {
    toast('That listing has already been removed.', 'info');
    return;
  }
  adminRemoveProduct(report.targetId, 'removed after report ' + report.id);
}

/* ---------- D. Activity overview ---------- */

function adminActivityHtml() {
  if (!state.activity.length) {
    return emptyState('\uD83D\uDD52', 'No activity recorded yet',
      'New listings, purchase requests and reports will appear here.');
  }

  const items = state.activity.map(function (a) {
    return '<div class="activity-item">' +
      '<span class="activity-icon">' + activityIcon(a.type) + '</span>' +
      '<div><div class="activity-text">' + esc(a.text) + '</div>' +
      '<div class="activity-time">' + esc(a.time) + '</div></div>' +
    '</div>';
  }).join('');

  return '' +
  '<div class="card">' +
    '<h3 class="card-title">Recent prototype activity</h3>' +
    '<p class="muted small">Newest first. These entries are created by your own actions in the prototype, ' +
      'plus a few sample entries from data.js.</p>' +
    '<div class="mt-2">' + items + '</div>' +
  '</div>';
}

/* ==========================================================
   22. EVENT HANDLING (delegation)
   ========================================================== */

/** One click listener for the whole document */
function onDocumentClick(event) {
  // 1. Navigation: any element with data-view
  const navEl = event.target.closest('[data-view]');
  if (navEl) {
    event.preventDefault();
    $('userMenu').classList.add('hidden');
    goToView(navEl.dataset.view);
    return;
  }

  // 2. Elements with a data-action
  const actionEl = event.target.closest('[data-action]');
  if (actionEl) {
    event.preventDefault();
    handleAction(actionEl.dataset.action, actionEl.dataset.id);
    return;
  }

  // 3. Admin dashboard actions
  const adminEl = event.target.closest('[data-admin-action]');
  if (adminEl) {
    event.preventDefault();
    handleAdminAction(adminEl.dataset.adminAction, adminEl.dataset.id);
    return;
  }

  // 4. Admin sidebar navigation
  const adminNavEl = event.target.closest('[data-admin]');
  if (adminNavEl) {
    event.preventDefault();
    adminSection = adminNavEl.dataset.admin;
    renderAdmin();
    return;
  }

  // 5. Admin "go to section" buttons inside the overview cards
  const adminGoEl = event.target.closest('[data-admin-go]');
  if (adminGoEl) {
    event.preventDefault();
    adminSection = adminGoEl.dataset.adminGo;
    renderAdmin();
    return;
  }

  // 6. Toggle the profile dropdown
  if (event.target.closest('#userChipBtn')) {
    $('userMenu').classList.toggle('hidden');
    return;
  }
  if (event.target.closest('#menuBtn')) {
    $('userMenu').classList.toggle('hidden');
    return;
  }

  // 7. Close the dropdown when clicking anywhere else
  if (!$('userMenu').classList.contains('hidden') && !event.target.closest('#userMenu')) {
    $('userMenu').classList.add('hidden');
  }
}

/** Run the action requested by a data-action element */
function handleAction(action, id) {
  switch (action) {
    case 'open-product':
      navigate('details', id);
      break;

    case 'toggle-wishlist':
      toggleWishlist(id);
      break;

    case 'send-request':
      sendPurchaseRequest(id);
      break;

    case 'start-chat':
      startChatWithSeller(id);
      break;

    case 'open-conversation':
      activeConversationId = id;
      renderCurrentView();
      scrollChatToBottom();
      break;

    case 'report-product':
      navigate('report', 'product:' + id);
      break;

    case 'report-user':
      navigate('report', 'user:' + id);
      break;

    case 'edit-listing':
      editingProductId = id;
      navigate('sell');
      break;

    case 'delete-listing':
      deleteMyListing(id);
      break;

    case 'mark-sold':
      setProductStatus(id, 'sold');
      break;

    case 'mark-available':
      setProductStatus(id, 'available');
      break;

    case 'cancel-sell':
      editingProductId = null;
      toast('Listing changes were discarded.', 'info');
      navigate('listings');
      break;

    case 'cancel-report':
      navigate('home');
      break;

    case 'clear-filters':
      searchTerm = '';
      activeCategory = 'All';
      activeCondition = 'All';
      activeSort = 'newest';
      renderCurrentView();
      toast('Filters cleared.', 'info');
      break;

    case 'set-category':
      activeCategory = id;
      renderCurrentView();
      break;

    case 'request-tab':
      requestTab = id;
      renderCurrentView();
      break;

    case 'accept-request':
      updateRequestStatus(id, 'Accepted');
      break;

    case 'reject-request':
      updateRequestStatus(id, 'Rejected');
      break;

    case 'cancel-request':
      updateRequestStatus(id, 'Cancelled');
      break;

    case 'complete-request':
      updateRequestStatus(id, 'Completed');
      break;

    case 'open-notification':
      openNotification(id);
      break;

    case 'mark-all-read':
      markAllRead();
      break;

    case 'reset-demo':
      resetDemoData();
      break;

    case 'logout':
      logout();
      break;

    default:
      toast('That action is not available in this prototype.', 'info');
  }
}

/** Run an action requested from the admin dashboard */
function handleAdminAction(action, id) {
  switch (action) {
    case 'toggle-user':
      toggleUserStatus(id);
      break;

    case 'view-product':
      showStudentShell();
      navigate('details', id);
      break;

    case 'remove-product':
      adminRemoveProduct(id, 'removed by admin');
      break;

    case 'remove-reported':
      adminRemoveReportedListing(id);
      break;

    case 'report-review':
      updateReportStatus(id, 'Under Review');
      break;

    case 'report-resolve':
      updateReportStatus(id, 'Resolved');
      break;

    default:
      toast('That admin action is not available in this prototype.', 'info');
  }
}

/** Typing inside inputs that update the view live */
function onDocumentInput(event) {
  const el = event.target;

  if (el.dataset.input === 'search') {
    searchTerm = el.value;
    updateProductGrid();
    return;
  }
  if (el.dataset.input === 'sort') {
    activeSort = el.value;
    renderCurrentView();
    return;
  }
  if (el.dataset.input === 'category') {
    activeCategory = el.value;
    updateProductGrid();
    return;
  }
  if (el.dataset.input === 'condition') {
    activeCondition = el.value;
    updateProductGrid();
    return;
  }
  if (el.dataset.input === 'admin-listing-search') {
    adminListingQuery = el.value;
    updateAdminListingTable();
    return;
  }
  if (el.dataset.input === 'admin-listing-filter') {
    adminListingFilter = el.value;
    renderAdmin();
    return;
  }
  if (el.dataset.input === 'image-preview') {
    const box = $('imagePreviewBox');
    if (!box) return;
    const url = el.value.trim();
    if (url) {
      box.innerHTML = '<img src="' + esc(url) + '" alt="Image preview">';
      const img = box.querySelector('img');
      if (img) {
        img.addEventListener('error', function () {
          box.innerHTML = '<div class="img-fallback">\uD83D\uDDBC\uFE0F</div>';
        });
      }
    } else {
      box.innerHTML = '<div class="img-fallback">\uD83D\uDDBC\uFE0F</div>';
    }
    return;
  }
  if (el.dataset.input === 'report-type') {
    const isProduct = el.value === 'Product';
    const productField = $('reportTargetProductField');
    const userField = $('reportTargetUserField');
    if (productField) productField.classList.toggle('hidden', !isProduct);
    if (userField) userField.classList.toggle('hidden', isProduct);
  }
}

/**
 * Redraw only the product grid of the visible view. Doing it this way keeps the
 * search box focused while the visitor types, instead of rebuilding the page.
 */
function updateProductGrid() {
  const area = document.querySelector('#' + VIEW_IDS[currentView] + ' .product-grid-area');
  if (!area) return;
  const list = filteredProducts();
  area.innerHTML = productGrid(list);

  const counter = $('browseCounter');
  if (counter) {
    counter.textContent = list.length + ' item(s) found' +
      (searchTerm ? ' for \u201C' + searchTerm + '\u201D' : '') +
      (activeCategory !== 'All' ? ' in ' + activeCategory : '') + '.';
  }
}

/** Redraw only the admin listing table while the admin types */
function updateAdminListingTable() {
  const section = $('admin-listings');
  if (!section) return;
  section.innerHTML = adminListingsHtml();
  const input = $('adminListingSearch');
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

/** All form submits in one place */
function onDocumentSubmit(event) {
  const form = event.target;
  const kind = form.dataset.form;

  if (kind === 'sell')    return handleSellSubmit(event);
  if (kind === 'chat')    return handleChatSubmit(event);
  if (kind === 'report')  return handleReportSubmit(event);
  if (kind === 'profile') return handleProfileSubmit(event);

  if (form.id === 'loginForm')    return handleLogin(event);
  if (form.id === 'registerForm') return handleRegister(event);
}

/**
 * Any image that fails to load — including images inserted later by the
 * renderer — is swapped for a simple CSS placeholder. The listener runs in
 * the capture phase on the document, so it catches resource errors for every
 * <img> element without needing a handler on each one.
 */
function attachImageFallback() {
  document.addEventListener('error', function (event) {
    const img = event.target;
    if (!img || img.tagName !== 'IMG' || img.dataset.fallbackDone) return;
    img.dataset.fallbackDone = 'yes';
    const parent = img.parentElement;
    if (!parent || parent.querySelector('.img-fallback')) return;
    const box = document.createElement('div');
    box.className = 'img-fallback';
    box.style.width = '100%';
    box.style.height = '100%';
    box.textContent = '\uD83D\uDDBC\uFE0F';
    parent.replaceChild(box, img);
  }, true);
}

/* ==========================================================
   23. START-UP
   ========================================================== */

function init() {
  loadData();
  loadSession();

  // Login screen
  $('loginForm').addEventListener('submit', handleLogin);
  $('registerForm').addEventListener('submit', handleRegister);
  $('showRegisterLink').addEventListener('click', function (event) {
    event.preventDefault();
    $('loginForm').classList.add('hidden');
    $('registerForm').classList.remove('hidden');
  });
  $('showLoginLink').addEventListener('click', function (event) {
    event.preventDefault();
    $('registerForm').classList.add('hidden');
    $('loginForm').classList.remove('hidden');
  });
  $('fillStudentBtn').addEventListener('click', function () {
    $('loginEmail').value = 'student@demo.edu';
    $('loginPassword').value = 'demo123';
    toast('Student demo credentials filled in. Press Login.', 'info');
  });
  $('fillAdminBtn').addEventListener('click', function () {
    $('loginEmail').value = 'admin@demo.edu';
    $('loginPassword').value = 'demo123';
    toast('Admin demo credentials filled in. Press Login.', 'info');
  });

  // App shell buttons
  $('topbarSellBtn').addEventListener('click', function () { goToView('sell'); });
  $('menuLogoutBtn').addEventListener('click', logout);
  $('adminLogoutBtn').addEventListener('click', logout);
  $('resetDemoBtn').addEventListener('click', resetDemoData);

  // Confirmation modal
  $('modalCancelBtn').addEventListener('click', closeConfirm);
  $('modalConfirmBtn').addEventListener('click', function () {
    const callback = confirmCallback;
    closeConfirm();
    if (typeof callback === 'function') callback();
  });
  $('modalRoot').addEventListener('click', function (event) {
    if (event.target === $('modalRoot')) closeConfirm();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeConfirm();
      $('userMenu').classList.add('hidden');
    }
  });

  // One listener each for clicks, typing and form submits
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('input', onDocumentInput);
  document.addEventListener('submit', onDocumentSubmit);

  // Browser back / forward support
  window.addEventListener('popstate', function () {
    if (!currentUser) return;
    const route = parseHash();
    currentView = route.view;
    currentParam = route.param;
    renderCurrentView();
  });

  // Show the right screen
  if (currentUser) {
    if (currentUser.role === 'admin') {
      showAdminShell();
    } else {
      showStudentShell();
      const route = parseHash();
      currentView = route.view;
      currentParam = route.param;
      renderCurrentView();
      try {
        history.replaceState({ view: currentView, param: currentParam }, '', '#/' + currentView);
      } catch (error) { /* ignore */ }
    }
  } else {
    showAuthScreen();
  }

  // Product photos are ordinary URLs, so a missing one shows a placeholder.
  attachImageFallback();
}

document.addEventListener('DOMContentLoaded', init);
