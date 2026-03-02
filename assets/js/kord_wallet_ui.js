/**
 * ============================================================
 * KORD WALLET UI v1.0
 * Premium cryptocurrency wallet interface
 * Create, import, send, receive, and manage crypto wallets
 * ============================================================
 */

'use strict';

const KordWalletUI = (() => {
    let _currentTab = 'overview';
    let _refreshInterval = null;

    // ==========================================================
    // OPEN WALLET VIEW
    // ==========================================================
    function openWalletView() {
        const container = document.getElementById('kord-wallet-content');
        if (!container) return;

        // Check if wallet exists
        const hasWallet = KordBlockchain.isWalletCreated();
        const isUnlocked = KordBlockchain.isWalletUnlocked();

        if (!hasWallet) {
            _renderCreateOrImport(container);
        } else if (!isUnlocked) {
            _renderUnlockScreen(container);
        } else {
            _renderDashboard(container);
        }
    }

    // ==========================================================
    // CREATE OR IMPORT WALLET SCREEN
    // ==========================================================
    function _renderCreateOrImport(container) {
        container.innerHTML = `
            <div class="kw-welcome">
                <div class="kw-welcome-icon">
                    <span class="material-icons-round" style="font-size:64px;background:linear-gradient(135deg,#6366f1,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">account_balance_wallet</span>
                </div>
                <h2 class="kw-welcome-title">Kord Wallet</h2>
                <p class="kw-welcome-desc">Sua carteira cripto descentralizada, anônima e segura. Compatível com MetaMask, Trust Wallet e mais.</p>
                
                <div class="kw-welcome-features">
                    <div class="kw-feature"><span class="material-icons-round">lock</span> Chaves privadas nunca saem do navegador</div>
                    <div class="kw-feature"><span class="material-icons-round">visibility_off</span> 100% anônimo — sem KYC</div>
                    <div class="kw-feature"><span class="material-icons-round">swap_horiz</span> Multi-chain: ETH, Polygon, BSC</div>
                    <div class="kw-feature"><span class="material-icons-round">download</span> Exportável para qualquer wallet</div>
                </div>

                <div class="kw-welcome-actions">
                    <button onclick="KordWalletUI.showCreateWallet()" class="kw-btn-primary">
                        <span class="material-icons-round">add_circle</span> Criar Nova Carteira
                    </button>
                    <button onclick="KordWalletUI.showImportWallet()" class="kw-btn-secondary">
                        <span class="material-icons-round">file_download</span> Importar Carteira Existente
                    </button>
                </div>
            </div>
        `;
    }

    // ==========================================================
    // CREATE WALLET FLOW
    // ==========================================================
    function showCreateWallet() {
        const container = document.getElementById('kord-wallet-content');
        container.innerHTML = `
            <div class="kw-create-flow">
                <div class="kw-flow-header">
                    <button onclick="KordWalletUI.openWalletView()" class="kw-back-btn">
                        <span class="material-icons-round">arrow_back</span>
                    </button>
                    <h2>Criar Nova Carteira</h2>
                </div>

                <div class="kw-step-indicator">
                    <div class="kw-step active" id="kw-step-1"><span>1</span> Senha</div>
                    <div class="kw-step-line"></div>
                    <div class="kw-step" id="kw-step-2"><span>2</span> Backup</div>
                    <div class="kw-step-line"></div>
                    <div class="kw-step" id="kw-step-3"><span>3</span> Pronto</div>
                </div>

                <div id="kw-create-step-content">
                    <div class="kw-form-group">
                        <label>Crie uma senha forte para proteger sua carteira</label>
                        <p class="kw-hint">Esta senha criptografa suas chaves. Se perdê-la, use sua frase de recuperação.</p>
                        <input type="password" id="kw-create-password" placeholder="Senha (mín. 6 caracteres)" class="kw-input">
                        <input type="password" id="kw-create-password-confirm" placeholder="Confirmar senha" class="kw-input" style="margin-top:10px;">
                    </div>
                    <button onclick="KordWalletUI._executeCreateWallet()" class="kw-btn-primary kw-full-width" id="kw-create-btn">
                        <span class="material-icons-round">vpn_key</span> Gerar Carteira
                    </button>
                </div>
            </div>
        `;
    }

    async function _executeCreateWallet() {
        const pwd = document.getElementById('kw-create-password').value;
        const pwd2 = document.getElementById('kw-create-password-confirm').value;

        if (pwd.length < 6) {
            if (typeof showKordAlert === 'function') showKordAlert('Erro', 'Senha deve ter pelo menos 6 caracteres.', 'error', '#ef4444');
            return;
        }
        if (pwd !== pwd2) {
            if (typeof showKordAlert === 'function') showKordAlert('Erro', 'As senhas não coincidem.', 'error', '#ef4444');
            return;
        }

        const btn = document.getElementById('kw-create-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons-round kw-spin">sync</span> Gerando...';

        try {
            const result = await KordBlockchain.createWallet(pwd);
            _showMnemonicBackup(result);
        } catch (e) {
            if (typeof showKordAlert === 'function') showKordAlert('Falha na Criação', 'Não foi possível gerar a carteira. Verifique sua conexão e tente novamente.', 'error_outline', '#ef4444');
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons-round">vpn_key</span> Gerar Carteira';
        }
    }

    function _showMnemonicBackup(result) {
        // Update step indicators
        const s1 = document.getElementById('kw-step-1');
        const s2 = document.getElementById('kw-step-2');
        if (s1) { s1.classList.remove('active'); s1.classList.add('done'); }
        if (s2) s2.classList.add('active');

        const words = (typeof result.mnemonic === 'string') ? result.mnemonic.split(' ') : [];
        const wordsHtml = words.map((w, i) => `<div class="kw-mnemonic-word"><span class="kw-word-num">${i + 1}</span>${w}</div>`).join('');

        const content = document.getElementById('kw-create-step-content');
        content.innerHTML = `
            <div class="kw-mnemonic-section">
                <div class="kw-warning-box">
                    <span class="material-icons-round">warning</span>
                    <div>
                        <strong>IMPORTANTE: Salve sua frase de recuperação!</strong>
                        <p>Sem ela, você perderá acesso à sua carteira para sempre. Anote em um local seguro offline.</p>
                    </div>
                </div>

                <div class="kw-mnemonic-grid" id="kw-mnemonic-grid">
                    ${wordsHtml}
                </div>

                <div class="kw-mnemonic-actions">
                    <button onclick="KordWalletUI._copyMnemonic()" class="kw-btn-secondary">
                        <span class="material-icons-round">content_copy</span> Copiar
                    </button>
                </div>

                <div class="kw-address-preview">
                    <label>Seu Endereço:</label>
                    <div class="kw-address-box">
                        <span id="kw-new-address">${result.address}</span>
                        <button onclick="KordWalletUI._copyAddress('${result.address}')" class="kw-copy-btn">
                            <span class="material-icons-round">content_copy</span>
                        </button>
                    </div>
                    <span class="kw-network-badge" style="background:${result.network.color}20;color:${result.network.color}">
                        ${result.network.name}
                    </span>
                </div>

                <button onclick="KordWalletUI._completeSetup()" class="kw-btn-primary kw-full-width" style="margin-top:20px;">
                    <span class="material-icons-round">check_circle</span> Salvei minha frase — Continuar
                </button>
            </div>
        `;
    }

    function _copyMnemonic() {
        try {
            const mnemonic = KordBlockchain.exportMnemonic();
            navigator.clipboard.writeText(mnemonic);
            if (typeof showKordAlert === 'function') showKordAlert('Copiado', 'Frase de recuperação copiada. Guarde em local seguro!', 'check_circle', '#10b981');
        } catch (e) {
            if (typeof showKordAlert === 'function') showKordAlert('Falha ao Copiar', 'Não foi possível acessar a frase de recuperação.', 'error_outline', '#ef4444');
        }
    }

    function _copyAddress(addr) {
        navigator.clipboard.writeText(addr);
        if (typeof showKordAlert === 'function') showKordAlert('Copiado', 'Endereço copiado!', 'check_circle', '#10b981');
    }

    function _completeSetup() {
        const s2 = document.getElementById('kw-step-2');
        const s3 = document.getElementById('kw-step-3');
        if (s2) { s2.classList.remove('active'); s2.classList.add('done'); }
        if (s3) s3.classList.add('active');

        if (typeof showKordAlert === 'function') showKordAlert('Carteira Criada!', 'Sua carteira está pronta para uso.', 'account_balance_wallet', '#10b981');
        _renderDashboard(document.getElementById('kord-wallet-content'));
    }

    // ==========================================================
    // IMPORT WALLET FLOW
    // ==========================================================
    function showImportWallet() {
        const container = document.getElementById('kord-wallet-content');
        container.innerHTML = `
            <div class="kw-import-flow">
                <div class="kw-flow-header">
                    <button onclick="KordWalletUI.openWalletView()" class="kw-back-btn">
                        <span class="material-icons-round">arrow_back</span>
                    </button>
                    <h2>Importar Carteira</h2>
                </div>

                <div class="kw-import-tabs">
                    <button class="kw-tab active" onclick="KordWalletUI._switchImportTab('mnemonic')">Frase de Recuperação</button>
                    <button class="kw-tab" onclick="KordWalletUI._switchImportTab('privkey')">Chave Privada</button>
                    <button class="kw-tab" onclick="KordWalletUI._switchImportTab('keystore')">arquivo JSON</button>
                </div>

                <div id="kw-import-content">
                    <div class="kw-form-group">
                        <label>Cole suas 12 ou 24 palavras de recuperação</label>
                        <textarea id="kw-import-mnemonic" class="kw-textarea" placeholder="word1 word2 word3 ... word12" rows="3"></textarea>
                    </div>
                    <div class="kw-form-group">
                        <label>Senha para proteger a carteira</label>
                        <input type="password" id="kw-import-password" placeholder="Senha (mín. 6 caracteres)" class="kw-input">
                    </div>
                    <button onclick="KordWalletUI._executeImport('mnemonic')" class="kw-btn-primary kw-full-width" id="kw-import-btn">
                        <span class="material-icons-round">file_download</span> Importar
                    </button>
                </div>
            </div>
        `;
    }

    function _switchImportTab(tab) {
        document.querySelectorAll('.kw-import-tabs .kw-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        const content = document.getElementById('kw-import-content');
        if (tab === 'mnemonic') {
            content.innerHTML = `
                <div class="kw-form-group">
                    <label>Cole suas 12 ou 24 palavras de recuperação</label>
                    <textarea id="kw-import-mnemonic" class="kw-textarea" placeholder="word1 word2 word3 ... word12" rows="3"></textarea>
                </div>
                <div class="kw-form-group">
                    <label>Senha para proteger a carteira</label>
                    <input type="password" id="kw-import-password" placeholder="Senha (mín. 6 caracteres)" class="kw-input">
                </div>
                <button onclick="KordWalletUI._executeImport('mnemonic')" class="kw-btn-primary kw-full-width">
                    <span class="material-icons-round">file_download</span> Importar
                </button>
            `;
        } else if (tab === 'privkey') {
            content.innerHTML = `
                <div class="kw-form-group">
                    <label>Cole sua chave privada (hex)</label>
                    <input type="password" id="kw-import-privkey" class="kw-input" placeholder="0x...">
                </div>
                <div class="kw-form-group">
                    <label>Senha para proteger a carteira</label>
                    <input type="password" id="kw-import-password" placeholder="Senha (mín. 6 caracteres)" class="kw-input">
                </div>
                <button onclick="KordWalletUI._executeImport('privkey')" class="kw-btn-primary kw-full-width">
                    <span class="material-icons-round">file_download</span> Importar
                </button>
            `;
        } else if (tab === 'keystore') {
            content.innerHTML = `
                <div class="kw-form-group">
                    <label>Cole o conteúdo do arquivo JSON keystore</label>
                    <textarea id="kw-import-keystore" class="kw-textarea" placeholder='{"version":3,"id":"..."}' rows="4"></textarea>
                </div>
                <div class="kw-form-group">
                    <label>Senha do keystore</label>
                    <input type="password" id="kw-import-password" placeholder="Senha do arquivo" class="kw-input">
                </div>
                <button onclick="KordWalletUI._executeImport('keystore')" class="kw-btn-primary kw-full-width">
                    <span class="material-icons-round">file_download</span> Importar
                </button>
            `;
        }
    }

    async function _executeImport(type) {
        const pwd = document.getElementById('kw-import-password').value;

        try {
            let result;
            if (type === 'mnemonic') {
                const mnemonic = document.getElementById('kw-import-mnemonic').value;
                result = await KordBlockchain.importFromMnemonic(mnemonic, pwd);
            } else if (type === 'privkey') {
                const pk = document.getElementById('kw-import-privkey').value;
                result = await KordBlockchain.importFromPrivateKey(pk, pwd);
            } else if (type === 'keystore') {
                const ks = document.getElementById('kw-import-keystore').value;
                result = await KordBlockchain.importFromKeystore(ks, pwd);
            }

            if (typeof showKordAlert === 'function') showKordAlert('Importado!', `Carteira ${result.address.slice(0, 8)}...${result.address.slice(-6)} importada!`, 'check_circle', '#10b981');
            _renderDashboard(document.getElementById('kord-wallet-content'));
        } catch (e) {
            if (typeof showKordAlert === 'function') showKordAlert('Falha na Importação', 'Os dados fornecidos são inválidos ou a senha está incorreta. Verifique e tente novamente.', 'error_outline', '#ef4444');
        }
    }

    // ==========================================================
    // UNLOCK SCREEN
    // ==========================================================
    function _renderUnlockScreen(container) {
        container.innerHTML = `
            <div class="kw-unlock">
                <div class="kw-unlock-icon">
                    <span class="material-icons-round" style="font-size:48px;color:#6366f1;">lock</span>
                </div>
                <h2>Desbloquear Carteira</h2>
                <p>Digite sua senha para acessar a carteira.</p>
                <input type="password" id="kw-unlock-password" class="kw-input" placeholder="Senha" onkeypress="if(event.key==='Enter')KordWalletUI._executeUnlock()">
                <button onclick="KordWalletUI._executeUnlock()" class="kw-btn-primary kw-full-width" id="kw-unlock-btn" style="margin-top:15px;">
                    <span class="material-icons-round">lock_open</span> Desbloquear
                </button>
            </div>
        `;
    }

    async function _executeUnlock() {
        const pwd = document.getElementById('kw-unlock-password').value;
        const btn = document.getElementById('kw-unlock-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons-round kw-spin">sync</span> Desbloqueando...';

        try {
            await KordBlockchain.unlockWallet(pwd);
            if (typeof showKordAlert === 'function') showKordAlert('Desbloqueado', 'Carteira acessada com sucesso!', 'lock_open', '#10b981');
            _renderDashboard(document.getElementById('kord-wallet-content'));
        } catch (e) {
            if (typeof showKordAlert === 'function') showKordAlert('Senha Inválida', 'Não foi possível desbloquear a carteira.', 'error', '#ef4444');
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons-round">lock_open</span> Desbloquear';
        }
    }

    // ==========================================================
    // MAIN DASHBOARD
    // ==========================================================
    function _renderDashboard(container) {
        const address = KordBlockchain.getAddress();
        const net = KordBlockchain.getNetwork();
        const shortAddr = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '---';

        container.innerHTML = `
            <div class="kw-dashboard">
                <!-- Balance Card -->
                <div class="kw-balance-card">
                    <div class="kw-balance-header">
                        <div class="kw-network-selector" onclick="KordWalletUI._showNetworkSelector()">
                            <span class="kw-net-dot" style="background:${net.color}"></span>
                            <span>${net.name}</span>
                            <span class="material-icons-round" style="font-size:16px;">expand_more</span>
                        </div>
                        <button onclick="KordWalletUI._refreshBalance()" class="kw-refresh-btn" title="Atualizar">
                            <span class="material-icons-round">refresh</span>
                        </button>
                    </div>
                    <div class="kw-balance-amount" id="kw-balance-display">
                        <span class="kw-balance-value">0.0000</span>
                        <span class="kw-balance-symbol">${net.symbol}</span>
                    </div>
                    <div class="kw-address-row">
                        <span class="kw-address-text" id="kw-addr-display">${shortAddr}</span>
                        <button onclick="KordWalletUI._copyAddress('${address}')" class="kw-copy-btn-small">
                            <span class="material-icons-round">content_copy</span>
                        </button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="kw-action-grid">
                    <button class="kw-action-btn" onclick="KordWalletUI._showSendModal()">
                        <div class="kw-action-icon" style="background:linear-gradient(135deg,#ef4444,#f97316);">
                            <span class="material-icons-round">arrow_upward</span>
                        </div>
                        <span>Enviar</span>
                    </button>
                    <button class="kw-action-btn" onclick="KordWalletUI._showReceiveModal()">
                        <div class="kw-action-icon" style="background:linear-gradient(135deg,#10b981,#34d399);">
                            <span class="material-icons-round">arrow_downward</span>
                        </div>
                        <span>Receber</span>
                    </button>
                    <button class="kw-action-btn" onclick="KordWalletUI._switchDashTab('history')">
                        <div class="kw-action-icon" style="background:linear-gradient(135deg,#6366f1,#818cf8);">
                            <span class="material-icons-round">receipt_long</span>
                        </div>
                        <span>Histórico</span>
                    </button>
                    <button class="kw-action-btn" onclick="KordWalletUI._showWalletSettings()">
                        <div class="kw-action-icon" style="background:linear-gradient(135deg,#64748b,#94a3b8);">
                            <span class="material-icons-round">settings</span>
                        </div>
                        <span>Ajustes</span>
                    </button>
                </div>

                <!-- Tab Content -->
                <div id="kw-dash-content" class="kw-dash-content">
                    <div class="kw-section-title">
                        <span class="material-icons-round">receipt_long</span> Transações Recentes
                    </div>
                    <div id="kw-tx-list" class="kw-tx-list">
                        <div class="kw-empty-state">
                            <span class="material-icons-round" style="font-size:40px;color:#334155;">receipt_long</span>
                            <p>Nenhuma transação ainda</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load balance
        _refreshBalance();
        _loadTxList();
    }

    async function _refreshBalance() {
        const display = document.getElementById('kw-balance-display');
        if (!display) return;

        try {
            const bal = await KordBlockchain.getBalance();
            const value = parseFloat(bal.formatted).toFixed(6);
            display.innerHTML = `
                <span class="kw-balance-value">${value}</span>
                <span class="kw-balance-symbol">${bal.symbol}</span>
            `;
        } catch (e) {
            display.innerHTML = `
                <span class="kw-balance-value">--</span>
                <span class="kw-balance-symbol">${KordBlockchain.getNetwork().symbol}</span>
            `;
        }
    }

    async function _loadTxList() {
        const listEl = document.getElementById('kw-tx-list');
        if (!listEl) return;

        const txs = await KordBlockchain.loadTransactionHistory();
        if (!txs || txs.length === 0) {
            listEl.innerHTML = `
                <div class="kw-empty-state">
                    <span class="material-icons-round" style="font-size:40px;color:#334155;">receipt_long</span>
                    <p>Nenhuma transação ainda</p>
                </div>
            `;
            return;
        }

        const myAddr = KordBlockchain.getAddress();
        listEl.innerHTML = txs.map(tx => {
            const isSent = tx.from && tx.from.toLowerCase() === myAddr.toLowerCase();
            const icon = isSent ? 'arrow_upward' : 'arrow_downward';
            const color = isSent ? '#ef4444' : '#10b981';
            const label = isSent ? 'Enviado' : 'Recebido';
            const statusIcon = tx.status === 'confirmed' ? 'check_circle' : (tx.status === 'failed' ? 'cancel' : 'schedule');
            const statusColor = tx.status === 'confirmed' ? '#10b981' : (tx.status === 'failed' ? '#ef4444' : '#f59e0b');
            const addr = isSent ? (tx.to || '???') : (tx.from || '???');
            const shortAddr2 = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
            const time = tx.timestamp ? new Date(tx.timestamp).toLocaleString('pt-BR') : '';

            return `
                <div class="kw-tx-item" onclick="KordWalletUI._showTxDetails('${tx.hash}')">
                    <div class="kw-tx-icon" style="background:${color}15;color:${color};">
                        <span class="material-icons-round">${icon}</span>
                    </div>
                    <div class="kw-tx-info">
                        <div class="kw-tx-label">${label}</div>
                        <div class="kw-tx-addr">${shortAddr2}</div>
                    </div>
                    <div class="kw-tx-right">
                        <div class="kw-tx-amount" style="color:${color}">${isSent ? '-' : '+'}${tx.value} ${tx.symbol}</div>
                        <div class="kw-tx-status" style="color:${statusColor}">
                            <span class="material-icons-round" style="font-size:12px;">${statusIcon}</span> ${time}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ==========================================================
    // SEND MODAL
    // ==========================================================
    function _showSendModal() {
        const net = KordBlockchain.getNetwork();
        _showWalletModal(`
            <h3 class="kw-modal-title"><span class="material-icons-round">arrow_upward</span> Enviar ${net.symbol}</h3>
            <div class="kw-form-group">
                <label>Endereço de destino</label>
                <input type="text" id="kw-send-to" class="kw-input" placeholder="0x...">
            </div>
            <div class="kw-form-group">
                <label>Valor (${net.symbol})</label>
                <input type="number" id="kw-send-amount" class="kw-input" placeholder="0.01" step="0.000001" min="0">
            </div>
            <div id="kw-gas-estimate" class="kw-gas-info" style="display:none;"></div>
            <button onclick="KordWalletUI._estimateAndSend()" class="kw-btn-primary kw-full-width" id="kw-send-btn">
                <span class="material-icons-round">send</span> Estimar Gas e Enviar
            </button>
        `);
    }

    async function _estimateAndSend() {
        const to = document.getElementById('kw-send-to').value.trim();
        const amount = document.getElementById('kw-send-amount').value;
        const btn = document.getElementById('kw-send-btn');

        if (!to || !amount || parseFloat(amount) <= 0) {
            if (typeof showKordAlert === 'function') showKordAlert('Erro', 'Preencha endereço e valor.', 'error', '#ef4444');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons-round kw-spin">sync</span> Estimando gas...';

        try {
            const gas = await KordBlockchain.estimateGas(to, amount);
            const gasDiv = document.getElementById('kw-gas-estimate');
            if (gas && gasDiv) {
                gasDiv.style.display = 'block';
                gasDiv.innerHTML = `
                    <div class="kw-gas-row"><span>Taxa estimada:</span><strong>${parseFloat(gas.estimatedFee).toFixed(8)} ${gas.symbol}</strong></div>
                `;
            }

            btn.innerHTML = '<span class="material-icons-round">send</span> Confirmar Envio';
            btn.onclick = async () => {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-icons-round kw-spin">sync</span> Enviando...';
                try {
                    const tx = await KordBlockchain.sendTransaction(to, amount);
                    _closeWalletModal();
                    if (typeof showKordAlert === 'function') showKordAlert('Transação Enviada!', 'Sua transação foi transmitida para a rede. Aguardando confirmação na blockchain.', 'check_circle', '#10b981');
                    _loadTxList();
                } catch (e) {
                    if (typeof showKordAlert === 'function') showKordAlert('Falha no Envio', 'Não foi possível enviar a transação. Verifique o saldo e o endereço informado.', 'error_outline', '#ef4444');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-icons-round">send</span> Tentar Novamente';
                }
            };
            btn.disabled = false;
        } catch (e) {
            if (typeof showKordAlert === 'function') showKordAlert('Erro na Estimativa', 'Não foi possível calcular a taxa de gas. Verifique o endereço e o valor.', 'error_outline', '#ef4444');
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons-round">send</span> Estimar Gas e Enviar';
        }
    }

    // ==========================================================
    // RECEIVE MODAL
    // ==========================================================
    function _showReceiveModal() {
        const address = KordBlockchain.getAddress();
        const qrUrl = KordBlockchain.generateAddressQR(200);
        const net = KordBlockchain.getNetwork();

        _showWalletModal(`
            <h3 class="kw-modal-title"><span class="material-icons-round">arrow_downward</span> Receber ${net.symbol}</h3>
            <div class="kw-receive-content">
                <div class="kw-qr-container">
                    <img src="${qrUrl}" alt="QR Code" class="kw-qr-image">
                </div>
                <div class="kw-receive-address">
                    <label>Seu endereço ${net.name}:</label>
                    <div class="kw-address-box">
                        <span class="kw-address-full">${address}</span>
                    </div>
                    <button onclick="KordWalletUI._copyAddress('${address}')" class="kw-btn-secondary kw-full-width" style="margin-top:10px;">
                        <span class="material-icons-round">content_copy</span> Copiar Endereço
                    </button>
                </div>
                <p class="kw-receive-warning">Envie apenas <strong>${net.symbol}</strong> (${net.name}) para este endereço.</p>
            </div>
        `);
    }

    // ==========================================================
    // WALLET SETTINGS
    // ==========================================================
    function _showWalletSettings() {
        const address = KordBlockchain.getAddress();
        const net = KordBlockchain.getNetwork();
        const networks = KordBlockchain.getAllNetworks();

        const netButtons = networks.map(n => `
            <button class="kw-net-option ${n.active ? 'active' : ''}" onclick="KordWalletUI._doSwitchNetwork('${n.key}')">
                <span class="kw-net-dot" style="background:${n.color}"></span>
                ${n.name} (${n.symbol})
            </button>
        `).join('');

        _showWalletModal(`
            <h3 class="kw-modal-title"><span class="material-icons-round">settings</span> Configurações da Carteira</h3>
            
            <div class="kw-settings-section">
                <h4>Rede Blockchain</h4>
                <div class="kw-net-list">${netButtons}</div>
            </div>
            
            <div class="kw-settings-section">
                <h4>Exportar Carteira</h4>
                <button onclick="KordWalletUI._exportKeystoreAction()" class="kw-btn-secondary kw-full-width" style="margin-bottom:8px;">
                    <span class="material-icons-round">file_download</span> Exportar JSON Keystore
                </button>
                <button onclick="KordWalletUI._revealMnemonicAction()" class="kw-btn-secondary kw-full-width" style="margin-bottom:8px;">
                    <span class="material-icons-round">vpn_key</span> Revelar Frase de Recuperação
                </button>
                <button onclick="KordWalletUI._revealPrivKeyAction()" class="kw-btn-secondary kw-full-width">
                    <span class="material-icons-round">key</span> Revelar Chave Privada
                </button>
            </div>
            
            <div class="kw-settings-section kw-danger-section">
                <h4 style="color:#ef4444;">Zona de Perigo</h4>
                <button onclick="KordWalletUI._lockWalletAction()" class="kw-btn-danger kw-full-width">
                    <span class="material-icons-round">lock</span> Bloquear Carteira
                </button>
            </div>
        `);
    }

    function _doSwitchNetwork(networkKey) {
        KordBlockchain.switchNetwork(networkKey);
        if (typeof showKordAlert === 'function') {
            const net = KordBlockchain.getNetwork();
            showKordAlert('Rede Alterada', `Agora usando ${net.name}`, 'swap_horiz', net.color);
        }
        _closeWalletModal();
        _renderDashboard(document.getElementById('kord-wallet-content'));
    }

    function _exportKeystoreAction() {
        try {
            const ks = KordBlockchain.exportKeystore();
            const blob = new Blob([ks], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kord-wallet-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            if (typeof showKordAlert === 'function') showKordAlert('Exportado', 'Keystore salvo. Importe no MetaMask ou Trust Wallet.', 'check_circle', '#10b981');
        } catch (e) {
            if (typeof showKordAlert === 'function') showKordAlert('Falha na Exportação', 'Não foi possível exportar o keystore. A carteira pode estar bloqueada.', 'error_outline', '#ef4444');
        }
    }

    function _revealMnemonicAction() {
        try {
            const m = KordBlockchain.exportMnemonic();
            _showWalletModal(`
                <h3 class="kw-modal-title" style="color:#f59e0b;"><span class="material-icons-round">warning</span> Frase de Recuperação</h3>
                <div class="kw-warning-box">
                    <span class="material-icons-round">warning</span>
                    <p>Nunca compartilhe com ninguém! Quem tiver essa frase terá controle total da carteira.</p>
                </div>
                <div class="kw-mnemonic-display">${m}</div>
                <button onclick="navigator.clipboard.writeText('${m}');if(typeof showKordAlert==='function')showKordAlert('Copiado','Frase copiada!','check_circle','#10b981');" class="kw-btn-secondary kw-full-width" style="margin-top:10px;">
                    <span class="material-icons-round">content_copy</span> Copiar
                </button>
            `);
        } catch (e) {
            if (typeof showKordAlert === 'function') showKordAlert('Acesso Negado', 'Não foi possível revelar a frase. A carteira pode estar bloqueada.', 'error_outline', '#ef4444');
        }
    }

    function _revealPrivKeyAction() {
        try {
            const pk = KordBlockchain.exportPrivateKey();
            _showWalletModal(`
                <h3 class="kw-modal-title" style="color:#ef4444;"><span class="material-icons-round">warning</span> Chave Privada</h3>
                <div class="kw-warning-box">
                    <span class="material-icons-round">warning</span>
                    <p>EXTREMAMENTE SENSÍVEL! Nunca compartilhe. Quem tiver esta chave terá controle total.</p>
                </div>
                <div class="kw-mnemonic-display" style="word-break:break-all;font-size:0.75rem;">${pk}</div>
                <button onclick="navigator.clipboard.writeText('${pk}');if(typeof showKordAlert==='function')showKordAlert('Copiado','Chave privada copiada!','check_circle','#10b981');" class="kw-btn-secondary kw-full-width" style="margin-top:10px;">
                    <span class="material-icons-round">content_copy</span> Copiar
                </button>
            `);
        } catch (e) {
            if (typeof showKordAlert === 'function') showKordAlert('Acesso Negado', 'Não foi possível revelar a chave privada. A carteira pode estar bloqueada.', 'error_outline', '#ef4444');
        }
    }

    function _lockWalletAction() {
        KordBlockchain.lockWallet();
        if (typeof showKordAlert === 'function') showKordAlert('Bloqueada', 'Carteira bloqueada com segurança.', 'lock', '#6366f1');
        _closeWalletModal();
        openWalletView();
    }

    function _showNetworkSelector() {
        _showWalletSettings();
    }

    function _showTxDetails(hash) {
        const net = KordBlockchain.getNetwork();
        const explorerUrl = `${net.explorer}/tx/${hash}`;
        window.open(explorerUrl, '_blank');
    }

    function _switchDashTab(tab) {
        if (tab === 'history') {
            _loadTxList();
        }
    }

    // ==========================================================
    // MODAL SYSTEM
    // ==========================================================
    function _showWalletModal(content) {
        let modal = document.getElementById('kw-modal-overlay');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'kw-modal-overlay';
            modal.className = 'kw-modal-overlay';
            modal.onclick = (e) => { if (e.target === modal) _closeWalletModal(); };
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="kw-modal-box">
                <button onclick="KordWalletUI._closeWalletModal()" class="kw-modal-close">
                    <span class="material-icons-round">close</span>
                </button>
                ${content}
            </div>
        `;

        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.style.opacity = '1');
    }

    function _closeWalletModal() {
        const modal = document.getElementById('kw-modal-overlay');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }

    return {
        openWalletView,
        showCreateWallet,
        showImportWallet,
        _executeCreateWallet,
        _copyMnemonic,
        _copyAddress,
        _completeSetup,
        _switchImportTab,
        _executeImport,
        _executeUnlock,
        _refreshBalance,
        _showSendModal,
        _showReceiveModal,
        _showWalletSettings,
        _estimateAndSend,
        _doSwitchNetwork,
        _exportKeystoreAction,
        _revealMnemonicAction,
        _revealPrivKeyAction,
        _lockWalletAction,
        _showNetworkSelector,
        _showTxDetails,
        _switchDashTab,
        _closeWalletModal
    };
})();
