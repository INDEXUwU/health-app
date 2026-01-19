/**
 * Shared Components & Logic
 */

// --- Navigation Config ---
const NAV_ITEMS = [
    { label: 'ホーム', icon: '', href: 'home.html' },
    { label: '食事', icon: '', href: 'record_meal.html' },
    { label: '運動', icon: '', href: 'record_exercise.html' },
    { label: '体重', icon: '', href: 'record_weight.html' },
    { label: '予定', icon: '', href: 'schedule.html' },
    { label: 'グラフ', icon: '', href: 'history.html' },
    { label: '設定', icon: '', href: 'user_info.html' },
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
                <span></span> 健康管理アプリ
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
                    <span class="nav-icon"></span>
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
    logout: async () => {
        const result = await Modal.confirm('ログアウトしますか？', '確認', {
            okText: 'ログアウト',
            okType: 'danger' // Use danger style for logout to be consistent or maybe just primary? Let's use primary as it's not destructive per se, but user used danger in concept. Actually, let's keep it neutral or primary. But wait, plan says "danger" for deletion. Logout is usually neutral. Let's use primary for logout.
            // Wait, looking at the image in the prompt, there is a dark styled popup.
            // Let's stick to the plan.
        });

        if (result) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
};

/**
 * Custom Modal Component
 * Replaces native alert/confirm
 */
const Modal = {
    /**
     * Show a confirmation modal
     * @param {string} message 
     * @param {string} title 
     * @param {object} options { okText, cancelText, type: 'default'|'danger' }
     * @returns {Promise<boolean>} true if OK, false if Cancel
     */
    confirm: (message, title = '確認', options = {}) => {
        return new Promise((resolve) => {
            const { okText = 'OK', cancelText = 'キャンセル', type = 'default' } = options;

            // Create elements
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const container = document.createElement('div');
            container.className = 'modal-container';

            // Determine button class based on type
            const okBtnClass = type === 'danger' ? 'modal-btn modal-btn-danger' : 'modal-btn modal-btn-ok';

            container.innerHTML = `
                <div class="modal-title">${title}</div>
                <div class="modal-message">${message.replace(/\n/g, '<br>')}</div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">${cancelText}</button>
                    <button class="${okBtnClass}" id="modal-ok-btn">${okText}</button>
                </div>
            `;

            overlay.appendChild(container);
            document.body.appendChild(overlay);

            // Animation start
            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });

            // Handlers
            const close = (result) => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                    }
                    resolve(result);
                }, 300); // Match transition duration
            };

            document.getElementById('modal-cancel-btn').onclick = () => close(false);
            const okBtn = document.getElementById('modal-ok-btn');
            okBtn.onclick = () => close(true);
            okBtn.focus(); // Focus on OK for accessibility

            // Close on click outside (optional, good UX)
            overlay.onclick = (e) => {
                if (e.target === overlay) close(false);
            };

            // Handle Escape key
            const keyHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', keyHandler);
                    close(false);
                }
            };
            document.addEventListener('keydown', keyHandler);
        });
    },

    /**
     * Show an alert modal
     * @param {string} message 
     * @param {string} title 
     * @returns {Promise<void>}
     */
    alert: (message, title = 'お知らせ') => {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const container = document.createElement('div');
            container.className = 'modal-container';

            container.innerHTML = `
                <div class="modal-title">${title}</div>
                <div class="modal-message">${message.replace(/\n/g, '<br>')}</div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-ok" id="modal-ok-btn">OK</button>
                </div>
            `;

            overlay.appendChild(container);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });

            const close = () => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                    }
                    resolve();
                }, 300);
            };

            const okBtn = document.getElementById('modal-ok-btn');
            okBtn.onclick = close;
            okBtn.focus();

            overlay.onclick = (e) => {
                if (e.target === overlay) close();
            };

            const keyHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', keyHandler);
                    close();
                }
            };
            document.addEventListener('keydown', keyHandler);
        });
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
