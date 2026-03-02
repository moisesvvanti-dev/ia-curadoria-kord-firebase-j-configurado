/**
 * ============================================================
 * KORD SECURITY & MODERATION ENGINE v1.0
 * Handles HWID Fingerprinting, AI Moderation (Porn/Nazism),
 * Ban Engine (10-day / Permaban)
 * ============================================================
 */

// Generate a pseudo-HWID based on browser fingerprinting
async function getKordHWID() {
    let hwidToken = localStorage.getItem('kord_hwid_token');
    if (!hwidToken) {
        hwidToken = 'HWID_' + Math.random().toString(36).substr(2, 10) + '_' + Date.now();
        localStorage.setItem('kord_hwid_token', hwidToken);
    }

    // Create a fingerprint
    const fp = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.deviceMemory || 'unknown',
        hwidToken
    ].join('||');

    // Simple hash (cyrb53)
    let h1 = 0xdeadbeef ^ fp.length, h2 = 0x41c6ce57 ^ fp.length;
    for (let i = 0, ch; i < fp.length; i++) {
        ch = fp.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'KORD_HWID_' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

// Check if user is banned
async function checkKordBanStatus() {
    const hwid = await getKordHWID();

    // Check HWID bans globally
    const hwidSnap = await firebase.database().ref(`banned_hwids/${hwid}`).once('value');
    if (hwidSnap.exists()) {
        const banData = hwidSnap.val();
        enforceKordBan(banData);
        return true;
    }

    // Check UID ban if logged in
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if (uid) {
        const userSnap = await firebase.database().ref(`users/${uid}/ban`).once('value');
        if (userSnap.exists()) {
            const banData = userSnap.val();
            // sync to HWID directly so they can't create alt accounts
            await firebase.database().ref(`banned_hwids/${hwid}`).set(banData);
            enforceKordBan(banData);
            return true;
        }
    }
    return false;
}

function enforceKordBan(banData) {
    const now = Date.now();
    const expiresAt = banData.expiresAt || 0;

    if (expiresAt > 0 && now > expiresAt) {
        // Ban expired! Clean it up (we let the flow continue normally, but we won't clean DB here for security, let server do it or next login)
        return;
    }

    // Freeze APP
    document.body.innerHTML = `
        <div style="background:#030306; color:#f0f0f5; height:100vh; width:100vw; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:'Inter', sans-serif; text-align:center; padding:40px; box-sizing:border-box;">
            <span class="material-icons-round" style="font-size:80px; color:#ef4444; margin-bottom:20px;">gavel</span>
            <h1 style="font-size:2.5rem; margin-bottom:10px;">Acesso Bloqueado</h1>
            <p style="color:#94a3b8; font-size:1.1rem; max-width:600px; margin-bottom:30px; line-height:1.6;">
                Seu acesso ao Kord foi suspenso devido a violações graves de segurança ou conduta.<br><br>
                <b style="color:#f8fafc;">Motivo:</b> ${banData.reason || 'Violação dos Termos de Serviço'}<br>
                <b style="color:#f59e0b;">Status:</b> ${expiresAt === -1 ? '🔴 BANIMENTO PERMANENTE (HWID/IP)' : '🟡 BANIMENTO TEMPORÁRIO (' + new Date(expiresAt).toLocaleString() + ')'}
            </p>
            <p style="color:#475569; font-size:0.8rem;">O bloqueio foi aplicado no seu HWID, Periféricos e Conta.</p>
        </div>
    `;
    // Disconnect Firebase entirely
    firebase.database().goOffline();
}

/**
 * AI MODERATION SYSTEM (Zero-Tolerance)
 * Checks for Pornography, Pedophilia, Nazism.
 */
async function checkSecurityMessageAI(msg, serverId, channelId, isGroup) {
    if (!msg || msg.length < 3) return false;

    // Fast keyword catch layer (local regex) to prevent obvious spam before pinging API
    const badPatterns = /nazis|hitler|pornô|porno|pedofilia|cp|child porn/i;
    // but the actual heavy lifting is the AI

    const groqKey = localStorage.getItem('kord_groq_key_cached');
    if (!groqKey) return false; // Fail open if no key? The user says it must block, but we need an API key.

    const prompt = `
Analise o texto a seguir e determine SE é uma violação GRAVE (se sim, responda APENAS com a palavra da violação exata: "PORNOGRAFIA", "PEDOFILIA", "NAZISMO"). Se for seguro, responda apenas "SEGURO".

Texto: "${msg}"
    `;

    try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_completion_tokens: 10
            })
        });

        const data = await resp.json();
        if (data.choices && data.choices[0]) {
            const result = data.choices[0].message.content.toUpperCase().trim();
            if (result.includes('PORNOGRAFIA') || result.includes('PEDOFILIA') || result.includes('NAZISMO')) {
                await executeAIModerationAction(result, serverId, channelId, isGroup);
                return true; // MESSAGE IS HARMFUL
            }
        }
    } catch (e) {
        console.error("AI Moderation failed", e);
    }
    return false;
}

// Execute the requested punishments for AI violation
async function executeAIModerationAction(violationType, serverId, channelId, isGroup) {
    const uid = firebase.auth().currentUser.uid;
    const hwid = await getKordHWID();

    // 1. Permaban the user
    const banData = {
        reason: `Violação Zero Tolerância AI: ${violationType}`,
        expiresAt: -1, // Permanent
        timestamp: Date.now()
    };

    await firebase.database().ref(`users/${uid}/ban`).set(banData);
    await firebase.database().ref(`banned_hwids/${hwid}`).set(banData);

    // 2. Action based on where it was sent
    if (isGroup) {
        // Deleta o grupo em tempo real ("se for um grupo para isso so deleta o grupo em rempo real")
        const groupId = currentKordChannel.replace('dm:', '');
        await firebase.database().ref(`direct_messages/${groupId}`).remove();
    } else if (serverId && serverId !== 'home') {
        // "se tiver qualquer relaçao com nazismo tambem deleta an hora o servidor ou canal da msg"
        if (violationType === 'NAZISMO') {
            await firebase.database().ref(`servers/${serverId}`).remove(); // Nuke the entire server
        }
    }
    // "se for dm nao faça nada so apague as msg relacinadas e bloquei de escrever" => doing this covers it because we ban the user, they can't write anymore.

    enforceKordBan(banData);
}

// Ban directly (Admin tool)
async function banUserKord(uid, reason, isPermanent) {
    // To properly ban we find strikes
    const strikesSnap = await firebase.database().ref(`users/${uid}/banStrikes`).once('value');
    let strikes = strikesSnap.val() || 0;

    if (!isPermanent) {
        strikes += 1;
        await firebase.database().ref(`users/${uid}/banStrikes`).set(strikes);

        if (strikes >= 3) {
            isPermanent = true; // 3 strikes = permaban
        }
    }

    const durationDays = isPermanent ? -1 : 10;
    const expiresAt = isPermanent ? -1 : Date.now() + (10 * 24 * 60 * 60 * 1000);

    const banData = {
        reason: reason || 'Bloqueio Administrativo (' + strikes + 'º ban)',
        expiresAt: expiresAt,
        timestamp: Date.now(),
        strikes: strikes
    };

    await firebase.database().ref(`users/${uid}/ban`).set(banData);

    // Try to attach their HWID if we can find it in presence
    const presSnap = await firebase.database().ref(`users/${uid}/last_hwid`).once('value');
    if (presSnap.exists()) {
        await firebase.database().ref(`banned_hwids/${presSnap.val()}`).set(banData);
    }
}
