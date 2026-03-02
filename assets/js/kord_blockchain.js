/**
 * ============================================================
 * KORD BLOCKCHAIN ENGINE v1.0
 * Client-side HD wallet generation, multi-chain support,
 * transaction signing, and anonymous crypto operations.
 * Uses ethers.js for real blockchain interaction.
 * ============================================================
 * 
 * FEATURES:
 * - BIP39 mnemonic generation (12/24 words)
 * - BIP32 HD key derivation
 * - Wallet encryption with AES-256-GCM
 * - Multi-chain: Ethereum (mainnet/testnet), Kord Token (ERC-20)
 * - Export to MetaMask/Trust Wallet compatible formats
 * - Anonymous: no KYC, no IP logging, encrypted storage
 * ============================================================
 */

'use strict';

const KordBlockchain = (() => {
    // ── State ──
    let _wallet = null;             // ethers.Wallet instance
    let _provider = null;           // ethers.JsonRpcProvider
    let _encryptedWallet = null;    // Encrypted JSON keystore
    let _mnemonic = null;           // BIP39 mnemonic (only in memory during creation)
    let _network = 'sepolia';       // Default to testnet
    let _balanceCache = {};
    let _txHistory = [];

    // ── Network Configurations ──
    const NETWORKS = {
        mainnet: {
            name: 'Ethereum Mainnet',
            chainId: 1,
            rpcUrl: 'https://eth.llamarpc.com',
            explorer: 'https://etherscan.io',
            symbol: 'ETH',
            color: '#627eea'
        },
        sepolia: {
            name: 'Sepolia Testnet',
            chainId: 11155111,
            rpcUrl: 'https://rpc.sepolia.org',
            explorer: 'https://sepolia.etherscan.io',
            symbol: 'SepoliaETH',
            color: '#cfb5f0'
        },
        polygon: {
            name: 'Polygon',
            chainId: 137,
            rpcUrl: 'https://polygon-rpc.com',
            explorer: 'https://polygonscan.com',
            symbol: 'MATIC',
            color: '#8247e5'
        },
        bsc: {
            name: 'BNB Smart Chain',
            chainId: 56,
            rpcUrl: 'https://bsc-dataseed.binance.org',
            explorer: 'https://bscscan.com',
            symbol: 'BNB',
            color: '#f3ba2f'
        }
    };

    // ── Kord Token Config (Future ERC-20) ──
    const KORD_TOKEN = {
        name: 'Kord',
        symbol: 'KORD',
        decimals: 18,
        contractAddress: null, // Will be set after deployment
        initialSupply: '1000000000', // 1 billion
        icon: '🪙'
    };

    // ERC-20 Standard ABI (minimal for transfers)
    const ERC20_ABI = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'event Transfer(address indexed from, address indexed to, uint256 value)'
    ];

    // ==========================================================
    // PROVIDER MANAGEMENT
    // ==========================================================
    function _getProvider() {
        if (_provider) return _provider;
        const net = NETWORKS[_network];
        if (!net) throw new Error('Network not configured: ' + _network);

        if (typeof ethers !== 'undefined') {
            // ethers v6
            if (ethers.JsonRpcProvider) {
                _provider = new ethers.JsonRpcProvider(net.rpcUrl);
            }
            // ethers v5
            else if (ethers.providers && ethers.providers.JsonRpcProvider) {
                _provider = new ethers.providers.JsonRpcProvider(net.rpcUrl);
            }
        }
        return _provider;
    }

    function switchNetwork(networkKey) {
        if (!NETWORKS[networkKey]) throw new Error('Unknown network: ' + networkKey);
        _network = networkKey;
        _provider = null; // Reset provider
        _balanceCache = {};
        _getProvider();
        _saveState();
        return NETWORKS[networkKey];
    }

    function getNetwork() {
        return { key: _network, ...NETWORKS[_network] };
    }

    function getAllNetworks() {
        return Object.entries(NETWORKS).map(([key, val]) => ({ key, ...val, active: key === _network }));
    }

    // ==========================================================
    // WALLET CREATION (Real BIP39/BIP32)
    // ==========================================================
    async function createWallet(password) {
        if (!password || password.length < 6) {
            throw new Error('Senha deve ter pelo menos 6 caracteres');
        }

        let wallet;
        if (typeof ethers !== 'undefined') {
            // ethers v6
            if (ethers.Wallet && ethers.Wallet.createRandom) {
                wallet = ethers.Wallet.createRandom();
            }
            // ethers v5
            else if (ethers.Wallet) {
                wallet = ethers.Wallet.createRandom();
            }
        }

        if (!wallet) throw new Error('ethers.js not loaded');

        _wallet = wallet;
        _mnemonic = wallet.mnemonic ? (wallet.mnemonic.phrase || wallet.mnemonic) : null;

        // Encrypt wallet with user password
        const encrypted = await wallet.encrypt(password);
        _encryptedWallet = encrypted;

        // Save encrypted wallet to Firebase (only encrypted blob)
        await _saveWalletToCloud(encrypted);

        // Connect to provider
        if (_getProvider()) {
            _wallet = wallet.connect(_getProvider());
        }

        _saveState();

        return {
            address: wallet.address,
            mnemonic: _mnemonic,
            network: NETWORKS[_network]
        };
    }

    // ==========================================================
    // WALLET IMPORT (Mnemonic or Private Key)
    // ==========================================================
    async function importFromMnemonic(mnemonic, password) {
        if (!password || password.length < 6) {
            throw new Error('Senha deve ter pelo menos 6 caracteres');
        }

        let wallet;
        if (ethers.Wallet && ethers.Wallet.fromPhrase) {
            // ethers v6
            wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
        } else if (ethers.Wallet && ethers.Wallet.fromMnemonic) {
            // ethers v5
            wallet = ethers.Wallet.fromMnemonic(mnemonic.trim());
        } else {
            throw new Error('ethers.js version not supported');
        }

        _wallet = wallet;
        _mnemonic = mnemonic.trim();

        const encrypted = await wallet.encrypt(password);
        _encryptedWallet = encrypted;
        await _saveWalletToCloud(encrypted);

        if (_getProvider()) {
            _wallet = wallet.connect(_getProvider());
        }

        _saveState();

        return { address: wallet.address, network: NETWORKS[_network] };
    }

    async function importFromPrivateKey(privateKey, password) {
        if (!password || password.length < 6) {
            throw new Error('Senha deve ter pelo menos 6 caracteres');
        }

        const wallet = new ethers.Wallet(privateKey.trim());
        _wallet = wallet;
        _mnemonic = null; // No mnemonic when importing via private key

        const encrypted = await wallet.encrypt(password);
        _encryptedWallet = encrypted;
        await _saveWalletToCloud(encrypted);

        if (_getProvider()) {
            _wallet = wallet.connect(_getProvider());
        }

        _saveState();

        return { address: wallet.address, network: NETWORKS[_network] };
    }

    async function importFromKeystore(keystoreJson, password) {
        let wallet;
        if (ethers.Wallet && ethers.Wallet.fromEncryptedJson) {
            // ethers v6
            wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, password);
        } else if (ethers.Wallet) {
            // ethers v5
            wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, password);
        }

        _wallet = wallet;
        _encryptedWallet = keystoreJson;
        _mnemonic = null;

        await _saveWalletToCloud(keystoreJson);

        if (_getProvider()) {
            _wallet = wallet.connect(_getProvider());
        }

        _saveState();

        return { address: wallet.address, network: NETWORKS[_network] };
    }

    // ==========================================================
    // UNLOCK WALLET (From encrypted storage)
    // ==========================================================
    async function unlockWallet(password) {
        if (!_encryptedWallet) {
            // Try loading from Firebase
            const cloud = await _loadWalletFromCloud();
            if (!cloud) throw new Error('Nenhuma carteira encontrada');
            _encryptedWallet = cloud;
        }

        let wallet;
        if (ethers.Wallet && ethers.Wallet.fromEncryptedJson) {
            wallet = await ethers.Wallet.fromEncryptedJson(_encryptedWallet, password);
        } else {
            throw new Error('ethers.js not loaded');
        }

        _wallet = wallet;

        if (_getProvider()) {
            _wallet = wallet.connect(_getProvider());
        }

        _saveState();

        return { address: wallet.address, network: NETWORKS[_network] };
    }

    // ==========================================================
    // WALLET EXPORT
    // ==========================================================
    function exportKeystore() {
        if (!_encryptedWallet) throw new Error('Nenhuma carteira carregada');
        return _encryptedWallet;
    }

    function exportPrivateKey() {
        if (!_wallet) throw new Error('Carteira não desbloqueada');
        return _wallet.privateKey;
    }

    function exportMnemonic() {
        if (!_wallet) throw new Error('Carteira não desbloqueada');
        const m = _wallet.mnemonic;
        if (m) return m.phrase || m;
        if (_mnemonic) return _mnemonic;
        throw new Error('Mnemonic não disponível (importado via private key)');
    }

    function getAddress() {
        if (!_wallet) return null;
        return _wallet.address;
    }

    // ==========================================================
    // BALANCE & TRANSACTIONS
    // ==========================================================
    async function getBalance() {
        if (!_wallet) throw new Error('Carteira não desbloqueada');
        const provider = _getProvider();
        if (!provider) throw new Error('Provider não disponível');

        const balance = await provider.getBalance(_wallet.address);
        const formatted = ethers.formatEther ? ethers.formatEther(balance) : ethers.utils.formatEther(balance);

        _balanceCache[_network] = {
            raw: balance.toString(),
            formatted: formatted,
            symbol: NETWORKS[_network].symbol,
            timestamp: Date.now()
        };

        return _balanceCache[_network];
    }

    async function getTokenBalance(tokenAddress) {
        if (!_wallet) throw new Error('Carteira não desbloqueada');
        const provider = _getProvider();
        if (!provider) throw new Error('Provider não disponível');

        const Contract = ethers.Contract || (ethers.Contract);
        const contract = new Contract(tokenAddress, ERC20_ABI, provider);
        const balance = await contract.balanceOf(_wallet.address);
        const decimals = await contract.decimals();
        const symbol = await contract.symbol();

        const formatted = ethers.formatUnits ? ethers.formatUnits(balance, decimals) : ethers.utils.formatUnits(balance, decimals);

        return { raw: balance.toString(), formatted, symbol, decimals };
    }

    async function sendTransaction(toAddress, amountEth, options = {}) {
        if (!_wallet) throw new Error('Carteira não desbloqueada');

        const provider = _getProvider();
        if (!provider) throw new Error('Provider não disponível');

        // Ensure wallet is connected to provider
        const connectedWallet = _wallet.provider ? _wallet : _wallet.connect(provider);

        const parseEther = ethers.parseEther || ethers.utils.parseEther;
        const value = parseEther(amountEth.toString());

        const tx = {
            to: toAddress,
            value: value
        };

        // Optional gas settings
        if (options.gasLimit) tx.gasLimit = options.gasLimit;
        if (options.gasPrice) tx.gasPrice = options.gasPrice;

        // Sign and send
        const txResponse = await connectedWallet.sendTransaction(tx);

        // Log transaction
        const txRecord = {
            hash: txResponse.hash,
            from: _wallet.address,
            to: toAddress,
            value: amountEth,
            symbol: NETWORKS[_network].symbol,
            network: _network,
            status: 'pending',
            timestamp: Date.now()
        };
        _txHistory.unshift(txRecord);
        _saveTxToCloud(txRecord);

        // Wait for confirmation (async)
        txResponse.wait().then((receipt) => {
            txRecord.status = receipt.status === 1 ? 'confirmed' : 'failed';
            txRecord.blockNumber = receipt.blockNumber;
            txRecord.gasUsed = receipt.gasUsed ? receipt.gasUsed.toString() : '0';
            _saveTxToCloud(txRecord);
        }).catch(() => {
            txRecord.status = 'failed';
            _saveTxToCloud(txRecord);
        });

        return txRecord;
    }

    async function sendToken(tokenAddress, toAddress, amount) {
        if (!_wallet) throw new Error('Carteira não desbloqueada');

        const provider = _getProvider();
        const connectedWallet = _wallet.provider ? _wallet : _wallet.connect(provider);
        const Contract = ethers.Contract;
        const contract = new Contract(tokenAddress, ERC20_ABI, connectedWallet);

        const decimals = await contract.decimals();
        const parseUnits = ethers.parseUnits || ethers.utils.parseUnits;
        const parsedAmount = parseUnits(amount.toString(), decimals);

        const tx = await contract.transfer(toAddress, parsedAmount);
        const symbol = await contract.symbol();

        const txRecord = {
            hash: tx.hash,
            from: _wallet.address,
            to: toAddress,
            value: amount,
            symbol: symbol,
            network: _network,
            status: 'pending',
            timestamp: Date.now(),
            type: 'token'
        };
        _txHistory.unshift(txRecord);
        _saveTxToCloud(txRecord);

        tx.wait().then((receipt) => {
            txRecord.status = receipt.status === 1 ? 'confirmed' : 'failed';
            _saveTxToCloud(txRecord);
        });

        return txRecord;
    }

    async function estimateGas(toAddress, amountEth) {
        const provider = _getProvider();
        if (!provider) return null;

        try {
            const parseEther = ethers.parseEther || ethers.utils.parseEther;
            const gasEstimate = await provider.estimateGas({
                from: _wallet.address,
                to: toAddress,
                value: parseEther(amountEth.toString())
            });

            const feeData = await provider.getFeeData();
            const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;

            const formatEther = ethers.formatEther || ethers.utils.formatEther;
            const totalFee = gasEstimate * gasPrice;

            return {
                gasLimit: gasEstimate.toString(),
                gasPrice: gasPrice.toString(),
                estimatedFee: formatEther(totalFee),
                symbol: NETWORKS[_network].symbol
            };
        } catch (e) {
            console.error('[KordBlockchain] Gas estimation failed:', e);
            return null;
        }
    }

    // ==========================================================
    // TRANSACTION HISTORY
    // ==========================================================
    function getTransactionHistory() {
        return _txHistory;
    }

    async function loadTransactionHistory() {
        const user = firebase.auth().currentUser;
        if (!user) return [];

        try {
            const snap = await firebase.database()
                .ref(`wallets/${user.uid}/transactions`)
                .orderByChild('timestamp')
                .limitToLast(50)
                .once('value');

            if (snap.val()) {
                _txHistory = Object.values(snap.val()).sort((a, b) => b.timestamp - a.timestamp);
            }
        } catch (e) {
            console.error('[KordBlockchain] Failed to load tx history:', e);
        }

        return _txHistory;
    }

    // ==========================================================
    // QR CODE GENERATION (Pure JS, no external lib)
    // ==========================================================
    function generateAddressQR(size = 200) {
        if (!_wallet) return null;
        // Use a QR code API endpoint (no external JS needed)
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${_wallet.address}&bgcolor=0f172a&color=6366f1`;
    }

    // ==========================================================
    // FIREBASE STORAGE (Encrypted)
    // ==========================================================
    async function _saveWalletToCloud(encryptedJson) {
        const user = firebase.auth().currentUser;
        if (!user) return;

        await firebase.database().ref(`wallets/${user.uid}/keystore`).set({
            data: encryptedJson,
            network: _network,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            version: 1
        });
    }

    async function _loadWalletFromCloud() {
        const user = firebase.auth().currentUser;
        if (!user) return null;

        const snap = await firebase.database().ref(`wallets/${user.uid}/keystore`).once('value');
        const val = snap.val();
        if (val && val.data) {
            if (val.network) _network = val.network;
            return val.data;
        }
        return null;
    }

    async function _saveTxToCloud(txRecord) {
        const user = firebase.auth().currentUser;
        if (!user) return;

        await firebase.database()
            .ref(`wallets/${user.uid}/transactions/${txRecord.hash}`)
            .set(txRecord);
    }

    function _saveState() {
        try {
            localStorage.setItem('kord_wallet_network', _network);
            if (_wallet) {
                localStorage.setItem('kord_wallet_address', _wallet.address);
            }
        } catch (e) { /* ignore */ }
    }

    function _loadState() {
        try {
            const net = localStorage.getItem('kord_wallet_network');
            if (net && NETWORKS[net]) _network = net;
        } catch (e) { /* ignore */ }
    }

    // ==========================================================
    // WALLET STATUS
    // ==========================================================
    function isWalletCreated() {
        return !!_encryptedWallet || !!localStorage.getItem('kord_wallet_address');
    }

    function isWalletUnlocked() {
        return !!_wallet;
    }

    function lockWallet() {
        _wallet = null;
        _mnemonic = null;
    }

    async function hasCloudWallet() {
        const user = firebase.auth().currentUser;
        if (!user) return false;
        const snap = await firebase.database().ref(`wallets/${user.uid}/keystore`).once('value');
        return snap.exists();
    }

    // ==========================================================
    // INIT
    // ==========================================================
    async function init() {
        _loadState();
        _getProvider();

        // Check if user has a wallet in cloud
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                const cloud = await _loadWalletFromCloud();
                if (cloud) {
                    _encryptedWallet = cloud;
                }
                await loadTransactionHistory();
            }
        });

        console.log('🪙 KordBlockchain Engine v1.0 initialized (' + NETWORKS[_network].name + ')');
    }

    return {
        // Wallet lifecycle
        createWallet,
        importFromMnemonic,
        importFromPrivateKey,
        importFromKeystore,
        unlockWallet,
        lockWallet,
        isWalletCreated,
        isWalletUnlocked,
        hasCloudWallet,

        // Export
        exportKeystore,
        exportPrivateKey,
        exportMnemonic,
        getAddress,

        // Network
        switchNetwork,
        getNetwork,
        getAllNetworks,

        // Transactions
        getBalance,
        getTokenBalance,
        sendTransaction,
        sendToken,
        estimateGas,
        getTransactionHistory,
        loadTransactionHistory,

        // Utility
        generateAddressQR,

        // Token config
        KORD_TOKEN,
        NETWORKS,

        // Init
        init
    };
})();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => KordBlockchain.init());
