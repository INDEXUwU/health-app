/**
 * Shared Components & Logic
 */

// --- Navigation Config ---
const NAV_ITEMS = [
    { label: 'ホーム', icon: '🏠', href: 'home.html' },
    { label: '食事', icon: '🍽️', href: 'record_meal.html' },
    { label: '運動', icon: '🏃', href: 'record_exercise.html' },
    { label: '体重', icon: '⚖️', href: 'record_weight.html' },
    { label: '予定', icon: '📅', href: 'schedule.html' },
    { label: 'グラフ', icon: '📊', href: 'history.html' },
    { label: '設定', icon: '⚙️', href: 'user_info.html' },
];

/**
 * Standard Header Component
 * Automatically renders responsive navigation
 */
function renderHeader(pageTitle) {
    const user = localStorage.getItem('userName') || 'ゲスト';

    // HTML Structure
    const html = `
    <header class="app-header">
        <div class="header-inner" style="display:contents; width:100%;">
            <a href="home.html" class="app-logo">
                <span>🍀</span> 健康管理アプリ
            </a>
            
            <!-- Desktop Nav -->
            <nav class="bottom-nav">
                ${NAV_ITEMS.map(item => `
                    <a href="${item.href}" class="nav-item ${location.pathname.includes(item.href) ? 'active' : ''}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-label">${item.label}</span>
                    </a>
                `).join('')}
                <a href="#" onclick="Auth.logout()" class="nav-item">
                    <span class="nav-icon">🚪</span>
                    <span class="nav-label">ログアウト</span>
                </a>
            </nav>
        </div>
    </header>
    `;

    // Insert at top of body
    document.body.insertAdjacentHTML('afterbegin', html);
}

/**
 * Auth Utilities
 */
const Auth = {
    checkContext: () => {
        const loginId = localStorage.getItem('login_id');
        const isAuthPage = ['login.html', 'register.html'].some(p => location.pathname.includes(p));

        if (!loginId && !isAuthPage) {
            window.location.href = 'login.html';
        }
    },
    logout: () => {
        if (confirm('ログアウトしますか？')) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
};

/**
 * Toast Notification Component
 */
const Toast = {
    show: (message, type = 'info') => {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<span>${message}</span>`;

        container.appendChild(el);

        // Auto remove
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }
};

/**
 * Theme Management
 */
const Theme = {
    init: () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        Theme.renderToggle();
    },
    toggle: () => {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        Theme.updateToggleIcon();
    },
    renderToggle: () => {
        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', 'テーマ切り替え');
        button.onclick = Theme.toggle;
        document.body.appendChild(button);
        Theme.updateToggleIcon();
    },
    updateToggleIcon: () => {
        const button = document.querySelector('.theme-toggle');
        if (!button) return;
        const theme = document.documentElement.getAttribute('data-theme');
        button.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
};

/**
 * Initialize
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    Theme.init();
    // Only verify auth if standard page
    Auth.checkContext();
});
