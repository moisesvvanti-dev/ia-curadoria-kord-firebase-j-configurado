// --- LUMINOUS ENGINE v9.0 (With Popular Tracking) ---

let worker;
let allItems = [];
let displayedCount = 0;
const BATCH_SIZE = 50;
let currentCategory = 'All';

// ============================================================
// CLICK TRACKING SYSTEM (LocalStorage based)
// ============================================================
const ClickTracker = (() => {
    const getWeekId = () => {
        const d = new Date();
        const year = d.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${year}-W${weekNum.toString().padStart(2, '0')}`;
    };

    // Robust ID generator for Firebase keys (Unicode safe)
    const getToolId = (url) => {
        try {
            return btoa(unescape(encodeURIComponent(url))).replace(/[/+=]/g, '');
        } catch (e) {
            return btoa(url.substring(0, 10)).replace(/[/+=]/g, '');
        }
    };

    const track = async (toolName, toolUrl) => {
        const anonCheckbox = document.getElementById('anonymousMode');
        if (anonCheckbox && anonCheckbox.checked) {
            console.log('Navegação anônima ativa. Clique não registrado.');
            return;
        }

        // Security Shield Rate Limiting
        if (window.LuminousShield && !window.LuminousShield.checkRateLimit()) {
            return;
        }

        try {
            console.log(`[ClickTracker] Tracking click for: ${toolName}`);
            if (typeof ChangelogManager !== 'undefined' && ChangelogManager.init) {
                await ChangelogManager.init();
            }

            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                console.warn("[ClickTracker] Firebase not initialized for tracking");
                return;
            }

            const toolId = getToolId(toolUrl || toolName);
            const weekId = getWeekId();
            const ref = firebase.database().ref(`popular_stats/${weekId}/${toolId}`);

            await ref.transaction((current) => {
                return (current || 0) + 1;
            });
            console.log(`[ClickTracker] Success: ${toolName} (${toolId})`);
        } catch (e) {
            console.error("[ClickTracker] Track failed:", e);
        }
    };

    const getPopular = async (limit = 5) => {
        try {
            console.log(`[ClickTracker] Fetching top ${limit} items...`);
            if (typeof ChangelogManager !== 'undefined' && ChangelogManager.init) {
                await ChangelogManager.init();
            }

            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                console.warn("[ClickTracker] Firebase not initialized for fetching");
                return [];
            }

            const weekId = getWeekId();
            const snap = await firebase.database().ref(`popular_stats/${weekId}`)
                .orderByValue()
                .limitToLast(limit * 2) // Fetch a bit more to ensure we have matches
                .once('value');

            const raw = snap.val() || {};
            const items = [];
            for (const [id, clicks] of Object.entries(raw)) {
                items.push({ id, clicks });
            }
            items.sort((a, b) => b.clicks - a.clicks);
            console.log(`[ClickTracker] Found ${items.length} popular items in Firebase`);
            return items;
        } catch (e) {
            console.error("[ClickTracker] getPopular failed:", e);
            return [];
        }
    };

    return { track, getPopular, getToolId };
})();

// ============================================================
// GLOBAL NAVIGATION
// ============================================================
window.switchView = function (viewName) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.style.display = (viewName === 'kord') ? 'flex' : 'block';

    // Update Desktop Nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const sidebarLink = document.querySelector(`.nav-item[onclick*="switchView('${viewName}')"]`);
    if (sidebarLink) sidebarLink.classList.add('active');

    // Update Mobile Nav
    document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
    const mobileLink = document.querySelector(`.mobile-nav-item[onclick*="switchView('${viewName}')"]`);
    if (mobileLink) mobileLink.classList.add('active');

    if (viewName === 'explore') {
        const grid = document.getElementById('aiGrid');
        if (grid && grid.children.length === 0) renderBatch();
    }

    // Load popular items when popular view is opened
    if (viewName === 'popular') {
        renderPopularView();
    }

    // Load ranking when support view is opened
    if (viewName === 'support' && typeof RankingManager !== 'undefined') {
        RankingManager.loadRanking();
    }

    // Load favorites when favorites view is opened
    if (viewName === 'favorites') {
        renderFavoritesView();
    }

    // Load changelog when changelog view is opened
    if (viewName === 'changelog' && typeof ChangelogManager !== 'undefined') {
        ChangelogManager.startListening();
    }
};

window.scrollToGrid = function () {
    const scroller = document.querySelector('.content-scroll') || window;
    scroller.scrollTo({ top: 300, behavior: 'smooth' });
};

// ============================================================
// OPEN TOOL WITH TRACKING
// ============================================================
window.openTool = function (name, url) {
    // Track the click
    ClickTracker.track(name, url);

    // Open in new tab
    window.open(url, '_blank');
};

// ============================================================
// FAVORITES SYSTEM
// ============================================================
const FavoritesManager = (() => {
    const STORAGE_KEY = 'luminous_favorites';

    const getFavorites = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    };

    const saveFavorites = (favorites) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    };

    const toggle = (tool) => {
        let favorites = getFavorites();
        const index = favorites.findIndex(f => f.url === tool.url);

        if (index > -1) {
            favorites.splice(index, 1);
            showToast('Removido dos favoritos', 'info');
        } else {
            favorites.push({
                name: tool.name,
                url: tool.url,
                category: tool.category,
                description: tool.description,
                savedAt: Date.now()
            });
            showToast('Adicionado aos favoritos!', 'success');
        }

        saveFavorites(favorites);
    };

    const isFavorite = (url) => {
        return getFavorites().some(f => f.url === url);
    };

    return { getFavorites, toggle, isFavorite };
})();

// Simple toast for favorites
function showToast(message, type) {
    const existing = document.querySelector('.mini-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'mini-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${type === 'success' ? '#10b981' : '#6366f1'};
        color: white;
        border-radius: 12px;
        font-weight: 500;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ============================================================
// RENDER POPULAR VIEW
// ============================================================
async function renderPopularView() {
    const grid = document.getElementById('popularGrid');
    if (!grid) return;

    console.log("[PopularView] Iniciando renderização...");
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">🔥 Calculando tendências globais...</div>';

    try {
        // Ensure database is loaded
        if (allItems.length === 0) {
            console.log("[PopularView] Aguardando banco de dados (allItems)...");
            await new Promise(res => {
                const check = setInterval(() => {
                    if (allItems.length > 0) { clearInterval(check); res(); }
                }, 100);
                setTimeout(() => { clearInterval(check); res(); }, 3000);
            });
        }

        const popularItems = await ClickTracker.getPopular(10); // Busca 10 para garantir que teremos 5 válidos com match
        console.log("[PopularView] Dados recebidos do Firebase:", popularItems);

        if (popularItems.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; grid-column: 1/-1;">
                    <span class="material-icons-round" style="font-size: 4rem; color: #333; margin-bottom: 16px; display: block;">local_fire_department</span>
                    <h3 style="color: #888; margin-bottom: 8px;">Nenhum item popular global ainda</h3>
                    <p style="color: #555; font-size: 0.9rem;">Os 5 itens mais acessados de todo o site aparecerão aqui!</p>
                </div>
            `;
            return;
        }

        let html = '';
        const badges = ['🥇', '🥈', '🥉', '✨', '⚡'];
        const rankColors = ['#fbbf24', '#94a3b8', '#d97706', '#a855f7', '#22d3ee'];

        let matchesFound = 0;
        for (const stat of popularItems) {
            if (stat.clicks < 1 || matchesFound >= 5) break;

            const fullTool = allItems.find(t => ClickTracker.getToolId(t.url) === stat.id);
            if (!fullTool) {
                console.warn(`[PopularView] Sem correspondência no banco de dados para o ID: ${stat.id}`);
                continue;
            }

            matchesFound++;
            const name = fullTool.name;
            const url = fullTool.url;
            const desc = fullTool.description || "Favorita da comunidade esta semana";

            let icon = '';
            if (url) {
                try {
                    const domain = new URL(url).hostname;
                    icon = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=128" style="border-radius:12px;" loading="lazy">`;
                } catch { icon = '🔥'; }
            } else {
                icon = '🔥';
            }

            const rankBadge = `<div class="rank-badge rank-${matchesFound}">${badges[matchesFound - 1]}</div>`;
            const safeName = escapeHtml(name).replace(/'/g, "\\'");
            const safeUrl = escapeHtml(url).replace(/'/g, "\\'");

            html += `
                <div class="tool-card popular-card" onclick="openTool('${safeName}', '${safeUrl}')" style="border-top: 3px solid ${rankColors[matchesFound - 1]}">
                    ${rankBadge}
                    <div class="card-top">
                        <div class="tool-icon">${icon}</div>
                    </div>
                    <div class="tool-name">${escapeHtml(name)}</div>
                    <div class="tool-desc" style="margin-bottom: 40px; min-height: 48px;">${escapeHtml(desc)}</div>
                    <div class="popular-clicks-badge">${stat.clicks} ${stat.clicks === 1 ? 'clique global' : 'cliques globais'}</div>
                </div>
            `;
        }

        grid.innerHTML = html || `
            <div style="text-align: center; padding: 60px 20px; grid-column: 1/-1;">
                <h3 style="color: #888;">Quase lá...</h3>
                <p style="color: #555;">Sincronizando dados dos itens populares com o catálogo.</p>
            </div>
        `;
    } catch (err) {
        console.error("[PopularView] Erro crítico na renderização:", err);
        grid.innerHTML = '<div style="text-align:center;padding:40px;color:#f44;">⚠️ Erro ao carregar ranking global. Verifique o console (F12).</div>';
    }
}

// ============================================================
// RENDER FAVORITES VIEW
// ============================================================
function renderFavoritesView() {
    const container = document.getElementById('view-favorites');
    if (!container) return;

    const favorites = FavoritesManager.getFavorites();
    let html = `<h1>Salvos</h1>`;

    if (favorites.length === 0) {
        html += `
            <div style="text-align: center; padding: 60px 20px;">
                <span class="material-icons-round" style="font-size: 4rem; color: #333; margin-bottom: 16px; display: block;">bookmark_border</span>
                <p style="color: #888;">Seus itens favoritos aparecerão aqui.</p>
                <p style="color: #555; font-size: 0.85rem; margin-top: 8px;">Clique no ❤️ em uma ferramenta para salvar.</p>
            </div>
        `;
    } else {
        html += `<p style="color:#888; margin-bottom: 24px;">${favorites.length} item(ns) salvo(s)</p>`;
        html += '<div class="masonry-grid" id="favoritesGrid"></div>';

        container.innerHTML = html;
        const grid = document.getElementById('favoritesGrid');

        let gridHtml = '';
        favorites.forEach(tool => {
            gridHtml += createCardHTML(tool);
        });
        grid.innerHTML = gridHtml;
        return;
    }
    container.innerHTML = html;
}

// ============================================================
// ESCAPE HTML
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// INIT APP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Search with Debounce (Avoid premature discovery triggers)
    const searchInput = document.getElementById('globalSearch');
    let searchTimeout;

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            const grid = document.getElementById('aiGrid');

            // Limpa o timer anterior para esperar o usuário terminar de digitar
            clearTimeout(searchTimeout);

            if (!val) {
                grid.innerHTML = '';
                displayedCount = 0;
                renderBatch(); // Show default list
                return;
            }

            // Debounce de 800ms para disparar a busca/descoberta
            searchTimeout = setTimeout(() => {
                grid.innerHTML = ''; // Reset grid only when search fires

                // LOG DE ATIVIDADE: Mais complexo e detalhado para análise (Observabilidade)
                if (typeof firebase !== 'undefined' && firebase.apps.length) {
                    // Garantir ID de sessão
                    let sessId = sessionStorage.getItem('luminous_sess');
                    if (!sessId) {
                        sessId = Math.random().toString(36).substring(2, 10);
                        sessionStorage.setItem('luminous_sess', sessId);
                    }

                    firebase.database().ref('search_activity').push({
                        query: val,
                        timestamp: Date.now(),
                        session: sessId,
                        platform: navigator.platform,
                        is_mobile: /Mobi|Android/i.test(navigator.userAgent),
                        screen: `${window.screen.width}x${window.screen.height}`
                    });
                }

                const filtered = allItems.filter(i =>
                    (i.name && i.name.toLowerCase().includes(val)) ||
                    (i.description && i.description.toLowerCase().includes(val)) ||
                    (i.category && i.category.toLowerCase().includes(val))
                );

                // DISCOVERY TRIGGER: Adicionar à fila se poucos resultados (0-2)
                if (filtered.length <= 2 && val.length > 2) {
                    if (typeof firebase !== 'undefined' && firebase.apps.length) {
                        const discoveryRef = firebase.database().ref('discovery_queue');
                        discoveryRef.push(val);
                        console.log(`[Discovery] Termo '${val}' adicionado à fila (${filtered.length} resultados).`);
                    }
                }

                if (filtered.length === 0) {
                    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);grid-column: 1 / -1;width: 100%;">
                        <span class="material-icons-round" style="font-size:3rem;margin-bottom:15px;display:block;color:#6366f1">search_off</span>
                        Fim do mundo? Não achei essa IA...<br>
                        <span style="font-size:0.9rem;opacity:0.7">Acabei de enviar uma ordem de busca para meu robô. 
                        Volte em instantes e ela estará aqui! 🚀</span>
                    </div>`;
                } else {
                    renderList(filtered, grid, 100);
                }
            }, 800);
        });
    }

    // 2. Initialize Core App
    initApp();

    // 3. Check for Direct Message Links (Kord)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('msg')) {
        setTimeout(() => {
            switchView('kord');
        }, 500); // Small delay to let Firebase Auth and layouts settle
    }

    // 3. Infinite Scroll (Simple)
    const scroller = document.querySelector('.content-scroll');
    if (scroller) {
        let isThrottled = false;
        scroller.addEventListener('scroll', () => {
            if (isThrottled) return;
            isThrottled = true;
            setTimeout(() => {
                if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 500) {
                    renderBatch();
                }
                isThrottled = false;
            }, 100);
        });
    }

    // 4. Add popular styles
    addPopularStyles();
});

function initApp() {
    const grid = document.getElementById('aiGrid');
    if (!grid) return;

    grid.innerHTML = '<div style="color:#aaa; text-align:center; padding:40px;">Carregando IAs...</div>';

    // Anonymous Mode Initial State
    const anonCheckbox = document.getElementById('anonymousMode');
    if (anonCheckbox) {
        anonCheckbox.checked = localStorage.getItem('luminous_anonymous') === 'true';
        anonCheckbox.addEventListener('change', () => {
            localStorage.setItem('luminous_anonymous', anonCheckbox.checked);
        });
    }

    // Eco Mode Logic
    const ecoCheckbox = document.getElementById('ecoMode');
    if (ecoCheckbox) {
        const isEco = localStorage.getItem('luminous_eco') === 'true';
        ecoCheckbox.checked = isEco;
        if (isEco) document.body.classList.add('eco-mode');

        ecoCheckbox.addEventListener('change', () => {
            const active = ecoCheckbox.checked;
            localStorage.setItem('luminous_eco', active);
            document.body.classList.toggle('eco-mode', active);
            console.log(`[EcoManager] Mode: ${active ? 'ON' : 'OFF'}`);
        });
    }

    // Access Logging ( respetando o Modo Anônimo )
    const isAnonymous = localStorage.getItem('luminous_anonymous') === 'true';
    if (!isAnonymous && typeof firebase !== 'undefined' && firebase.apps.length) {
        try {
            const logRef = firebase.database().ref('access_logs').push();
            logRef.set({
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                userAgent: navigator.userAgent,
                language: navigator.language,
                screen: `${window.screen.width}x${window.screen.height}`,
                referrer: document.referrer || 'direto',
                url: window.location.href
            });
            console.log("[AccessLogger] Log de acesso registrado.");
        } catch (e) {
            console.error("[AccessLogger] Falha ao registrar log:", e);
        }
    }

    // FIREBASE DATABASE FETCH (Real-time update)
    const fetchFromFirebase = () => {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                throw new Error("Firebase not ready");
            }

            const dbRef = firebase.database().ref('tools');

            // Usar .on('value') para atualizações instantâneas

            dbRef.on('value', (snap) => {
                const data = snap.val();

                if (!data) {
                    console.log("[Database] Banco Firebase vazio.");
                    grid.innerHTML = '<div style="color:#aaa; text-align:center; padding:40px;">📭 Nenhuma IA encontrada no banco.</div>';
                } else {
                    const rawList = Array.isArray(data) ? data : Object.values(data);
                    const newList = rawList.filter(item => item !== null && typeof item === 'object' && item.name);

                    if (JSON.stringify(newList) === JSON.stringify(allItems)) return;

                    allItems = newList;
                    console.log(`[Database] ${allItems.length} IAs sincronizadas.`);

                    // Reset e re-render apenas se necessário
                    displayedCount = 0;
                    grid.innerHTML = '';
                    renderBatch();
                }
            });
        } catch (err) {
            console.error("[Database] Erro fatal:", err);
            grid.innerHTML = '<div style="color:#ffaa00; text-align:center; padding:40px;">⚠️ Erro de conexão com o Banco Firebase.</div>';
        }
    };

    fetchFromFirebase();
}

function renderBatch() {
    const grid = document.getElementById('aiGrid');
    if (!grid) return;

    let targetItems = allItems;
    if (currentCategory !== 'All') {
        const catLower = currentCategory.toLowerCase();
        targetItems = allItems.filter(item =>
            (item.category && item.category.toLowerCase().includes(catLower)) ||
            (item.tags && item.tags.some(t => t.toLowerCase().includes(catLower)))
        );
    }

    if (displayedCount >= targetItems.length && displayedCount > 0) return;

    // Clear innerHTML if it's the very first batch and we were searching/loading
    if (displayedCount === 0 && grid.innerHTML.includes('Carregando IAs')) {
        grid.innerHTML = '';
    }

    const nextBatch = targetItems.slice(displayedCount, displayedCount + BATCH_SIZE);

    if (nextBatch.length === 0 && displayedCount === 0) {
        grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);grid-column: 1 / -1;width: 100%;">
            <span class="material-icons-round" style="font-size:3rem;margin-bottom:15px;display:block;color:#6366f1">category</span>
            Nenhuma IA encontrada para esta categoria ainda.
        </div>`;
        return;
    }

    renderList(nextBatch, grid);
    displayedCount += BATCH_SIZE;
}

// ============================================================
// CATEGORY FILTER SYSTEM
// ============================================================
window.filterByCategory = function (category) {
    currentCategory = category;

    // Update visual pills
    document.querySelectorAll('.cat-chip').forEach(btn => {
        // Remove active class from all
        btn.classList.remove('active');

        // Exact match via onClick snippet to highlight correct button
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`('${category}')`)) {
            btn.classList.add('active');
        }
    });

    const grid = document.getElementById('aiGrid');
    if (grid) {
        grid.innerHTML = '';
        displayedCount = 0;
        renderBatch();
    }
};

function renderList(list, container, limit = null) {
    if (limit) list = list.slice(0, limit);

    let html = '';
    list.forEach(tool => {
        html += createCardHTML(tool);
    });

    // Using insertAdjacentHTML is faster than reflowing DOM for each item
    container.insertAdjacentHTML('beforeend', html);
}

function createCardHTML(tool) {
    // Icon Logic (Direct from tool data prioritized)
    let icon = '';
    if (tool.logo) {
        icon = `<img src="${tool.logo}" style="border-radius:12px;" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${escapeHtml(tool.name)}&background=random&color=fff&size=64'">`;
    } else if (tool.url && tool.url.includes('google.com/search')) {
        const cleanName = tool.name.replace(/[^a-zA-Z]/g, "").substring(0, 2).toUpperCase();
        icon = `<img src="https://ui-avatars.com/api/?name=${cleanName}&background=random&color=fff&size=64&font-size=0.5&bold=true&rounded=true" style="border-radius:12px;" loading="lazy">`;
    } else if (tool.url) {
        try {
            const domain = new URL(tool.url).hostname;
            icon = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=128" style="border-radius:12px;" loading="lazy">`;
        } catch (e) { icon = '★'; }
    } else {
        icon = `<span class="material-icons-round" style="color:#fff">smart_toy</span>`;
    }

    // Escape for onclick
    const safeName = escapeHtml(tool.name).replace(/'/g, "\\'");
    const safeUrl = escapeHtml(tool.url).replace(/'/g, "\\'");
    const safeDesc = escapeHtml(tool.description || '').replace(/'/g, "\\'");
    const safeCat = escapeHtml(tool.category || 'IA').replace(/'/g, "\\'");

    // Favorite Status
    const isFav = FavoritesManager.isFavorite(tool.url);
    const favIcon = isFav ? 'favorite' : 'favorite_border';
    const favClass = isFav ? 'active' : '';

    // Pricing Tag Logic
    let pricingHTML = '';
    if (tool.pricing_tag) {
        let color = '#6366f1'; // Blue
        if (tool.pricing_tag.includes('Grátis')) color = '#10b981'; // Green
        if (tool.pricing_tag.includes('Créditos')) color = '#f59e0b'; // Amber
        if (tool.pricing_tag.includes('Pago')) color = '#ef4444'; // Red

        pricingHTML = `<div class="pricing-badge" style="background:${color}22; color:${color}; border: 1px solid ${color}44;">${tool.pricing_tag}</div>`;
    }

    return `
        <div class="tool-card animate-fadeIn">
            <div class="btn-favorite ${favClass}" onclick="toggleFavorite(event, '${safeName}', '${safeUrl}', '${safeCat}', '${safeDesc}')">
                <span class="material-icons-round" style="font-size: 18px;">${favIcon}</span>
            </div>
            <div onclick="openTool('${safeName}', '${safeUrl}')">
                <div class="card-top">
                    <div class="tool-icon">${icon}</div>
                    <div class="badges-row">
                        <div class="tool-badge">${tool.category || 'IA'}</div>
                        ${pricingHTML}
                    </div>
                </div>
                <div class="tool-name">${escapeHtml(tool.name)}</div>
                <div class="tool-desc">${escapeHtml(tool.description) || ''}</div>
            </div>
        </div>
    `;
}

// Global Toggle Favorite
window.toggleFavorite = function (event, name, url, category, description) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const tool = { name, url, category, description };

    FavoritesManager.toggle(tool);

    const isNowFav = FavoritesManager.isFavorite(url);
    const icon = btn.querySelector('.material-icons-round');

    if (isNowFav) {
        btn.classList.add('active');
        icon.textContent = 'favorite';
    } else {
        btn.classList.remove('active');
        icon.textContent = 'favorite_border';

        // If we are in favorites view, we might want to hide the card immediately
        if (document.getElementById('view-favorites').style.display === 'block') {
            const card = btn.closest('.tool-card');
            if (card) {
                card.style.opacity = '0.3';
                card.style.pointerEvents = 'none';
                setTimeout(() => card.remove(), 400);
            }
        }
    }
};

// ============================================================
// SETTINGS FUNCTIONS
// ============================================================
window.toggleTheme = function () {
    const isDark = document.body.classList.toggle('light-theme');
    const btn = document.querySelector('.btn-toggle');
    if (btn) {
        btn.textContent = document.body.classList.contains('light-theme') ? 'LIGHT MODE' : 'DARK MODE';
        btn.style.background = document.body.classList.contains('light-theme') ? '#eee' : 'rgba(99,102,241,0.2)';
        btn.style.color = document.body.classList.contains('light-theme') ? '#333' : '#fff';
    }
};

window.clearTracking = function () {
    showConfirmModal(
        '🗑️ Limpar Histórico',
        'Deseja realmente limpar seu histórico de cliques? Esta ação não pode ser desfeita.',
        () => {
            localStorage.removeItem('luminous_clicks');
            showToast('Histórico limpo!', 'success');
            if (document.getElementById('view-popular').style.display === 'block') {
                renderPopularView();
            }
        }
    );
};

// Custom Confirm Modal (Beautiful & Responsive)
function showConfirmModal(title, message, onConfirm) {
    // Remove existing modal if any
    const existing = document.getElementById('customConfirmModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'customConfirmModal';
    modal.innerHTML = `
        <div class="confirm-overlay"></div>
        <div class="confirm-box">
            <div class="confirm-icon">⚠️</div>
            <h3 class="confirm-title">${title}</h3>
            <p class="confirm-message">${message}</p>
            <div class="confirm-buttons">
                <button class="confirm-btn confirm-cancel">Cancelar</button>
                <button class="confirm-btn confirm-ok">Confirmar</button>
            </div>
        </div>
    `;

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        #customConfirmModal {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .confirm-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            animation: fadeIn 0.2s ease;
        }
        .confirm-box {
            position: relative;
            background: linear-gradient(145deg, var(--surface-hover), var(--surface-card));
            border: 1px solid var(--border-highlight);
            border-radius: 20px;
            padding: 32px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-subtle);
            animation: modalSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .confirm-icon {
            font-size: 3rem;
            margin-bottom: 16px;
            filter: drop-shadow(0 0 10px rgba(255, 200, 0, 0.3));
        }
        .confirm-title {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 12px;
        }
        .confirm-message {
            color: var(--text-secondary);
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 28px;
        }
        .confirm-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        .confirm-btn {
            padding: 12px 28px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            min-width: 120px;
        }
        .confirm-cancel {
            background: var(--surface-base);
            color: var(--text-secondary);
            border: 1px solid var(--border-subtle);
        }
        .confirm-cancel:hover {
            background: var(--surface-hover);
            color: var(--text-primary);
        }
        .confirm-ok {
            background: var(--accent);
            color: #fff;
            box-shadow: 0 4px 15px var(--accent-glow);
        }
        .confirm-ok:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px var(--accent-glow);
        }
        @keyframes modalSlideIn {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (max-width: 480px) {
            .confirm-box { padding: 24px 20px; }
            .confirm-title { font-size: 1.25rem; }
            .confirm-buttons { flex-direction: column; }
            .confirm-btn { width: 100%; }
        }
    `;
    modal.appendChild(style);
    document.body.appendChild(modal);

    // Event Listeners
    modal.querySelector('.confirm-overlay').onclick = () => modal.remove();
    modal.querySelector('.confirm-cancel').onclick = () => modal.remove();
    modal.querySelector('.confirm-ok').onclick = () => {
        modal.remove();
        onConfirm();
    };
};

// ============================================================
// POPULAR STYLES & MOBILE OPTIMIZATION
// ============================================================
function addPopularStyles() {
    const isMobile = window.innerWidth <= 768;
    const style = document.createElement('style');
    style.textContent = `
        .popular-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: linear-gradient(135deg, #ff4b2b, #ff416c);
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.7rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
            z-index: 10;
            box-shadow: 0 4px 12px rgba(255, 75, 43, 0.3);
        }
        
        /* Mobile Performance Tweaks */
        @media (max-width: 768px) {
            .app-shell {
                will-change: transform;
            }
            .content-scroll {
                -webkit-overflow-scrolling: touch;
            }
            .tool-card {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                border: 1px solid rgba(255,255,255,0.05);
            }
            .popular-badge {
                top: 8px;
                right: 8px;
                font-size: 0.6rem;
                padding: 3px 6px;
            }
            .btn-favorite {
                top: 8px;
                right: 8px;
                width: 28px;
                height: 28px;
            }
        }

        .light-theme {
            --surface-bg: #f8fafc;
            --surface-card: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border-color: rgba(0,0,0,0.05);
        }
        .light-theme .sidebar { background: #f1f5f9; border-right: 1px solid #e2e8f0; }
        .light-theme .brand { color: #000; }
        .light-theme .nav-item { color: #64748b; }
        .light-theme .tool-card { background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
        .light-theme .tool-name { color: #1e293b; }
        .light-theme .main-view { background: #f8fafc; }
        .light-theme .app-header { background: rgba(255,255,255,0.8); border-bottom: 1px solid #e2e8f0; }
        .light-theme .search-input { background: #fff; border: 1px solid #e2e8f0; color: #1e293b; }
        .light-theme .search-input::placeholder { color: #94a3b8; }
        .light-theme .search-icon { color: #64748b; }
        .light-theme .tool-desc { color: #64748b; }
        .light-theme .tool-badge { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
        .light-theme .content-scroll { background: #f8fafc; }
        .light-theme h1, .light-theme h2, .light-theme h3 { color: #1e293b; }
        .light-theme .hero-clean p { color: #64748b; }
        .light-theme .hero-clean h1 { background: linear-gradient(to bottom right, #1e293b, #475569); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        
        /* FAVORITES & UI ELEMENTS */
        .btn-favorite {
            position: absolute;
            top: 15px;
            right: 15px;
            width: 32px;
            height: 32px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 15;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
            backdrop-filter: blur(5px);
        }

        .btn-favorite:hover {
            transform: scale(1.1);
            background: rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.5);
            color: #ef4444;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
        }

        .btn-favorite.active {
            background: #ef4444;
            color: #fff;
            border-color: #ef4444;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
            animation: favPulse 0.4s ease-out;
        }

        @keyframes favPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }

        .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
        }
        
        .popular-card { position: relative; min-height: 180px; }
        .rank-badge { position: absolute !important; top: 12px !important; right: 12px !important; background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; color: #888; z-index: 20 !important; }
        .rank-badge.rank-1 { background: linear-gradient(135deg, #fbbf24, #f59e0b) !important; color: #000 !important; font-size: 1rem; box-shadow: 0 0 15px rgba(245, 158, 11, 0.4); }
        .rank-badge.rank-2 { background: linear-gradient(135deg, #94a3b8, #64748b) !important; color: #000 !important; }
        .rank-badge.rank-3 { background: linear-gradient(135deg, #d97706, #b45309) !important; color: #fff !important; }
        .rank-badge.rank-4 { background: linear-gradient(135deg, #a855f7, #6366f1) !important; color: #fff !important; }
        .rank-badge.rank-5 { background: linear-gradient(135deg, #22d3ee, #0ea5e9) !important; color: #fff !important; }
        
        .popular-clicks-badge {
            position: absolute !important;
            bottom: 15px !important;
            right: 15px !important;
            background: rgba(99, 102, 241, 0.15) !important;
            border: 1px solid rgba(99, 102, 241, 0.3) !important;
            padding: 6px 12px !important;
            border-radius: 10px !important;
            font-size: 0.75rem !important;
            color: #818cf8 !important;
            font-weight: 700 !important;
            backdrop-filter: blur(10px) !important;
            z-index: 10 !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        @keyframes slideDown { from { transform: translateX(-50%) translateY(-100px); opacity:0; } to { transform: translateX(-50%) translateY(0); opacity:1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
}

// ============================================================
// BUG REPORT SYSTEM - Firebase Persistence
// ============================================================
window.openBugReport = function () {
    const existing = document.getElementById('bugReportModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'bugReportModal';
    modal.innerHTML = `
        <div class="bug-overlay"></div>
        <div class="bug-box">
            <button class="bug-close" onclick="closeBugReport()">×</button>
            <div class="bug-icon">🐛</div>
            <h2 class="bug-title">Reportar Bug ou Falha</h2>
            <p class="bug-subtitle">Seu feedback ajuda a melhorar o sistema!</p>
            
            <form id="bugForm" onsubmit="submitBugReport(event)">
                <div class="bug-field">
                    <label>Tipo de Problema</label>
                    <select id="bugType" required>
                        <option value="">Selecione...</option>
                        <option value="visual">🎨 Bug Visual / Layout</option>
                        <option value="funcional">⚙️ Funcionalidade não funciona</option>
                        <option value="performance">🐌 Lentidão / Performance</option>
                        <option value="erro">❌ Erro / Crash</option>
                        <option value="sugestao">💡 Sugestão de Melhoria</option>
                        <option value="outro">📝 Outro</option>
                    </select>
                </div>
                
                <div class="bug-field">
                    <label>Descreva o Problema</label>
                    <textarea id="bugDescription" rows="4" placeholder="Explique detalhadamente o que aconteceu..." required></textarea>
                </div>
                
                <div class="bug-field">
                    <label>Página/Seção Afetada (opcional)</label>
                    <input type="text" id="bugPage" placeholder="Ex: Página Popular, Modal de Doação...">
                </div>
                
                <div class="bug-field">
                    <label>Seu Email (opcional, para resposta)</label>
                    <input type="email" id="bugEmail" placeholder="email@exemplo.com">
                </div>
                
                <button type="submit" class="bug-submit">
                    <span class="material-icons-round">send</span>
                    Enviar Relatório
                </button>
            </form>
        </div>
    `;

    // Styles
    const style = document.createElement('style');
    style.id = 'bugReportStyles';
    style.textContent = `
        #bugReportModal {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .bug-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            animation: fadeIn 0.2s ease;
        }
        .bug-box {
            position: relative;
            background: linear-gradient(145deg, #1a1a22, #12121a);
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 24px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.1);
            animation: modalSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .bug-close {
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            color: #666;
            font-size: 2rem;
            cursor: pointer;
            transition: color 0.2s;
            z-index: 20;
            padding: 10px;
            min-width: 44px;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .bug-close:hover { color: #fff; }
        .bug-icon {
            font-size: 4rem;
            text-align: center;
            margin-bottom: 15px;
            filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.4));
        }
        .bug-title {
            text-align: center;
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            font-weight: 700;
            color: #fff;
            margin: 0 0 8px 0;
        }
        .bug-subtitle {
            text-align: center;
            color: #8a8a93;
            font-size: 0.95rem;
            margin: 0 0 30px 0;
        }
        .bug-field {
            margin-bottom: 20px;
        }
        .bug-field label {
            display: block;
            color: #a1a1aa;
            font-size: 0.85rem;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .bug-field input,
        .bug-field select,
        .bug-field textarea {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 16px;
            color: #fff;
            font-size: 0.95rem;
            font-family: inherit;
            transition: all 0.2s;
        }
        .bug-field input:focus,
        .bug-field select:focus,
        .bug-field textarea:focus {
            outline: none;
            border-color: #f59e0b;
            background: rgba(245, 158, 11, 0.05);
        }
        .bug-field textarea {
            resize: vertical;
            min-height: 100px;
        }
        .bug-field select option {
            background: #1a1a22;
            color: #fff;
        }
        .bug-submit {
            width: 100%;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #000;
            font-weight: 700;
            font-size: 1rem;
            padding: 14px 24px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s;
            margin-top: 10px;
        }
        .bug-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(245, 158, 11, 0.35);
        }
        .bug-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        @media (max-width: 500px) {
            .bug-box { padding: 25px 20px; }
            .bug-title { font-size: 1.4rem; }
        }
    `;
    if (!document.getElementById('bugReportStyles')) {
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Event Listeners Robustos
    const closeBtn = modal.querySelector('.bug-close');
    const overlay = modal.querySelector('.bug-overlay');

    // Support both click and touch
    const handleClose = (e) => {
        if (e) e.preventDefault();
        closeBugReport();
    };

    closeBtn.addEventListener('click', handleClose);
    closeBtn.addEventListener('touchend', handleClose);

    overlay.addEventListener('click', handleClose);
    overlay.addEventListener('touchend', handleClose);
};

window.closeBugReport = function () {
    const modal = document.getElementById('bugReportModal');
    if (modal) modal.remove();
};

window.submitBugReport = async function (e) {
    e.preventDefault();

    const btn = document.querySelector('.bug-submit');

    // ANTI-FLOOD SECURITY
    const lastReport = localStorage.getItem('last_bug_report');
    if (lastReport) {
        const timeDiff = Date.now() - parseInt(lastReport);
        // 5 Minutes Cooldown
        if (timeDiff < 300000) {
            const minutesLeft = Math.ceil((300000 - timeDiff) / 60000);
            showToast(`⏳ Aguarde ${minutesLeft} minutos para enviar outro report.`, 'warning');
            return;
        }
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons-round rotating">sync</span> Enviando...';
    btn.disabled = true;

    const report = {
        type: document.getElementById('bugType').value.trim().substring(0, 49),
        description: document.getElementById('bugDescription').value.trim().substring(0, 1999), // Protects against length > 2000 rule
        page: (document.getElementById('bugPage').value || 'Não acessado').trim().substring(0, 99),
        email: (document.getElementById('bugEmail').value || 'Anônimo').trim().substring(0, 100),
        userAgent: navigator.userAgent.substring(0, 200),
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href.substring(0, 200),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'new',
        read: false
    };

    try {
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            const ref = firebase.database().ref('bug_reports');
            await ref.push(report);

            localStorage.setItem('last_bug_report', Date.now());
            closeBugReport();
            showToast('✅ Bug reportado! Obrigado pelo feedback.', 'success');
        } else {
            throw new Error('Firebase não disponível');
        }
    } catch (error) {
        console.error('❌ [BugReport] Erro detalhado:', error);
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (error.code === 'PERMISSION_DENIED') {
            showToast('❌ Erro de permissão no Firebase. Verifique as regras.', 'error');
            console.warn('⚠️ DICA: Verifique se você aplicou as regras do firebase_rules.json no console do Firebase!');
        } else {
            showToast('❌ Erro ao enviar. Verifique o console (F12).', 'error');
        }
    }
};

// ============================================================
// SYSTEM ANNOUNCEMENT LISTENER (Global Push Notifications)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        let initialLoad = true;

        // Wait briefly to ensure Firebase db is completely ready
        setTimeout(() => {
            const announcementRef = firebase.database().ref('system_config/announcement');

            announcementRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (!data || !data.message) return;

                const lastSeenId = localStorage.getItem('luminous_last_announcement');
                if (lastSeenId && parseInt(lastSeenId) === data.id) {
                    return; // Already seen
                }

                if (initialLoad) {
                    // Ignore old messages on initial load (older than 3 hours)
                    const age = Date.now() - (data.timestamp || 0);
                    if (age > 10800000) {
                        initialLoad = false;
                        return;
                    }
                }
                initialLoad = false;

                // Mark as seen
                localStorage.setItem('luminous_last_announcement', data.id);

                // UI Builder for Alert
                const banner = document.createElement('div');
                banner.style.cssText = `
                    position: fixed;
                    top: -100px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #6366f1, #4338ca);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 14px;
                    box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    z-index: 999999;
                    font-family: 'Outfit', sans-serif;
                    font-weight: 600;
                    min-width: 320px;
                    max-width: 90vw;
                    transition: top 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                `;

                banner.innerHTML = `
                    <div style="background:rgba(255,255,255,0.2);padding:8px;border-radius:10px;display:flex;align-items:center;">
                        <span class="material-icons-round" style="font-size: 24px;">campaign</span>
                    </div>
                    <span style="font-size: 15px; line-height: 1.4; flex: 1;">${data.message.replace(/\n/g, '<br>')}</span>
                    <button onclick="this.parentElement.style.top='-100px'; setTimeout(()=>this.parentElement.remove(), 600)" style="background:transparent;border:none;color:white;cursor:pointer;padding:5px;display:flex;align-items:center;justify-content:center;border-radius:50%;margin-left:10px;opacity:0.8;transition:opacity 0.2s">
                        <span class="material-icons-round" style="font-size:22px;">close</span>
                    </button>
                `;

                document.body.appendChild(banner);

                // Animate In Dropdown
                setTimeout(() => {
                    banner.style.top = '30px';
                }, 100);
            });
        }, 1000);
    }
});
