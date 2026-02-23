/**
 * ============================================================
 * LUMINOUS SECURITY & PERFORMANCE SHIELD v1.0
 * Advanced Anti-Tamper + Anti-Debug + Performance Guard
 * ============================================================
 */

const LuminousShield = (() => {
    const config = {
        maxClicksPerMinute: 10,
        clickWindow: 60000,
        lastClicks: []
    };

    // 1. ANTI-DEVTOOLS & SHORTCUTS
    const initAntiDebug = () => {
        // Disable Right Click globally
        document.addEventListener('contextmenu', e => e.preventDefault());

        // Disable Shortcuts globally
        document.addEventListener('keydown', e => {
            // F12
            if (e.keyCode === 123) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I (Windows) or Cmd+Option+I (Mac)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 73) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+J (Windows) or Cmd+Option+J (Mac)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 74) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+C (Windows) or Cmd+Option+C (Mac)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 67) {
                e.preventDefault();
                return false;
            }
            // Ctrl+U / Cmd+U (View Source)
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
                e.preventDefault();
                return false;
            }
            // Ctrl+S / Cmd+S (Save as)
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) {
                e.preventDefault();
                return false;
            }
        });

        // Anti-Debug (Infinite debugger loop if DevTools detected)
        // Aggressive block mechanism: traps the user in a debugger state or blanks the screen
        setInterval(() => {
            const before = Date.now();
            debugger; // This triggers if DevTools are open
            const after = Date.now();

            // If it takes more than 100ms, the debugger caught it (DevTools are open)
            if (after - before > 100) {
                document.body.innerHTML = `
                <div style="background:#000; color:#ef4444; height:100vh; width:100vw; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; position:fixed; top:0; left:0; z-index:999999;">
                    <span class="material-icons-round" style="font-size:64px; margin-bottom:20px;">gpp_bad</span>
                    <h2 style="margin:0 0 10px 0;">SISTEMA BLOQUEADO</h2>
                    <p style="color:#f8fafc; font-size:1.1rem; max-width:400px;">Tentativa de engenharia reversa e/ou inspeção detectada.<br>Feche as ferramentas de desenvolvedor e recarregue a página (F5) para continuar.</p>
                </div>`;
            }
        }, 1500);
    };

    // 2. RATE LIMITING (Firebase Protection)
    const checkRateLimit = () => {
        const now = Date.now();
        config.lastClicks = config.lastClicks.filter(t => now - t < config.clickWindow);

        if (config.lastClicks.length >= config.maxClicksPerMinute) {
            console.warn("[Security] Rate limit exceeded");
            return false;
        }

        config.lastClicks.push(now);
        return true;
    };

    // 3. INTEGRITY CHECK
    const checkIntegrity = () => {
        // Basic check if core functions were replaced
        if (typeof ClickTracker === 'undefined' || !ClickTracker.track) {
            window.location.reload();
        }
    };

    const init = () => {
        initAntiDebug();
        setInterval(checkIntegrity, 5000);
        console.log("🛡️ Luminous Shield Active");
    };

    return { init, checkRateLimit };
})();

LuminousShield.init();
window.LuminousShield = LuminousShield;
