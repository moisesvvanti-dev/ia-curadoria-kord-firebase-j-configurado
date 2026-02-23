# 🌌 Luminous & Kord System Architecture

![Banner](https://img.shields.io/badge/Status-Active_Development-success?style=for-the-badge&logo=firebase) ![Version](https://img.shields.io/badge/Version-v9.0_Stable-blue?style=for-the-badge) ![Tech](https://img.shields.io/badge/Stack-JS_|_Firebase_|_WebRTC-orange?style=for-the-badge&logo=javascript)

Bem-vindo ao repositório do **Luminous & Kord**, uma plataforma unificada de curadoria avançada de IAs (Luminous) integrada a um ecossistema de comunicação em tempo real de altíssima fidelidade (Kord Meet).

Desenvolvido com foco absoluto em **performance**, **design premium (Glassmorphism + Dark Mode)** e **privacidade on-device**, o projeto consolida dezenas de utilitários em um ambiente web limpo e ágil (Serverless via Firebase).

---

## 🚀 1. Luminous Engine (Curadoria de IAs)
O módulo principal que o usuário acessa ao carregar a plataforma. Um diretório gigante de Inteligências Artificiais voltado para profissionais.

*   **Busca Semântica & Discovery Engine:** Busca instantânea (debounce) com rastreamento analítico. Termos não encontrados são enviados a uma Fila de Descoberta (`discovery_queue`) no Firebase para curadoria humana.
*   **Algoritmo de Tendências Global:** Sistema de rastreamento de uso (`ClickTracker`) que computa cliques e monta um ranking automático semanal das top 5 IAs mais populares.
*   **Sistema de Favoritos On-Device:** Salva e gerencia os cards favoritos localmente, reduzindo carregamentos em nuvem.
*   **Eco-Mode & Modo Anônimo:** Usuários podem desligar animações visuais para economizar bateria (Eco) e desativar rastreamento analítico (Anônimo).
*   **Modo Noturno (Light/Dark Toggle):** Motor de temas ajustável on-the-fly (`theme_engine.js`).
*   **Avisos Push Globais:** Banners que "caem do topo" para todos os usuários notificando novidades importantes puxadas remotamente.

---

## 💬 2. Kord Meet (O "Discord" Nativo)
A aba lateral do Luminous dá acesso ao **Kord**, uma aplicação de chat colossal que roda integralmente via Web e Firebase Realtime Database. As funcionalidades de chat são divididas em categorias:

*   **Fórum Geral:** Um ambiente público (read-only para usuários normais, editável por SuperAdmins).
*   **Private Direct Messages (DMs):** Criptografia de ponta a ponta e histórico isolado (1-on-1).
*   **Grupos Privados:** Bate-papos com dezenas de instâncias rodando membros ilimitados, edição de ícone e controles locais.
*   **Servidores & Canais:** Infraestrutura idêntica ao Discord. Owners podem criar um Server, canais de texto e compartilhar link de convites.
    *   *Sistema de Permissões:* Mute/Kick/Ban para membros tóxicos, exclusividade de Donos/Admins.

### 🎨 Edição Otimizada de Perfil
*   **Paleta de Cores Dinâmica:** Os usuários podem selecionar uma cor de perfil em tempo real a partir de uma grade renderizada nativamente (sem depender do seletor feio do Windows/Navegador).
*   **Cooldown de Nickname:** Sistema atrelado a banco de dados impedindo trocas massivas de apelidos num período de 7 dias (Prevenção de Spam).

### 🔥 Recursos Embutidos no Chat (Mensagens)
Ao clicar com o botão direito `(ou tocar no mobile)` em uma mensagem, um menu global surge operando funções de alto nível:
1.  **Edição / Deleção Restrita:** Apenas os autores nativos (ou donos master) podem apagar/editar mensagens do ar.
2.  **Fixação (`pin`):** Exibição das mensagens-chave em um drawer lateral na UI (Pins).
3.  **Real-Time Link Sharing:** Cópias diretas de links (`?msg=Id`). A Luminous injeta inteligência de quebrar a URL, varrer todo o sistema, carregar o chat certo e dar um *scroll/highlight* mágico na mensagem solicitada sem perder o layout.
4.  **Audio Translate On-Device (Groq API):**
    *   Um usuário pode selecionar qualquer áudio ou texto e rodar um modelo (ex: Whisper ou Mixtral via Groq Hardware) direto no chat para extrair ou traduzir contextos de Francês para Inglês, etc., tudo verbalizado por TTS.

---

## 🎥 3. WebRTC Call & Transmissão On-Device
O Kord possui um pipeline de conexão assíncrona baseada no framework `Peer.js` rodando um protocolo STUN próprio (com fallback para os servidores de nuvem).
*   **Chamadas Peer-to-Peer:** Conversas limpas 1x1 sem delay de servidor.
*   **Screen Share Profissional:** Possibilidade de transmitir a tela ou guias do navegador em abas conjuntas simultâneas.
*   **Status Dinâmico (VAD):** Indicadores de áudio verde detectam quando você ou a pessoa na linha estão falando, para coibir problemas de ruído.

---

## 💳 4. Pagamentos P2P Nativos (Inline Smart Buttons)
Como monetizar e pagar parceiros sem sair da aplicação?
*   O usuário pode ir em um contato e enviar dinheiro a ele via **PayPal JS SDK**.
*   A página NUNCA recarrega. Em vez de enviar o usuário para frente e para trás com links velhos, O modal exibe um SDK nativo do PayPal, criptografa a transação e pinga a `api` silenciosamente.
*   *Auditoria:* Webhooks IPN são interceptados em segundo plano, mandando cópias de log para o administrador.

---

## 🤖 5. IA Generator Integrado (Design Automation)
O Kord não é só curadoria, ele opera modelos próprios. Um comando inserido pelo usuário ativa um workflow para ele *Gerar* logos e texturas pelo chat. E não só imagens, há prompts que criam paletas inteiras de código se solicitados, utilizando a API fornecida.

---

## 🔒 6. Escudo de Segurança (Luminous Shield)
Desenvolvido explicitamente contra roubo de código e invasões:
1.  **Trava Anti-Inspeção Global:** Clique Direito desativado na raiz (`contextmenu`).
2.  **Bloqueio de Teclas DevTools:** `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`, `Ctrl+S` permanentemente interceptados e tornados inúteis.
3.  **Debugger Trap Dinâmico:** Se pelo painel nativo do navegador o usuário conseguir abrir o console, o Shield trava o pipeline inteiro utilizando um loop infalível de `debugger`, que troca a interface visual por um layout de ERRO/BLOQUEIO inoperável, salvando a propriedade intelectual.
4.  **Rate Limiter Front-End:** Bloqueio de submissão veloz contra sobrecarga nos reports de bug ou cliques no banco do Firebase. (Evita estouro de banda na conta Host).

---

## 🛠 Arquitetura de Arquivos
*   `index.html`: A Skeleton Main e Single Page App Loader.
*   `app.js`: A engine de Busca, Cards, ClickTracker e Rotas do Luminous.
*   `kord_core.js`: O monolito robusto de interações de Chat, Permissões, Context Menus e P2P Payments.
*   `kord_auth.js`: Wrapper em cima do Firebase Auth gerindo estados e Profile Sync.
*   `kord_webrtc.js`: Camada de mídia e WebSockets (Audio, Visão, Tela, Status Rings).
*   `security.js`: O escudo global rodando antes do DOM se estabilizar.
*   `theme_engine.js`: Pintura vetorial em CSS Variables em tempo real.
*   `paypal_ipn.php`: Hook backend seguro para validação comercial P2P externa.

---

*Luminous & Kord System — "A beleza da curadoria com o poder da comunicação unificada."*
