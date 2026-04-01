/**
 * script.js — Shared logic for portfolio + dashboard
 *
 * Projects are loaded from data/projects.json via fetch().
 * Each project object shape (see data/projects.json for full example):
 * {
 *   id:             number  — unique integer (1, 2, 3 …)
 *   title_ar:       string  — Arabic title
 *   title_en:       string  — English title
 *   description_ar: string  — Arabic description
 *   description_en: string  — English description
 *   category:       "WordPress" | "Salla" | "Shopify"
 *   image:          string  — path like "assets/images/project.jpg" | ""
 *   gallery:        string[] — array of image paths
 *   technologies:   string[] — e.g. ["WordPress", "WooCommerce"]
 *   features:       string[] — bullet-point list items
 *   role:           string  — e.g. "Full Development"
 *   client:         string  — e.g. "Company Project"
 *   project_url:    string  — live URL | ""
 *   github_url:     string  — GitHub URL | ""
 *   status:         "Live" | "In Progress" | "Archived"
 *   date:           string  — "YYYY-MM"
 * }
 */

/* ═══════════════════════════════════════════════════════════
   DATA — fetch from JSON file
   ═══════════════════════════════════════════════════════════
   Always loads data/projects.json relative to the HTML page.
   Works on GitHub Pages. Requires a local HTTP server for
   local development (e.g. `npx serve .` or VS Code Live Server).
   ═══════════════════════════════════════════════════════════ */

/**
 * Fetches and returns the projects array from data/projects.json.
 * Returns [] on any error so the page degrades gracefully.
 * @returns {Promise<Array>}
 */
async function fetchProjects() {
  try {
    const res = await fetch('data/projects.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[portfolio] Could not load data/projects.json:', err.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   BILINGUAL PROJECT HELPERS
   ═══════════════════════════════════════════════════════════ */

/**
 * Returns the project title for the current language.
 * Compares p.id as string to handle both number and string IDs.
 */
function getProjectTitle(project) {
  const lang = getCurrentLang();
  return (lang === 'ar' ? project.title_ar : project.title_en) || project.title || '';
}

/** Returns the project description for the current language. */
function getProjectDesc(project) {
  const lang = getCurrentLang();
  return (lang === 'ar' ? project.description_ar : project.description_en) || project.description || '';
}

/* ═══════════════════════════════════════════════════════════
   RENDERING HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Returns the CSS class suffix for a category badge. */
function categoryClass(category) {
  return category.toLowerCase().replace(/\s+/g, '-');
}

/** Returns a category icon emoji. */
function categoryIcon(category) {
  const icons = { WordPress: '🌐', Salla: '🛒', Shopify: '🎓' };
  return icons[category] || '📁';
}

/**
 * Builds and returns a project card <article> element.
 *  - Title + image link → project.html?id=X  (detail page)
 *  - "View Project ↗" button → project_url  (external, new tab)
 *  - WordPress projects get a "Developed at company" badge
 */
function buildCard(project) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.dataset.category = project.category;

  const title = getProjectTitle(project);
  const desc  = getProjectDesc(project);

  const imageHtml = project.image
    ? `<img class="card-image" src="${project.image}" alt="${escapeHtml(title)}" loading="lazy">`
    : `<div class="card-image-placeholder">${categoryIcon(project.category)}</div>`;

  const companyBadge = project.category === 'WordPress'
    ? `<span class="badge-company">${t('card_company')}</span>`
    : '';

  const viewBtn = project.project_url
    ? `<a href="${escapeHtml(project.project_url)}" target="_blank" rel="noopener" class="btn-card-link">${t('card_view')}</a>`
    : '';

  card.innerHTML = `
    <a href="project.html?id=${project.id}" class="card-image-link" tabindex="-1" aria-hidden="true">
      ${imageHtml}
    </a>
    <div class="card-body">
      <div class="card-meta">
        <span class="badge badge-${categoryClass(project.category)}">${project.category}</span>
        ${companyBadge}
      </div>
      <h2 class="card-title">
        <a href="project.html?id=${project.id}" class="card-title-link">${escapeHtml(title)}</a>
      </h2>
      <p class="card-description">${escapeHtml(desc)}</p>
      ${viewBtn}
    </div>
  `;
  return card;
}

/** Simple HTML escape — prevents XSS when rendering user-authored content. */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATION
   ═══════════════════════════════════════════════════════════ */

let _toastTimer = null;

/**
 * Shows a brief toast message at the bottom-right of the screen.
 * @param {string}  message
 * @param {'success'|'error'|''} type
 */
function showToast(message, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  void toast.offsetWidth; // force reflow so CSS transition fires on rapid calls
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ═══════════════════════════════════════════════════════════
   IMAGE → BASE64 (used by dashboard for preview purposes)
   ═══════════════════════════════════════════════════════════ */

/**
 * Reads a File and resolves to a base64 data-URL.
 * NOTE: base64 images are for preview only in the dashboard.
 *       For the JSON file, use a file path like "assets/images/name.jpg".
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/* ═══════════════════════════════════════════════════════════
   THEME  (dark / light)
   ═══════════════════════════════════════════════════════════ */

const THEME_KEY = 'theme';

/** Reads saved theme from localStorage, applies it. Defaults to dark. */
function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}

/** Toggles between dark and light, persists the choice. */
function toggleTheme() {
  const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

/** Sets data-theme on <html> and updates all toggle button icons. */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
}

/* ═══════════════════════════════════════════════════════════
   INTERNATIONALISATION  (i18n)
   ═══════════════════════════════════════════════════════════
   Usage:
     • initLang()  — call once per page (defaults to Arabic)
     • t('key')    — get current-language string for dynamic content
     • data-i18n="key"   — auto-updated by setLang() on static elements
     • data-i18n-ph="key" — updates placeholder attribute
     • document.addEventListener('langchange', fn) — re-render dynamic content
   ═══════════════════════════════════════════════════════════ */

const LANG_KEY = 'lang';

const translations = {
  ar: {
    /* ── Navigation ────────────────────────── */
    nav_about:           'من أنا',
    nav_work:            'أعمالي',
    nav_contact:         'تواصل',
    nav_dashboard:       '⚙️ لوحة التحكم',
    nav_view_site:       'عرض الموقع →',
    /* ── Hero ───────────────────────────────── */
    hero_greeting:       'مرحباً، أنا',
    hero_name:           'هشام علي',
    hero_role:           'مطوّر ووردبريس · خبير سلة · مدرّب',
    hero_bio:            'أبني تجارب رقمية — من متاجر التجارة الإلكترونية والقوالب المخصصة إلى برامج التدريب التي ترتقي بالفرق.',
    hero_cta_work:       'شاهد أعمالي',
    hero_cta_contact:    'تواصل معي',
    /* ── About ──────────────────────────────── */
    about_heading:       'من أنا',
    about_sub:           'مطوّر يهتم بكل التفاصيل',
    about_bg:            'نبذة',
    about_p1:            'مطوّر ويب متخصص في ووردبريس وسلة للتجارة الإلكترونية. عملت على مشاريع متنوعة من مواقع الشركات الصغيرة إلى المتاجر الكبيرة، مع التركيز دائماً على الأداء وتجربة المستخدم.',
    about_p2:            'بجانب التطوير، أستمتع بنقل المعرفة — من خلال دورات تدريبية وورش عمل تجعل المفاهيم المعقدة في متناول الجميع.',
    about_skills_wp:     'ووردبريس',
    about_skills_salla:  'سلة',
    about_skills_gen:    'عام',
    /* ── Portfolio ──────────────────────────── */
    portfolio_heading:   'أعمالي',
    portfolio_sub:       'مشاريع بنيتها في ووردبريس وسلة وشوبيفاي',
    filter_all:          'الكل',
    filter_wp:           'ووردبريس',
    filter_salla:        'سلة',
    filter_Shopify:     'شوبيفاي',
    results_all:         'جميع المشاريع',
    /* ── Contact ────────────────────────────── */
    contact_heading:     'تواصل معي',
    contact_sub:         'لديك مشروع؟ لنتحدث.',
    contact_body:        'سواء كنت تحتاج موقع ووردبريس، أو متجر سلة، أو ورشة تدريبية لفريقك — يسعدني الاستماع إليك.',
    contact_email:       '✉️ راسلني',
    contact_github:      '🐙 جيتهاب',
    contact_linkedin:    '💼 لينكدان',
    /* ── Footer ─────────────────────────────── */
    footer_text:         'صُنع بعناية · هشام علي',
    /* ── Cards ──────────────────────────────── */
    card_company:        '🏢 جزء من عملي في شركة',
    card_view:           'عرض المشروع ↗',
    /* ── Empty states ───────────────────────── */
    empty_loading:       'جارٍ تحميل المشاريع…',
    empty_error:         'تعذّر تحميل المشاريع. يُرجى تشغيل الموقع عبر خادم محلي.',
    empty_add_first:     'لا توجد مشاريع بعد.',
    empty_no_cat:        'لا توجد مشاريع في هذه الفئة.',
    /* ── Dashboard: Login ───────────────────── */
    login_heading:       'تسجيل الدخول',
    login_sub:           'أدخل كلمة المرور للمتابعة',
    login_pwd_label:     'كلمة المرور',
    login_pwd_ph:        'أدخل كلمة المرور',
    login_btn:           'فتح اللوحة',
    login_error:         'كلمة المرور غير صحيحة. حاول مجدداً.',
    /* ── Dashboard: Form ────────────────────── */
    dash_add_title:      '➕ إضافة مشروع',
    dash_title_ar:       'العنوان بالعربية *',
    dash_title_ar_ph:    'مثال: متجر إلكتروني',
    dash_title_en:       'العنوان بالإنجليزية',
    dash_title_en_ph:    'e.g. E-Commerce Store',
    dash_desc_ar:        'الوصف بالعربية *',
    dash_desc_ar_ph:     'وصف مختصر للمشروع...',
    dash_desc_en:        'الوصف بالإنجليزية',
    dash_desc_en_ph:     'Short project description…',
    dash_category:       'التصنيف *',
    dash_cat_select:     'اختر تصنيفاً',
    dash_image_label:    'مسار صورة المشروع',
    dash_image_ph:       'assets/images/project.jpg',
    dash_gallery_label:  'صور المعرض (مسار لكل سطر)',
    dash_gallery_ph:     'assets/images/gallery1.jpg\nassets/images/gallery2.jpg',
    dash_tech_label:     'التقنيات (مفصولة بفاصلة)',
    dash_tech_ph:        'WordPress, WooCommerce, ACF',
    dash_features_label: 'المميزات (ميزة لكل سطر)',
    dash_features_ph:    'بوابات دفع متعددة\nتتبع الطلبات',
    dash_role_label:     'الدور',
    dash_role_ph:        'مثال: Full Development',
    dash_client_label:   'العميل',
    dash_client_ph:      'مثال: Company Project',
    dash_url_label:      'رابط المشروع (اختياري)',
    dash_url_ph:         'https://example.com',
    dash_github_label:   'رابط GitHub (اختياري)',
    dash_github_ph:      'https://github.com/...',
    dash_status_label:   'الحالة',
    dash_status_live:    'منشور',
    dash_status_progress:'قيد التطوير',
    dash_status_archived:'مؤرشف',
    dash_date_label:     'التاريخ (YYYY-MM)',
    dash_date_ph:        '2025-01',
    /* ── Dashboard: Generator ───────────────── */
    dash_gen_btn:        '⚡ توليد JSON',
    dash_reset_btn:      '↺ إعادة تعيين',
    dash_output_title:   '📋 ناتج JSON',
    dash_output_note:    'أضف هذا الكائن إلى مصفوفة data/projects.json',
    dash_copy_btn:       'نسخ',
    dash_download_btn:   'تحميل',
    dash_copied:         'تم النسخ ✓',
    dash_current_title:  '📁 المشاريع الحالية',
    dash_current_none:   'لا توجد مشاريع في الملف بعد.',
    dash_current_error:  'تعذّر تحميل projects.json — شغّل الموقع عبر خادم.',
    /* ── Project detail page ────────────────── */
    proj_back:           '← العودة للأعمال',
    proj_visit:          'زيارة المشروع ↗',
    proj_view_code:      'عرض الكود ↗',
    proj_not_found:      'المشروع غير موجود.',
    proj_go_home:        'العودة للرئيسية',
    proj_technologies:   'التقنيات',
    proj_features:       'المميزات',
    proj_info_box:       'تفاصيل المشروع',
    proj_role:           'الدور',
    proj_client:         'العميل',
    proj_date:           'التاريخ',
    proj_status:         'الحالة',
    proj_gallery:        'معرض الصور',
    proj_status_live:    'منشور 🟢',
    proj_status_progress:'قيد التطوير 🟡',
    proj_status_archived:'مؤرشف ⚫',
  },
  en: {
    /* ── Navigation ────────────────────────── */
    nav_about:           'About',
    nav_work:            'Work',
    nav_contact:         'Contact',
    nav_dashboard:       '⚙️ Dashboard',
    nav_view_site:       '← View Site',
    /* ── Hero ───────────────────────────────── */
    hero_greeting:       "Hello, I'm",
    hero_name:           'Hesham Ali',
    hero_role:           'WordPress Developer · Salla Expert · Trainer',
    hero_bio:            "I build digital experiences — from e-commerce stores and custom themes to training programs that help teams level up.",
    hero_cta_work:       'View My Work',
    hero_cta_contact:    'Get In Touch',
    /* ── About ──────────────────────────────── */
    about_heading:       'About Me',
    about_sub:           'A developer who cares about every detail',
    about_bg:            'Background',
    about_p1:            "I'm a web developer specialising in WordPress and Salla e-commerce platforms. I've worked on projects ranging from small business sites to large enterprise stores, always with performance and user experience at the forefront.",
    about_p2:            "Beyond building, I enjoy sharing knowledge — running training sessions and workshops that make complex topics approachable for teams of all skill levels.",
    about_skills_wp:     'WordPress',
    about_skills_salla:  'Salla',
    about_skills_gen:    'General',
    /* ── Portfolio ──────────────────────────── */
    portfolio_heading:   'My Work',
    portfolio_sub:       "Projects I've built across WordPress, Salla, and Shopify",
    filter_all:          'All',
    filter_wp:           'WordPress',
    filter_salla:        'Salla',
    filter_shopify:     'Shopify',
    results_all:         'All Projects',
    /* ── Contact ────────────────────────────── */
    contact_heading:     'Get In Touch',
    contact_sub:         "Have a project in mind? Let's talk.",
    contact_body:        "Whether you need a new WordPress site, a Salla store built from scratch, or a training workshop for your team — I'd love to hear from you.",
    contact_email:       '✉️ Email Me',
    contact_github:      '🐙 GitHub',
    contact_linkedin:    '💼 LinkedIn',
    /* ── Footer ─────────────────────────────── */
    footer_text:         'Built with care · Hesham Ali',
    /* ── Cards ──────────────────────────────── */
    card_company:        '🏢 Developed at company',
    card_view:           'View Project ↗',
    /* ── Empty states ───────────────────────── */
    empty_loading:       'Loading projects…',
    empty_error:         'Could not load projects. Please run the site via a local server.',
    empty_add_first:     'No projects found.',
    empty_no_cat:        'No projects in this category.',
    /* ── Dashboard: Login ───────────────────── */
    login_heading:       'Dashboard Login',
    login_sub:           'Enter your password to continue',
    login_pwd_label:     'Password',
    login_pwd_ph:        'Enter password',
    login_btn:           'Unlock Dashboard',
    login_error:         'Incorrect password. Please try again.',
    /* ── Dashboard: Form ────────────────────── */
    dash_add_title:      '➕ Add Project',
    dash_title_ar:       'Arabic Title *',
    dash_title_ar_ph:    'مثال: متجر إلكتروني',
    dash_title_en:       'English Title',
    dash_title_en_ph:    'e.g. E-Commerce Store',
    dash_desc_ar:        'Arabic Description *',
    dash_desc_ar_ph:     'وصف مختصر للمشروع...',
    dash_desc_en:        'English Description',
    dash_desc_en_ph:     'Short project description…',
    dash_category:       'Category *',
    dash_cat_select:     'Select a category',
    dash_image_label:    'Project Image Path',
    dash_image_ph:       'assets/images/project.jpg',
    dash_gallery_label:  'Gallery Images (one path per line)',
    dash_gallery_ph:     'assets/images/gallery1.jpg\nassets/images/gallery2.jpg',
    dash_tech_label:     'Technologies (comma-separated)',
    dash_tech_ph:        'WordPress, WooCommerce, ACF',
    dash_features_label: 'Features (one per line)',
    dash_features_ph:    'Custom checkout\nPayment integration',
    dash_role_label:     'Role',
    dash_role_ph:        'e.g. Full Development',
    dash_client_label:   'Client',
    dash_client_ph:      'e.g. Company Project',
    dash_url_label:      'Project URL (optional)',
    dash_url_ph:         'https://example.com',
    dash_github_label:   'GitHub URL (optional)',
    dash_github_ph:      'https://github.com/...',
    dash_status_label:   'Status',
    dash_status_live:    'Live',
    dash_status_progress:'In Progress',
    dash_status_archived:'Archived',
    dash_date_label:     'Date (YYYY-MM)',
    dash_date_ph:        '2025-01',
    /* ── Dashboard: Generator ───────────────── */
    dash_gen_btn:        '⚡ Generate JSON',
    dash_reset_btn:      '↺ Reset Form',
    dash_output_title:   '📋 JSON Output',
    dash_output_note:    'Add this object to the array in data/projects.json',
    dash_copy_btn:       'Copy',
    dash_download_btn:   'Download',
    dash_copied:         'Copied ✓',
    dash_current_title:  '📁 Current Projects',
    dash_current_none:   'No projects in the file yet.',
    dash_current_error:  'Could not load projects.json — run via a local server.',
    /* ── Project detail page ────────────────── */
    proj_back:           '← Back to Work',
    proj_visit:          'Visit Project ↗',
    proj_view_code:      'View Code ↗',
    proj_not_found:      'Project not found.',
    proj_go_home:        'Go Home',
    proj_technologies:   'Technologies',
    proj_features:       'Features',
    proj_info_box:       'Project Details',
    proj_role:           'Role',
    proj_client:         'Client',
    proj_date:           'Date',
    proj_status:         'Status',
    proj_gallery:        'Gallery',
    proj_status_live:    'Live 🟢',
    proj_status_progress:'In Progress 🟡',
    proj_status_archived:'Archived ⚫',
  }
};

/** Returns the currently active language code ('ar' | 'en'). */
function getCurrentLang() {
  return document.documentElement.getAttribute('lang') || 'ar';
}

/**
 * Returns the translation string for a key.
 * Falls back to the key itself so missing strings are obvious during development.
 * @param {string} key
 * @returns {string}
 */
function t(key) {
  const lang = getCurrentLang();
  return (translations[lang] && translations[lang][key]) ?? key;
}

/** Read saved language from localStorage, apply it. Defaults to Arabic. */
function initLang() {
  setLang(localStorage.getItem(LANG_KEY) || 'ar', false);
}

/** Toggle AR ↔ EN and persist. */
function toggleLang() {
  setLang(getCurrentLang() === 'ar' ? 'en' : 'ar', true);
}

/**
 * Applies a language:
 *  1. Sets lang + dir on <html>
 *  2. Persists to localStorage
 *  3. Updates all [data-i18n] element text
 *  4. Updates [data-i18n-ph] placeholder attributes
 *  5. Updates .lang-toggle button labels
 *  6. Optionally fades body (160 ms) for a smooth transition
 *  7. Fires CustomEvent('langchange') so pages re-render dynamic content
 *
 * @param {'ar'|'en'} lang
 * @param {boolean}   animate
 */
function setLang(lang, animate = true) {
  const apply = () => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir',  lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem(LANG_KEY, lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = translations[lang][el.dataset.i18n];
      if (v !== undefined) el.innerHTML = v;
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const v = translations[lang][el.dataset.i18nPh];
      if (v !== undefined) el.placeholder = v;
    });

    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.textContent = lang === 'ar' ? 'EN' : 'عر';
    });

    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  };

  if (animate && document.body) {
    document.body.classList.add('lang-transitioning');
    setTimeout(() => { apply(); document.body.classList.remove('lang-transitioning'); }, 160);
  } else {
    apply();
  }
}
