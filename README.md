# 🌌 Luminous & Kord — Live Testing Environment

![Banner](https://img.shields.io/badge/Status-Beta_Testing-success?style=for-the-badge&logo=firebase) ![Version](https://img.shields.io/badge/Version-v9.0_Live-blue?style=for-the-badge) ![Tech](https://img.shields.io/badge/Stack-JS_|_Firebase_|_WebRTC-orange?style=for-the-badge&logo=javascript)

Bem-vindo ao repositório de testes do **Luminous & Kord**! 

Antes de colocarmos a mão na massa para alterar o código, **precisamos da sua ajuda para quebrar o sistema.** O objetivo desta versão ao vivo é encontrar bugs na prática de uso diário, registrar falhas de UI e estressar as defesas da aplicação.

🔗 **Acesse o ambiente de testes aqui:** [https://kordtesters.netlify.app/](https://kordtesters.netlify.app/)

---

## 🎯 Objetivo dos Testadores (Bug Hunting)

Sua missão inicial é acessar a URL acima simulando um usuário comum ou mal-intencionado e testar exaustivamente os módulos abaixo. Reporte qualquer comportamento estranho, lentidão ou tela travada relatando o fluxo que você executou. Depois que mapearmos os problemas, nós consertaremos no código fonte!

### 🧪 Área 1: Luminous Engine (Curadoria de IAs)
O Luminous é o catálogo inicial da aplicação. Tente:
1.  **Pesquisar rapidamente e apagar letras:** O sistema (Debounce) consegue acompanhar sua digitação ou ele trava?
2.  **Clicar em Várias IAs:** Navegue pelos cards, clique em "Apoiar Projeto", "Changelog" e verifique as transições (Glassmorphism).
3.  **Salvar Favoritos:** Favorite IAs, vá na aba "Salvos" e atualize a página. Eles continuam lá?
4.  **Temas e Eco-Mode:** Brinque com o Dark/Light theme e com o Eco-Mode (desligar animações). Alguma página quebrou as cores?

### 💬 Área 2: Kord Meet (Comunicação)
Acesse a aba `Kord (Meet)` na lateral. Crie uma conta no sistema (leva 10 segundos) e tente quebrar o chat:
1.  **Interações de Mensagem:** Clique com botão direito (ou segure no celular) em qualquer mensagem. Teste as opções: Fixar, Copiar ID, Responder. 
2.  **O Teste do Link:** Copie o **"Link Direto"** de uma mensagem. Abra uma aba anônima ou envie pra um amigo. Ao clicar, o sistema deve ignorar o carregamento normal, voar direto pro Servidor correto e rolar a página magicamente até a mensagem exata com uma animação roxa. Funciona se você não estiver logado?
3.  **Avatar & Cores:** Altere seu nickname e as cores da sua foto (no Ícone da Engrenagem). As pessoas no chat veem essa mudança em tempo real?
4.  **Tradução On-Device (Groq API):** Tente mandar enviar comandos pro Translator (bot de IA local) ou ouvir uma mensagem de texto ser traduzida e falada via TTS (Áudio Artificial). Algum delay ou alucinação?

### 🔒 Área 3: Luminous Shield (Tentativa de Hacker)
O Kord odeia ser espionado. Desafiamos você a tentar roubar o código:
1.  **Clique Direito:** Tente inspecionar elemento.
2.  **Teclado:** F12, Ctrl+Shift+I, Ctrl+Shift+C.  
3.  **Navegador:** Se você arranjar um jeito de abrir a aba de Desenvolvedor (DevTools) pelos menus próprios do seu Chrome ou Safari, o **Debugger Trap** deve reagir em menos de 1 segundo cobrindo sua tela com uma Mensagem de Bloqueio Vermelha gigante e inativando a aba inteira. Conseguiu burlar?

### 💳 Área 4: Transações P2P Inline
Encontre um contato no DM que tenha configurado e-mail do PayPal (no perfil dele).
1. Clique em **Enviar via PayPal**. 
2. Escolha o valor e clique "Avançar".
3. **Ponto Crítico:** Ao invés de ser arremessado pra fora do site, um iFrame dinâmico e seguro com botões nativos do PayPal (amarelo e preto) devem abrir **ali mesmo no nosso design**, fluindo e voltando sutilmente (Fluxo Inline puro, Smart Buttons). Falhou? Deu erro carregando o frame?

---

## 🛠 Para Visualizar os Erros (Antes de começar a arrumar o Código)

Se você encontrar um problema nas rotinas acima no link [kordtesters](https://kordtesters.netlify.app/):

1. Vá na navegação Mobile ou Desktop do Luminous e clique no botão **Bug (Amarelo)**.
2. Preencha e dispare lá mesmo (nosso log do Firebase guardará os dados).
3. Se for um problema técnico para discussões aqui no GitHub ou com a IA, liste os *Issues* claramente documentando qual módulo explodiu!

Após a fase de quebra, nós viremos arrumar o comportamento do repositório! Boas caçadas. 🛡️
