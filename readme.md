<div align="center">
  <img src="https://img.shields.io/badge/Status-Beta_Testing-success?style=for-the-badge&logo=firebase" alt="Status" />
  <img src="https://img.shields.io/badge/Version-v9.0_Live-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/Stack-JS_|_Firebase_|_WebRTC-orange?style=for-the-badge&logo=javascript" alt="Stack" />

  <h1>🌌 Luminous & Kord</h1>
  <p><b>Uma plataforma completa de Catálogo de Inteligências Artificiais e Comunicação Real-Time WebRTC com Tradução Simultânea.</b></p>
</div>

---

## 👨‍💻 Desenvolvedor
**Moisés Vianna Vanti**
*(Criador e Desenvolvedor Principal do Luminous & Kord)*

---

## 📖 O que é o Projeto?

O projeto é dividido em dois grandes ecossistemas que funcionam em harmonia dentro de uma única aplicação SPA (Single Page Application):

1. **Luminous Engine:** Um catálogo curado e dinâmico focado em apresentar e gerenciar Inteligências Artificiais. Possui busca ultrarrápida (Debounce), interface em Glassmorphism responsivo, suporte dinâmico a temas (Light/Dark/Eco-Mode) e mecânicas de favoritos para facilitar o acesso às melhores ferramentas disponíveis na Web.
2. **Kord Meet:** Um robusto sistema de comunicação e rede social interna. Substitui a necessidade de aplicativos pesados através de um chat em tempo real com mensagens, fóruns e um sistema avançado de Walkie-Talkie/Chamadas de Vídeo via **WebRTC**. O Kord conta inclusive com um trunfo excepcional: **Tradução de Voz Simultânea por IA em Tempo Real (Powered by Groq)**, permitindo que pessoas de idiomas diferentes se comuniquem por áudio nativamente.

🔗 **Acesse o ambiente de testes aqui:** [https://kordtesters.netlify.app/](https://kordtesters.netlify.app/)

---

## ✨ Principais Funcionalidades

### 💬 Comunicação Kord
- **Chat P2P & Fóruns:** Crie canais, envie mensagens de texto com links mágicos, gifs e arquivos.
- **Chamadas de Voz e Vídeo (WebRTC):** Suporte a transmissão de Webcam, compartilhamento de tela e microfone com controles nativos de mute e deafen.
- **Tradução Simultânea (Groq AI):** O Kord intercepta o microfone durante as chamadas, transcreve e traduz em tempo real (TTS opcional) o áudio para as pessoas na sala, quebrando as barreiras de linguagem automaticamente.
- **Transações P2P Inline:** Sistema embarcado do PayPal (Smart Buttons) permite que os usuários enviem transferências/pagamentos de ponta a ponta sem nunca sair da interface de chat do Kord.

### 🧪 Ecossistema Luminous
- **UI Responsiva & Glassmorphism:** Elementos espelhados, animações suaves e renderização performática otimizada via DOM Virtual (criado via JS puro).
- **Personalização de Perfil:** Os usuários podem definir cores temáticas ("Theme Color") que alteram como suas interfaces são geradas e apresentadas aos outros participantes dentro da sala, além de equipar decorações em avatares.
- **Sistema Anti-Hacker (Luminous Shield):** O código possui "Debugger Traps" elaborados contra inspeção de elementos maliciosos, interceptadores de tráfego e DevTools, blindando a integridade da UI Reactiva.

---

## 🛠 Tecnologias Utilizadas

Este projeto foi construído utilizando tecnologias puras sem a necessidade de pacotes compilados pesados (Zero-Bundler), mantendo alto nível de segurança e responsividade:

- **HTML5 & CSS3 Vanilla:** Com variáveis dinâmicas em CSS (`:root`), flexbox e manipulação de animações de chave.
- **JavaScript Vanilla (ES6+):** Controle total de DOM, estado, MediaDevices API, SpeechSynthesis global e SpeechRecognition em tempo real.
- **Firebase Realtime Database:** Controle de estado sincronizado de usuários onlines, canais, fóruns e histórico de mensagens com atualização `<100ms`.
- **Firebase Authentication:** Gestão de login de contas, tokens seguros e perfis.
- **WebRTC & MediaRecorder:** Captura e emissão em blocos do áudio para chamadas via walkie-talkie mode.
- **Groq Whisper API:** Processamento massivo instantâneo para reconhecimento de fala neural usado no botão tradutor da chamada.

---

## 🎯 Objetivo dos Testadores (Bug Hunting)

Se você foi convidado ao repositório de testes, sua missão é tentar quebrar o sistema! Tente forçar:

1. Modificações de Avatar, Envio massivo de mensagens e Fóruns.
2. Tentativas de inspecionar elemento (F12) para validar a persistência da proteção da malha (Luminous Shield).
3. Entrar na central WebRTC e ligar a IA do microfone enquanto outro parceiro fala em russo ou inglês e validar o TTS.
4. Caso aponte um defeito, utilize o ícone de **"Bug"** na barra de navegação amarela pra disparar o report! Boas caçadas. 🛡️
