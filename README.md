# 🌌 Project Luminous & Kord V2.0

Project Luminous é um ecossistema completo focado em **cibersegurança, automação, comunicação P2P e moderação assistida por Inteligência Artificial**. Projetado a partir do zero utilizando princípios modernos de *Liquid Glass* e arquitetura em tempo real via Firebase, Luminous conecta ferramentas hardcore de segurança com um cliente web ultrasseguro (Kord).

---

## 🚀 O que o Luminous oferece? (Core Features)

O painel centralizador (Luminous) entrega acesso a ferramentas agressivas e sistemas de automação criados para pentesters e pesquisadores de segurança.

*   **🧪 Script Lab (Gerador IA)**: Uma suíte de geração de scripts de invasão, payload e automação impulsionada por IA (Llama 3.3 70B via Groq). Contém técnicas avançadas de *jailbreak/bypass* para garantir entregas de scripts agressivos.
*   **🕷️ SQLMap Automation**: Interface gráfica avançada para o motor SQLMap. Permite configurar flags `--dbs`, `--tables`, `--columns` e `--dump` com proxies e WAF bypass direto do painel.
*   **💳 PagueMax Checker**: Motor assíncrono multi-thread em Python para verificação em massa de cartões de crédito/débito contra gateways como o PayPal, com integração de proxies residenciais.
*   **🪞 Localhost Mirror Proxy**: Uma ferramenta customizada para clonar sites e levantar um mirror rodando localmente (localhost), fazendo bypass de CORS e permitindo testes de infiltração sem alarmar wafs do escopo real.
*   **💰 Sistema de Doação (PayPal IPN)**: Um painel de suporte automatizado via PayPal API, garantindo o selo de "Apoiador Verificado", tracking de receita e liberação instantânea de benefícios V.I.P para usuários cadastrados.
*   **🛡️ Autenticação Unificada Firebase**: Sistema robusto de Login / Registro / Recuperação de Senha com persistência de sessões, perfis globais e geração automática de Nicks únicos.
*   **📊 Luminous Admin Dashboard**: Painel de administração *Real-Time*, restrito via servidor, contendo: estatísticas dinâmicas, gerenciamento de Doadores, visualizador de acesso a logs, histórico de bugs, ranking de pesquisas no sistema e gerador de Notificações Globais via Push.

---

## 🔮 Kord (Premium Chat & Voice Client)

O **Kord** é a evolução do bate-papo: um cliente WebRTC + Firebase integrado ao Luminous. Focado em privacidade, velocidade e customização gráfica profunda.

### 🎭 Personalização Estrema (Theme Engine)
*   **Seletor de Cores Dinâmico**: O Kord adapta a inteface, os botões, os brilhos neon (glow) e as sombras das caixas baseado unicamente na cor Hex escolhida pelo usuário.
*   **Liquid Glass Design**: O aplicativo foi estruturado com CSS Backdrop-filters e gradients radiais, entregando uma interface hiper realista de vidro líquido e bordas suaves.
*   **Efeitos Visuais Interativos (FX Layer)**: Um motor de partículas renderiza animações globais impressionantes por toda a plataforma usando CSS Puro + JS Injection. Contém efeitos exóticos como:
    *   🔥 **Fogo**: Partículas escaláveis na base do aplicativo.
    *   💨 **Fumaça**: Névoa suave fluindo verticalmente.
    *   ❄️ **Gelo**: Cristalização progressiva das bordas.
    *   ⚡ **Neon**: Pulsação cyberpunk de alta voltagem.
    *   🌊 **Aurora**: Ondulações de luzes boreais no fundo.
    *   🌌 **Matrix**: Cascata digital de dados descendentes.
    *   🔮 **Partículas / ✨ Brilho**: Elementos flutuantes interativos brilhantes.

### 💬 Comunicação e Conectividade
*   **Servidores e Canais**: Comunidades (Servidores) com divisão por Categorias e Canais focados em texto ou voz.
*   **Chat Direto (DM) e Grupos**: Chat P2P instantâneo com suporte a grupos dinâmicos, criação de convites (`/invite`) e gerenciamento de membros.
*   **WebRTC Voz e Vídeo**: Chamadas de áudio e vídeo em grupo ou privadas habilitando P2P real e latência próxima a zero. Controles avançados de silenciador de microfone, ensurdecimento e compartilhamento seguro da tela.
*   **Compartilhamento de Arquivos via WebTorrent (P2P)**: O Kord permite compartilhamento de mídia sem consumo de banda do servidor central. Os arquivos são pulverizados via protocolo WebTorrent Magnético com expiração automática e streaming direto pela memória do navegador.

### 🧠 Integração Nativa de I.A (Groq Api)
*   **Tradutor Interativo em Tempo Real**: Uma IA residente escuta as mensagens e pode lê-las em voz alta usando SpeechSynthesis API nativo.
*   **Tradutor Universal (Google Translate)**: Interface conectada à engine do Google para conversão em tempo real do idioma global da aplicação, permitindo a usuários do mundo todo explorarem o site sem barreiras.
*   **Geração Inteligente de Respostas e Designers**: Módulos AI auxiliam diretamente no uso de comandos diários dentro das caixas de mensagem.

### 🚔 Kord Security & Moderation Engine
A segurança do Kord não aceita falhas. Um módulo de proteção ultra restritivo defende a comunidade em tempo real.

*   **Fingerprint Anti-Fraude (HWID)**: O Kord assina criptograficamente o hardware do usuário (User Agent, Concurrency, Hardware Mem, Canvas, Langs) e gera um Serial ID fixo pseudo-anônimo que impede a criação de contas fakes se a máquina original for banida.
*   **AI Anti-Porn/Pedophilia/Nazism (Zero Tolerância)**: O ato de apertar `[ENTER]` dispara um *hook* direto na Llama-3 70B (Groq) avaliando a toxicidade extrema (Nazismo, Pedofilia, Pornografia). Ao detectar a violação, o sistema bane o **HWID** e o **IP** permanentemente em milissegundos, antes mesmo de salvar no banco de dados, além de deletar **grupos, DMs ou Servidores inteiros** automaticamente.
*   **Admin Reports e Banimento de Falsos Relatos**: Mensagens comuns podem ser denunciadas anonimamente via botão direito (Context Menu). Se o Admin, analisando a queixa, notar malícia por parte do denunciante (falso report / trolagem), um **Sistema de Punição Expressa** dentro do painel do Admin permite suspensões de 10 Dias automáticas a quem relatou, ou ao infrator original. O acúmulo de 3 suspensões temporárias converte-se automaticamente em **Banimento Permanente de Hardware**.

---

## 🛠️ Stack Tecnológica
*   **Frontend**: HTML5 Semântico, Vanilla JavaScript Módular. CSS3 Avançado (Flex/Grid, Animations, Backdrop Filters, Glassmorphism).
*   **Backend / DB**: Google Firebase Realtime Database & Firebase Auth.
*   **APIs**: PayPal API (PagueMax / Donate), Groq API (LLaMA 3.3 Versatile), WebTorrent, WebRTC (PeerJS).
*   **Hospedagem**: Arquitetura Híbrida Web/Localhost.

---
*Luminous / Kord v2.0 - Desenvolvido para estabilidade, agressividade estética e impenetrável segurança.*
