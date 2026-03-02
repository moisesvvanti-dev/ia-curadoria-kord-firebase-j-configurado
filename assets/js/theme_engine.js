/**
 * ============================================================
 * KORD THEME ENGINE v2.0
 * Dynamic colors + visual effects (Fire, Smoke, Aurora, etc.)
 * ============================================================
 */

function applyCustomTheme(hexColor) {
    if (!hexColor || !hexColor.startsWith('#')) return;
    document.documentElement.style.setProperty('--primary-color', hexColor);
    const rgb = hexToRgbValues(hexColor);
    if (rgb) {
        document.documentElement.style.setProperty('--kord-bg-tint', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`);
        document.documentElement.style.setProperty('--kord-sidebar-tint', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`);
        document.documentElement.style.setProperty('--primary-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
        const darkBg = `rgba(${Math.floor(rgb.r * 0.1)}, ${Math.floor(rgb.g * 0.1)}, ${Math.floor(rgb.b * 0.1)}, 1)`;
        document.documentElement.style.setProperty('--surface-base', darkBg);
    }
}

function applyCustomCSS(cssString) {
    let styleTag = document.getElementById('kord-ai-custom-css');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'kord-ai-custom-css';
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = cssString || '';
}

function hexToRgbValues(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.substring(0, 7));
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function saveThemeColor(hexColor) {
    if (!currentUser) return showKordAlert("Sessão Expirada", "Faça login para salvar seu tema!", "login", "#ef4444");

    if (!/^#([0-9A-Fa-f]+)$/i.test(hexColor)) {
        return showKordAlert("Cor Inválida", "O formato de cor fornecido não é válido. Use o formato #RRGGBB.", "format_color_reset", "#f59e0b");
    }

    firebase.database().ref(`users/${currentUser.uid}/profile`).update({
        themeColor: hexColor
    }).then(() => {
        applyCustomTheme(hexColor);
        showKordAlert("Tema Atualizado", "A nova cor foi aplicada em todo o sistema.", "palette", hexColor.substring(0, 7));
    });
}

// ==========================================================
// VISUAL EFFECTS ENGINE
// ==========================================================
const KORD_EFFECTS = {
    none: { name: 'Nenhum', icon: 'block', desc: 'Sem efeitos visuais', css: '' },
    fire: {
        name: '🔥 Fogo', icon: 'local_fire_department', desc: 'Partículas de fogo ascendentes',
        css: `
            #kord-fx-layer { position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999;overflow:hidden;mix-blend-mode:screen;opacity:0.85; }
            #kord-fx-layer::before, #kord-fx-layer::after {
                content:'';position:absolute;bottom:-20px;width:200vw;height:120px;
                background:linear-gradient(0deg,rgba(239,68,68,0.15),rgba(249,115,22,0.08),transparent);
                animation:kordFireWave 3s ease-in-out infinite alternate;
                filter:blur(20px);
            }
            #kord-fx-layer::after { animation-delay:1.5s;opacity:0.6; }
            @keyframes kordFireWave { 0%{transform:translateX(-10%) scaleY(1);} 100%{transform:translateX(10%) scaleY(1.3);} }
        `
    },
    smoke: {
        name: '💨 Fumaça', icon: 'cloud', desc: 'Neblina suave subindo do fundo',
        css: `
            #kord-fx-layer { position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999;overflow:hidden;mix-blend-mode:screen;opacity:0.7; }
            #kord-fx-layer::before {
                content:'';position:absolute;bottom:0;left:0;width:200%;height:200px;
                background:radial-gradient(ellipse at 30% 100%,rgba(148,163,184,0.1),transparent 60%),
                           radial-gradient(ellipse at 70% 100%,rgba(100,116,139,0.08),transparent 50%);
                animation:kordSmokeDrift 8s ease-in-out infinite alternate;
                filter:blur(30px);
            }
            @keyframes kordSmokeDrift { 0%{transform:translateX(-5%) translateY(0);opacity:0.5;} 100%{transform:translateX(5%) translateY(-30px);opacity:0.8;} }
        `
    },
    frost: {
        name: '❄️ Gelo', icon: 'ac_unit', desc: 'Cristais de gelo nas bordas',
        css: `
            #kord-fx-layer { position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999;mix-blend-mode:screen;opacity:0.9; }
            #kord-fx-layer::before {
                content:'';position:absolute;inset:0;
                background:
                    radial-gradient(ellipse at 0% 0%,rgba(56,189,248,0.1),transparent 30%),
                    radial-gradient(ellipse at 100% 0%,rgba(99,102,241,0.08),transparent 25%),
                    radial-gradient(ellipse at 0% 100%,rgba(34,211,238,0.06),transparent 30%),
                    radial-gradient(ellipse at 100% 100%,rgba(139,92,246,0.05),transparent 25%);
                animation:kordFrostPulse 6s ease-in-out infinite alternate;
            }
            @keyframes kordFrostPulse { 0%{opacity:0.6;filter:blur(0px);} 100%{opacity:1;filter:blur(2px);} }
        `
    },
    neon: {
        name: '⚡ Neon', icon: 'bolt', desc: 'Bordas neon pulsantes',
        css: `
            #kord-fx-layer { position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999;mix-blend-mode:screen;opacity:0.9; }
            #kord-fx-layer::before {
                content:'';position:absolute;inset:3px;
                border:1px solid rgba(99,102,241,0.2);border-radius:20px;
                box-shadow:inset 0 0 60px rgba(99,102,241,0.05),0 0 30px rgba(99,102,241,0.03);
                animation:kordNeonPulse 2s ease-in-out infinite alternate;
            }
            @keyframes kordNeonPulse { 0%{border-color:rgba(99,102,241,0.15);box-shadow:inset 0 0 40px rgba(99,102,241,0.03),0 0 20px rgba(99,102,241,0.02);} 100%{border-color:rgba(139,92,246,0.3);box-shadow:inset 0 0 80px rgba(139,92,246,0.06),0 0 40px rgba(139,92,246,0.04);} }
        `
    },
    aurora: {
        name: '🌊 Aurora', icon: 'waves', desc: 'Aurora boreal flutuante',
        css: `
            #kord-fx-layer { position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999;overflow:hidden;mix-blend-mode:screen;opacity:0.6; }
            #kord-fx-layer::before, #kord-fx-layer::after {
                content:'';position:absolute;width:150%;height:60%;top:0;left:-25%;
                background:linear-gradient(135deg,rgba(34,211,238,0.06),rgba(99,102,241,0.08),rgba(139,92,246,0.06),rgba(16,185,129,0.05));
                background-size:400% 400%;
                animation:kordAuroraShift 12s ease-in-out infinite;
                filter:blur(40px);border-radius:50%;
            }
            #kord-fx-layer::after { top:auto;bottom:0;animation-delay:6s;opacity:0.5; }
            @keyframes kordAuroraShift { 0%{background-position:0% 50%;transform:rotate(0deg);} 50%{background-position:100% 50%;transform:rotate(3deg);} 100%{background-position:0% 50%;transform:rotate(0deg);} }
        `
    },
    matrix: {
        name: '🌌 Matrix', icon: 'terminal', desc: 'Cascata de dados caindo',
        css: `
            #kord-fx-layer { position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999;overflow:hidden;opacity:0.7; }
            #kord-fx-layer::before {
                content:'';position:absolute;inset:0;
                background:repeating-linear-gradient(0deg,transparent,transparent 48px,rgba(16,185,129,0.015) 48px,rgba(16,185,129,0.015) 49px),
                           repeating-linear-gradient(90deg,transparent,transparent 48px,rgba(16,185,129,0.01) 48px,rgba(16,185,129,0.01) 49px);
                animation:kordMatrixScroll 4s linear infinite;
            }
            @keyframes kordMatrixScroll { 0%{transform:translateY(0);} 100%{transform:translateY(49px);} }
        `
    },
    particles: {
        name: '🔮 Partículas', icon: 'blur_on', desc: 'Partículas flutuantes no fundo',
        css: `
            #kord-fx-layer { position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999;overflow:hidden;mix-blend-mode:screen;opacity:0.8; }
            #kord-fx-layer::before {
                content:'';position:absolute;width:4px;height:4px;top:20%;left:15%;
                background:rgba(99,102,241,0.4);border-radius:50%;
                box-shadow:
                    60vw 10vh 0 rgba(139,92,246,0.3),25vw 70vh 0 rgba(99,102,241,0.25),
                    80vw 30vh 0 rgba(16,185,129,0.2),10vw 80vh 0 rgba(244,63,94,0.2),
                    45vw 50vh 0 rgba(251,191,36,0.15),70vw 60vh 0 rgba(34,211,238,0.2),
                    30vw 20vh 0 rgba(139,92,246,0.2),90vw 80vh 0 rgba(99,102,241,0.15);
                animation:kordParticleFloat 20s ease-in-out infinite alternate;
            }
            @keyframes kordParticleFloat { 0%{transform:translate(0,0) scale(1);} 50%{transform:translate(30px,-40px) scale(1.5);} 100%{transform:translate(-20px,20px) scale(0.8);} }
        `
    },
    sparkle: {
        name: '✨ Brilho', icon: 'auto_awesome', desc: 'Brilhos espalhados pela tela',
        css: `
            #kord-fx-layer { position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999;overflow:hidden;mix-blend-mode:screen;opacity:0.9; }
            #kord-fx-layer::before, #kord-fx-layer::after {
                content:'';position:absolute;width:3px;height:3px;border-radius:50%;
                background:#fff;
            }
            #kord-fx-layer::before {
                top:15%;left:20%;
                box-shadow:70vw 30vh 0 1px rgba(255,255,255,0.2),20vw 60vh 0 1px rgba(255,255,255,0.15),
                           50vw 10vh 0 1px rgba(255,255,255,0.25),85vw 70vh 0 1px rgba(255,255,255,0.1),
                           35vw 40vh 0 1px rgba(255,255,255,0.2);
                animation:kordSparkle1 3s ease-in-out infinite alternate;
            }
            #kord-fx-layer::after {
                top:50%;left:60%;
                box-shadow:15vw 20vh 0 1px rgba(255,255,255,0.15),-20vw -10vh 0 1px rgba(255,255,255,0.2),
                           30vw -30vh 0 1px rgba(255,255,255,0.25),-40vw 15vh 0 1px rgba(255,255,255,0.1);
                animation:kordSparkle2 4s ease-in-out infinite alternate;
            }
            @keyframes kordSparkle1 { 0%{opacity:0.3;transform:scale(1);} 100%{opacity:1;transform:scale(1.2);} }
            @keyframes kordSparkle2 { 0%{opacity:1;transform:scale(1.2);} 100%{opacity:0.3;transform:scale(1);} }
        `
    }
};

let _currentEffect = 'none';

function applyThemeEffect(effectKey) {
    // Remove old effect layer + style
    const oldLayer = document.getElementById('kord-fx-layer');
    if (oldLayer) oldLayer.remove();
    const oldStyle = document.getElementById('kord-fx-style');
    if (oldStyle) oldStyle.remove();

    _currentEffect = effectKey || 'none';
    const effect = KORD_EFFECTS[_currentEffect];
    if (!effect || !effect.css) return;

    // Create effect layer
    const layer = document.createElement('div');
    layer.id = 'kord-fx-layer';
    document.body.prepend(layer);

    // Inject CSS
    const style = document.createElement('style');
    style.id = 'kord-fx-style';
    style.textContent = effect.css;
    document.head.appendChild(style);
}

function removeThemeEffect() {
    applyThemeEffect('none');
}

function getAvailableEffects() {
    return Object.entries(KORD_EFFECTS).map(([key, val]) => ({
        key, name: val.name, icon: val.icon, desc: val.desc, active: key === _currentEffect
    }));
}

function getCurrentEffect() {
    return _currentEffect;
}

function saveThemeEffect(effectKey) {
    if (!currentUser) return showKordAlert("Sessão Expirada", "Faça login para salvar o efeito!", "login", "#ef4444");
    applyThemeEffect(effectKey);
    firebase.database().ref(`users/${currentUser.uid}/profile`).update({ themeEffect: effectKey }).then(() => {
        const effect = KORD_EFFECTS[effectKey];
        if (effectKey === 'none') {
            showKordAlert("Efeito Removido", "Todos os efeitos visuais foram desativados.", "block", "#64748b");
        } else {
            showKordAlert("Efeito Ativado", `O efeito ${effect.name} foi aplicado com sucesso!`, effect.icon, "#6366f1");
        }
    });
}

function loadSavedThemeEffect() {
    if (!currentUser) return;
    firebase.database().ref(`users/${currentUser.uid}/profile/themeEffect`).once('value', snap => {
        const effect = snap.val();
        if (effect && KORD_EFFECTS[effect]) {
            applyThemeEffect(effect);
        }
    });
}

function renderEffectsGrid() {
    const grid = document.getElementById('kord-effects-grid');
    if (!grid) return;

    const effects = getAvailableEffects();
    grid.innerHTML = effects.map(fx => `
        <button onclick="saveThemeEffect('${fx.key}')" style="
            background:${fx.active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)'};
            border:1px solid ${fx.active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'};
            border-radius:14px;padding:14px 10px;cursor:pointer;
            display:flex;flex-direction:column;align-items:center;gap:6px;
            transition:all 0.25s;color:#f0f0f5;
            ${fx.active ? 'box-shadow:0 0 20px rgba(99,102,241,0.15);' : ''}
        " onmouseover="this.style.borderColor='rgba(99,102,241,0.3)';this.style.background='rgba(99,102,241,0.08)'"
           onmouseout="this.style.borderColor='${fx.active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}';this.style.background='${fx.active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)'}'" >
            <span class="material-icons-round" style="font-size:24px;color:${fx.active ? '#818cf8' : '#64748b'};">${fx.icon}</span>
            <span style="font-size:0.8rem;font-weight:600;">${fx.name}</span>
            <span style="font-size:0.65rem;color:#64748b;text-align:center;line-height:1.3;">${fx.desc}</span>
        </button>
    `).join('');
}

