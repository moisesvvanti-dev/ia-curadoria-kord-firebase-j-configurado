/**
 * ============================================================
 * KORD REAL-TIME ENGINE v1.0
 * Centralized Firebase listener management, optimistic updates,
 * batched DOM rendering, presence & connection monitoring.
 * ============================================================
 */

'use strict';

const KordRT = (() => {
    // ── Active listener registry ──
    const _listeners = new Map();   // path -> { ref, callbacks[], type }
    const _pendingUpdates = [];     // queued DOM updates for batching
    let _rafScheduled = false;
    let _presenceInterval = null;
    let _connectionRef = null;
    let _connected = false;
    let _latency = 0;

    // ── Configuration ──
    const CONFIG = {
        PRESENCE_INTERVAL: 15000,      // Heartbeat every 15s
        BATCH_FRAME_BUDGET: 8,         // ms budget per render frame
        RECONNECT_BASE_DELAY: 1000,
        RECONNECT_MAX_DELAY: 30000,
        TYPING_TIMEOUT: 3000,
        TYPING_DEBOUNCE: 500
    };

    // ==========================================================
    // SUBSCRIBE — Smart Firebase .on() with deduplication
    // ==========================================================
    function subscribe(path, callback, options = {}) {
        const {
            event = 'value',          // 'value', 'child_added', 'child_changed', 'child_removed'
            orderBy = null,
            limitTo = null,
            limitDir = 'last',        // 'first' or 'last'
            startAt = null,
            endAt = null,
            once = false
        } = options;

        const key = `${path}::${event}`;

        // Prevent duplicate listeners on the same path+event
        if (_listeners.has(key)) {
            const existing = _listeners.get(key);
            if (!existing.callbacks.includes(callback)) {
                existing.callbacks.push(callback);
            }
            return key;
        }

        let ref = firebase.database().ref(path);

        // Apply query modifiers
        if (orderBy) ref = ref.orderByChild(orderBy);
        if (limitTo) {
            ref = limitDir === 'first' ? ref.limitToFirst(limitTo) : ref.limitToLast(limitTo);
        }
        if (startAt !== null) ref = ref.startAt(startAt);
        if (endAt !== null) ref = ref.endAt(endAt);

        const handler = (snapshot) => {
            const data = snapshot.val();
            const key2 = snapshot.key;
            const entry = _listeners.get(key);
            if (entry) {
                entry.callbacks.forEach(cb => {
                    try { cb(data, key2, snapshot); } catch (e) { console.error('[KordRT] Callback error:', e); }
                });
            }
        };

        if (once) {
            ref.once(event, handler);
            return key;
        }

        ref.on(event, handler);

        _listeners.set(key, {
            ref,
            callbacks: [callback],
            event,
            handler,
            path
        });

        return key;
    }

    // ==========================================================
    // UNSUBSCRIBE — Clean listener removal
    // ==========================================================
    function unsubscribe(key) {
        const entry = _listeners.get(key);
        if (!entry) return;
        entry.ref.off(entry.event, entry.handler);
        _listeners.delete(key);
    }

    function unsubscribeByPath(pathPrefix) {
        for (const [key, entry] of _listeners) {
            if (entry.path.startsWith(pathPrefix)) {
                entry.ref.off(entry.event, entry.handler);
                _listeners.delete(key);
            }
        }
    }

    function unsubscribeAll() {
        for (const [key, entry] of _listeners) {
            entry.ref.off(entry.event, entry.handler);
        }
        _listeners.clear();
    }

    // ==========================================================
    // OPTIMISTIC UPDATE — DOM first, Firebase async
    // ==========================================================
    function optimisticUpdate(path, data, updateDOMFn, rollbackFn) {
        // 1. Update DOM immediately
        if (updateDOMFn) updateDOMFn(data);

        // 2. Push to Firebase
        const ref = firebase.database().ref(path);
        const promise = (data === null) ? ref.remove() : ref.update(data);

        return promise.catch(err => {
            console.error('[KordRT] Optimistic update failed, rolling back:', err);
            if (rollbackFn) rollbackFn();
        });
    }

    function optimisticSet(path, data, updateDOMFn, rollbackFn) {
        if (updateDOMFn) updateDOMFn(data);
        return firebase.database().ref(path).set(data).catch(err => {
            console.error('[KordRT] Optimistic set failed:', err);
            if (rollbackFn) rollbackFn();
        });
    }

    function optimisticPush(path, data, updateDOMFn, rollbackFn) {
        if (updateDOMFn) updateDOMFn(data);
        return firebase.database().ref(path).push(data).catch(err => {
            console.error('[KordRT] Optimistic push failed:', err);
            if (rollbackFn) rollbackFn();
        });
    }

    // ==========================================================
    // BATCHED DOM UPDATES — coalesce rapid events
    // ==========================================================
    function scheduleDOMUpdate(updateFn) {
        _pendingUpdates.push(updateFn);
        if (!_rafScheduled) {
            _rafScheduled = true;
            requestAnimationFrame(_flushDOMUpdates);
        }
    }

    function _flushDOMUpdates() {
        const start = performance.now();
        while (_pendingUpdates.length > 0) {
            const fn = _pendingUpdates.shift();
            try { fn(); } catch (e) { console.error('[KordRT] DOM update error:', e); }
            // Respect frame budget
            if (performance.now() - start > CONFIG.BATCH_FRAME_BUDGET) {
                // Reschedule remaining
                if (_pendingUpdates.length > 0) {
                    requestAnimationFrame(_flushDOMUpdates);
                    return;
                }
            }
        }
        _rafScheduled = false;
    }

    // ==========================================================
    // PRESENCE SYSTEM — Global heartbeat + online/offline
    // ==========================================================
    function startPresence() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const uid = user.uid;
        const presRef = firebase.database().ref(`presence/${uid}`);

        // Firebase connection state
        _connectionRef = firebase.database().ref('.info/connected');
        _connectionRef.on('value', (snap) => {
            _connected = snap.val() === true;
            _updateConnectionUI();

            if (_connected) {
                // Set online and onDisconnect handler
                presRef.set({
                    online: true,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    platform: 'web'
                });
                presRef.onDisconnect().set({
                    online: false,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    platform: 'web'
                });
            }
        });

        // Heartbeat
        if (_presenceInterval) clearInterval(_presenceInterval);
        _presenceInterval = setInterval(() => {
            if (!firebase.auth().currentUser) return;
            presRef.update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                online: true
            });
        }, CONFIG.PRESENCE_INTERVAL);

        // Measure latency
        _measureLatency();
    }

    function stopPresence() {
        const user = firebase.auth().currentUser;
        if (user) {
            firebase.database().ref(`presence/${user.uid}`).update({
                online: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }
        if (_presenceInterval) {
            clearInterval(_presenceInterval);
            _presenceInterval = null;
        }
        if (_connectionRef) {
            _connectionRef.off();
            _connectionRef = null;
        }
    }

    function _measureLatency() {
        const offsetRef = firebase.database().ref('.info/serverTimeOffset');
        offsetRef.on('value', (snap) => {
            _latency = Math.abs(snap.val() || 0);
            _updateConnectionUI();
        });
    }

    function _updateConnectionUI() {
        const indicator = document.getElementById('kord-connection-indicator');
        if (!indicator) return;

        if (!_connected) {
            indicator.innerHTML = '<span class="material-icons-round" style="font-size:14px;color:#ef4444;">cloud_off</span> Offline';
            indicator.style.color = '#ef4444';
        } else if (_latency > 2000) {
            indicator.innerHTML = '<span class="material-icons-round" style="font-size:14px;color:#f59e0b;">cloud_queue</span> Lento';
            indicator.style.color = '#f59e0b';
        } else {
            indicator.innerHTML = '<span class="material-icons-round" style="font-size:14px;color:#10b981;">cloud_done</span> Real-time';
            indicator.style.color = '#10b981';
        }
    }

    // ==========================================================
    // TYPING INDICATORS
    // ==========================================================
    let _typingTimeout = null;
    let _lastTypingPath = null;

    function sendTyping(chatPath) {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const typingPath = `typing_indicators/${chatPath.replace(/\//g, '_')}/${user.uid}`;

        if (_typingTimeout) clearTimeout(_typingTimeout);

        firebase.database().ref(typingPath).set({
            name: user.displayName || 'Anônimo',
            time: firebase.database.ServerValue.TIMESTAMP
        });

        _lastTypingPath = typingPath;
        _typingTimeout = setTimeout(() => {
            firebase.database().ref(typingPath).remove();
            _lastTypingPath = null;
        }, CONFIG.TYPING_TIMEOUT);
    }

    function clearTyping() {
        if (_lastTypingPath) {
            firebase.database().ref(_lastTypingPath).remove();
            _lastTypingPath = null;
        }
        if (_typingTimeout) {
            clearTimeout(_typingTimeout);
            _typingTimeout = null;
        }
    }

    function watchTyping(chatPath, containerSelector) {
        const typingRefPath = `typing_indicators/${chatPath.replace(/\//g, '_')}`;
        const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;

        return subscribe(typingRefPath, (data) => {
            const container = document.querySelector(containerSelector);
            if (!container) return;

            const typingDiv = container.querySelector('.kord-typing-indicator') || (() => {
                const d = document.createElement('div');
                d.className = 'kord-typing-indicator';
                d.style.cssText = 'padding:4px 16px;color:#94a3b8;font-size:0.8rem;font-style:italic;min-height:20px;display:flex;align-items:center;gap:6px;';
                container.appendChild(d);
                return d;
            })();

            if (!data) {
                typingDiv.innerHTML = '';
                return;
            }

            const typers = Object.entries(data)
                .filter(([k, v]) => k !== uid && v.time && (Date.now() - v.time < CONFIG.TYPING_TIMEOUT + 1000))
                .map(([, v]) => v.name);

            if (typers.length === 0) {
                typingDiv.innerHTML = '';
            } else if (typers.length === 1) {
                typingDiv.innerHTML = `<span class="kord-typing-dots"><span></span><span></span><span></span></span> <strong>${typers[0]}</strong> está digitando...`;
            } else if (typers.length <= 3) {
                typingDiv.innerHTML = `<span class="kord-typing-dots"><span></span><span></span><span></span></span> <strong>${typers.join(', ')}</strong> estão digitando...`;
            } else {
                typingDiv.innerHTML = `<span class="kord-typing-dots"><span></span><span></span><span></span></span> <strong>${typers.length}</strong> pessoas digitando...`;
            }
        });
    }

    // ==========================================================
    // ONLINE PRESENCE BADGE
    // ==========================================================
    function watchUserPresence(uid, dotElement) {
        return subscribe(`presence/${uid}`, (data) => {
            if (!dotElement) return;
            if (data && data.online) {
                dotElement.style.background = '#10b981';
                dotElement.title = 'Online';
            } else if (data && data.lastSeen && (Date.now() - data.lastSeen < 300000)) {
                dotElement.style.background = '#f59e0b';
                dotElement.title = 'Ausente';
            } else {
                dotElement.style.background = '#64748b';
                dotElement.title = 'Offline';
            }
        });
    }

    // ==========================================================
    // LIVE CHAT LISTENER (Enhanced)
    // ==========================================================
    function attachLiveChat(refPath, container, renderFn, options = {}) {
        const { limit = 100, scrollToBottom = true } = options;
        const keys = [];

        // child_added — new messages
        const k1 = subscribe(refPath, (data, key) => {
            if (!data || !container) return;
            scheduleDOMUpdate(() => {
                // Check if message already rendered
                if (container.querySelector(`[data-msg-id="${key}"]`)) return;
                renderFn(data, key, container, 'add');
                if (scrollToBottom) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        }, { event: 'child_added', limitTo: limit, limitDir: 'last' });
        keys.push(k1);

        // child_changed — edits
        const k2 = subscribe(refPath, (data, key) => {
            if (!data || !container) return;
            scheduleDOMUpdate(() => {
                const existing = container.querySelector(`[data-msg-id="${key}"]`);
                if (existing) {
                    renderFn(data, key, container, 'update', existing);
                }
            });
        }, { event: 'child_changed' });
        keys.push(k2);

        // child_removed — deletes
        const k3 = subscribe(refPath, (data, key) => {
            scheduleDOMUpdate(() => {
                const existing = container.querySelector(`[data-msg-id="${key}"]`);
                if (existing) {
                    existing.style.transition = 'opacity 0.3s, transform 0.3s';
                    existing.style.opacity = '0';
                    existing.style.transform = 'translateX(-20px)';
                    setTimeout(() => existing.remove(), 300);
                }
            });
        }, { event: 'child_removed' });
        keys.push(k3);

        return keys;
    }

    function detachLiveChat(keys) {
        if (keys && Array.isArray(keys)) {
            keys.forEach(k => unsubscribe(k));
        }
    }

    // ==========================================================
    // UTILITY — Get online user count
    // ==========================================================
    function getOnlineCount(callback) {
        return subscribe('presence', (data) => {
            if (!data) { callback(0); return; }
            const count = Object.values(data).filter(u => u.online === true).length;
            callback(count);
        });
    }

    // ==========================================================
    // DIAGNOSTICS
    // ==========================================================
    function getStats() {
        return {
            activeListeners: _listeners.size,
            pendingUpdates: _pendingUpdates.length,
            connected: _connected,
            latencyMs: _latency,
            listenerPaths: Array.from(_listeners.keys())
        };
    }

    // ==========================================================
    // INIT & CLEANUP
    // ==========================================================
    function init() {
        // Start presence when user is authenticated
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                startPresence();
            } else {
                stopPresence();
                unsubscribeAll();
            }
        });

        // Inject connection indicator into Kord UI
        setTimeout(() => {
            const userControls = document.querySelector('.kord-user-controls');
            if (userControls && !document.getElementById('kord-connection-indicator')) {
                const indicator = document.createElement('div');
                indicator.id = 'kord-connection-indicator';
                indicator.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:0.7rem;padding:2px 8px;color:#10b981;';
                indicator.innerHTML = '<span class="material-icons-round" style="font-size:14px;color:#10b981;">cloud_done</span> Real-time';
                userControls.insertBefore(indicator, userControls.firstChild);
            }
        }, 1000);

        // Inject typing indicator CSS
        const style = document.createElement('style');
        style.textContent = `
            .kord-typing-dots {
                display: inline-flex;
                gap: 3px;
                align-items: center;
            }
            .kord-typing-dots span {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #6366f1;
                animation: kordTypingBounce 1.4s ease-in-out infinite;
            }
            .kord-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
            .kord-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes kordTypingBounce {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                30% { transform: translateY(-4px); opacity: 1; }
            }
            .kord-presence-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                border: 2px solid var(--bg-primary, #0f172a);
                position: absolute;
                bottom: 0;
                right: 0;
                transition: background 0.3s;
            }
        `;
        document.head.appendChild(style);

        console.log('⚡ KordRT Engine v1.0 initialized');
    }

    return {
        subscribe,
        unsubscribe,
        unsubscribeByPath,
        unsubscribeAll,
        optimisticUpdate,
        optimisticSet,
        optimisticPush,
        scheduleDOMUpdate,
        startPresence,
        stopPresence,
        sendTyping,
        clearTyping,
        watchTyping,
        watchUserPresence,
        attachLiveChat,
        detachLiveChat,
        getOnlineCount,
        getStats,
        init,
        get connected() { return _connected; },
        get latency() { return _latency; },
        CONFIG
    };
})();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => KordRT.init());
