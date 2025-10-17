import { io } from "https://cdn.socket.io/4.7.5/socket.io.min.js";

// Configurações do Backend (mantidas do seu script.js)
const API_BASE_URL = 'http://127.0.0.1:5002'; 
const SOCKET_URL = 'http://127.0.0.1:5002';
let socket = null;

// Variável de estado do usuário
let currentUser = {
    id: null,
    nome: 'Visitante',
    email: 'Faça login para continuar',
    plano: 'freemium', 
    fotoUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
};

// Elementos principais do layout
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const topbar = document.getElementById('topbar');
const openBtn = document.getElementById('openSidebarBtn');
const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
const sidebarToggleText = document.getElementById('sidebarToggleText');
const telas = document.querySelectorAll('.tela');
const menuLinks = document.querySelectorAll('#menuBar .menu-link');
const sidebarLinks = document.querySelectorAll('#sidebar a[data-sidebar]');
const menuUnderline = document.getElementById('menuUnderline');
const authBtn = document.getElementById('authBtn');
const authIcon = document.getElementById('authIcon');
const authText = document.getElementById('authText');

// Chat elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('chat-send-btn');
const typingIndicator = document.getElementById('typing-indicator');


// --- Funções de Layout e Responsividade ---

function isDesktop() {
    return window.matchMedia('(min-width: 768px)').matches;
}

// Função ajustada para usar classes Tailwind/CSS em vez de inline styles
window.toggleSidebar = function (forceOpen = undefined) {
    const isCurrentlyVisible = sidebar.classList.contains('sidebar-visible');
    const newState = forceOpen === undefined ? !isCurrentlyVisible : forceOpen;

    if (isDesktop()) {
        // Desktop: Toggle classe ml-64 no mainContent e padding-left no topbar via JS
        if (newState) {
            sidebar.classList.add('sidebar-visible');
            mainContent.classList.add('md:ml-64');
            topbar.classList.add('md:pl-64');
            sidebarToggleIcon.textContent = 'chevron_left';
            sidebarToggleText.textContent = 'Esconder menu';
        } else {
            sidebar.classList.remove('sidebar-visible');
            mainContent.classList.remove('md:ml-64');
            topbar.classList.remove('md:pl-64');
            sidebarToggleIcon.textContent = 'chevron_right';
            sidebarToggleText.textContent = 'Mostrar menu';
        }
        sidebar.classList.remove('hidden'); // Garante que não está 'hidden'
        openBtn.classList.add('hidden'); // Oculta botão flutuante
    } else {
        // Mobile: Usa translate-x-full para o efeito drawer
        if (newState) {
            sidebar.classList.add('sidebar-visible');
            sidebar.classList.remove('-translate-x-full');
            openBtn.classList.add('hidden'); // Esconde botão flutuante
        } else {
            sidebar.classList.remove('sidebar-visible');
            sidebar.classList.add('-translate-x-full');
            setTimeout(() => openBtn.classList.remove('hidden'), 400); // Mostra o botão flutuante após a transição
        }
        // O mobile não usa padding/margin no mainContent ou topbar
        mainContent.classList.remove('md:ml-64');
        topbar.classList.remove('md:pl-64');
        sidebarToggleIcon.textContent = 'close';
        sidebarToggleText.textContent = 'Fechar';
    }
}

// Ajustar estado inicial e reações a resize
function handleInitialAndResize() {
    if (isDesktop()) {
        // Força o estado visível no desktop
        sidebar.classList.remove('hidden', '-translate-x-full');
        sidebar.classList.add('sidebar-visible');
        mainContent.classList.add('md:ml-64');
        topbar.classList.add('md:pl-64');
        openBtn.classList.add('hidden'); 
    } else {
        // Força o estado oculto no mobile, mostra o botão flutuante
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('sidebar-visible');
        mainContent.classList.remove('md:ml-64');
        topbar.classList.remove('md:pl-64');
        openBtn.classList.remove('hidden');
        sidebarToggleIcon.textContent = 'close'; // Ajusta ícone de fechar no mobile
        sidebarToggleText.textContent = 'Fechar';
    }
}

// --- Funções de Navegação ---

function updateMenuUnderline(activeLink) {
    if (isDesktop() && menuUnderline && activeLink) {
        const { offsetLeft, offsetWidth } = activeLink;
        menuUnderline.style.width = `${offsetWidth}px`;
        menuUnderline.style.transform = `translateX(${offsetLeft}px)`;
    } else if (menuUnderline) {
         menuUnderline.style.width = `0px`; // Esconde o underline no mobile
    }
}

function activateMenuLink(target) {
    menuLinks.forEach(link => {
        link.classList.remove('text-pink-300', 'font-extrabold');
        link.classList.add('text-white', 'font-semibold');
        link.classList.remove('active');
    });
    if (target) {
        target.classList.add('text-pink-300', 'font-extrabold');
        target.classList.remove('text-white', 'font-semibold');
        target.classList.add('active');
        updateMenuUnderline(target);
    } else {
         updateMenuUnderline(null); 
    }
}

function activateSidebarLink(target) {
    sidebarLinks.forEach(link => {
        link.classList.remove('sidebar-link-active');
    });
    if (target) {
        target.classList.add('sidebar-link-active');
    }
}

window.showTela = function (page) {
    telas.forEach(t => t.classList.remove('ativa'));
    const telaNova = document.getElementById('tela-' + page);
    
    if (telaNova) {
        telaNova.classList.add('ativa');
    }

    if (page === 'perfil') {
        updateProfileDisplay();
    }
    
    // Tenta fechar a sidebar no mobile após a navegação
    if (!isDesktop()) {
        toggleSidebar(false); 
    }
}

// --- Funções de Usuário e Autenticação ---

function stripMarkdown(text) {
     // Função mantida do seu script.js (para limpar textos de API)
    if (!text) return '';
    let cleanedText = text;
    cleanedText = cleanedText.replace(/^#{1,6}\s*(.*)$/gm, '$1');
    cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, '$1');
    cleanedText = cleanedText.replace(/__(.*?)__/g, '$1');
    cleanedText = cleanedText.replace(/\*(.*?)\*/g, '$1');
    cleanedText = cleanedText.replace(/_(.*?)_/g, '$1');
    cleanedText = cleanedText.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    cleanedText = cleanedText.replace(/^[-\*\+]\s*/gm, '');
    cleanedText = cleanedText.replace(/```[\s\S]*?```/g, '');
    cleanedText = cleanedText.replace(/^>\s*/gm, '');
    cleanedText = cleanedText.replace(/\n\s*\n/g, '\n\n');
    cleanedText = cleanedText.split('\n').map(line => line.trim()).join('\n');
    return cleanedText.trim();
}

function updateUIForPlan() {
    const plan = currentUser.plano;
    const isPremium = plan === 'premium';

    document.querySelectorAll('.premium-feature').forEach(el => {
        el.classList.toggle('hidden', !isPremium);
    });

    document.getElementById('quizSetupFreemium').classList.toggle('hidden', isPremium);
    document.getElementById('quizSetupPremium').classList.toggle('hidden', !isPremium);

    document.getElementById('flashcardSetupFreemium').classList.toggle('hidden', isPremium);
    document.getElementById('flashcardSetupPremium').classList.toggle('hidden', !isPremium);

    updateAuthButton();
    updateProfileDisplay();
}

function updateAuthButton() {
    const isLoggedIn = !!currentUser.id;
    const btnEditarPerfil = document.getElementById('btnEditarPerfil');
    
    if (isLoggedIn) {
        authBtn.classList.remove('bg-purple-600', 'hover:bg-purple-700');
        authBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        authIcon.textContent = 'logout';
        authText.textContent = 'Sair';
        authBtn.onclick = handleLogout;
        if(btnEditarPerfil) btnEditarPerfil.classList.remove('hidden');
    } else {
        authBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        authBtn.classList.add('bg-purple-600', 'hover:bg-purple-700');
        authIcon.textContent = 'login';
        authText.textContent = 'Login';
        authBtn.onclick = abrirLogin;
        if(btnEditarPerfil) btnEditarPerfil.classList.add('hidden');
    }
}

window.handleLogout = function() {
    sessionStorage.removeItem('currentUser');
    currentUser = { id: null, nome: 'Visitante', email: 'Faça login para continuar', plano: 'freemium', fotoUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' };
    updateUIForPlan();
    showTela('inicio');
    console.log('Você foi desconectado!'); 
}

function loadUserFromSession() {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
        const userData = JSON.parse(storedUser);
        currentUser = {
            id: userData.id_aluno,
            nome: userData.nome,
            email: userData.email,
            plano: userData.plano,
            fotoUrl: userData.url_foto || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        };
    } else {
        currentUser = { id: null, nome: 'Visitante', email: 'Faça login para continuar', plano: 'freemium', fotoUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' };
    }
    updateUIForPlan();
}

window.abrirLogin = function () { document.getElementById('modalLogin').classList.remove('hidden'); }
window.fecharLogin = function () { document.getElementById('modalLogin').classList.add('hidden'); }
window.abrirCriarConta = function () { document.getElementById('modalCriarConta').classList.remove('hidden'); }
window.fecharCriarConta = function () { document.getElementById('modalCriarConta').classList.add('hidden'); }

window.abrirEditarPerfil = function () {
    document.getElementById('editFotoUrl').value = currentUser.fotoUrl || '';
    document.getElementById('editFotoPreview').src = currentUser.fotoUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    document.getElementById('editNome').value = currentUser.nome;
    document.getElementById('editEmail').value = currentUser.email;
    document.getElementById('editSenha').value = '';
    document.getElementById('modalEditarPerfil').classList.remove('hidden');
}
window.fecharEditarPerfil = function () { document.getElementById('modalEditarPerfil').classList.add('hidden'); }

function updateProfileDisplay() {
    if(document.getElementById('profileNome')) document.getElementById('profileNome').textContent = currentUser.nome || 'Seu Nome';
    if(document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = currentUser.email || 'seuemail@email.com';
    if(document.getElementById('profileFoto')) document.getElementById('profileFoto').src = currentUser.fotoUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
}

// --- Lógica do Chat ---

function convertMarkdownToHtml(markdownText) {
    if (!markdownText) return '';
    let htmlText = markdownText;
    htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    htmlText = htmlText.replace(/\n/g, '<br>');
    return htmlText;
}

function addMessage(sender, text) {
    const messageContainer = document.createElement('div');
    const messageBubble = document.createElement('div');

    if (sender === 'user') {
        messageContainer.className = 'flex justify-end mb-4';
        messageBubble.className = 'chat-bubble chat-bubble-user';
    } else {
        messageContainer.className = 'flex justify-start mb-4';
        messageBubble.className = 'chat-bubble chat-bubble-bot';
    }

    messageBubble.innerHTML = convertMarkdownToHtml(text);
    messageContainer.appendChild(messageBubble);
    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator(show) {
    // Usa as classes Tailwind hidden/flex para mostrar/esconder
    typingIndicator.classList.toggle('hidden', !show);
    typingIndicator.classList.toggle('flex', show);
    if (show) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function sendMessage() {
    const messageText = chatInput.value.trim();
    if (messageText === '' || !socket || !socket.connected) {
        console.log('Não conectado ao chat ou mensagem vazia.');
        return;
    }

    addMessage('user', messageText);
    socket.emit('enviar_mensagem', { mensagem: messageText });
    
    chatInput.value = '';
    chatInput.style.height = '40px'; // Reseta altura após envio
    chatInput.focus();
    showTypingIndicator(true);
}

function connectToServer() {
    if (socket && socket.connected) { return; } 
    if (socket) { socket.disconnect(); }
    
    socket = io(SOCKET_URL);

    socket.on('connect', () => {
        console.log('Conectado ao servidor de chat!');
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.placeholder = "Digite sua mensagem...";
        
        // Mensagem de boas-vindas inicial se o chat estiver vazio
        if (chatMessages.children.length === 0) {
             addMessage('bot', 'Olá! Eu sou o assistente de estudos do RePensei. Em que posso te ajudar hoje sobre Filosofia e Sociologia?');
        }
    });

    socket.on('disconnect', () => {
        console.log('Desconectado do servidor.');
        chatInput.disabled = true;
        sendButton.disabled = true;
        chatInput.placeholder = "Desconectado. Recarregue a página.";
        showTypingIndicator(false);
    });

    socket.on('connect_error', (error) => {
        console.error('Erro de conexão:', error);
        showTypingIndicator(false);
        addMessage('bot', 'Erro ao conectar com o servidor. Verifique o backend.');
    });

    socket.on('nova_mensagem', (data) => {
        showTypingIndicator(false);
        if (data.texto) {
            addMessage('bot', data.texto);
        }
    });

    socket.on('erro', (data) => {
        console.error('Erro do servidor:', data);
        showTypingIndicator(false);
        addMessage('bot', 'Desculpe, ocorreu um erro. Tente novamente.');
    });
}

// --- Event Listeners e Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    handleInitialAndResize();
    loadUserFromSession();

    // Ativa o link inicial
    const initialLink = document.querySelector('#sidebar a[data-sidebar="inicio"]');
    if (initialLink) {
        activateSidebarLink(initialLink);
        showTela('inicio');
    }

    // Navegação por Menu Superior
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            activateMenuLink(link);
            activateSidebarLink(document.querySelector(`#sidebar a[data-sidebar="${link.getAttribute('data-page')}"]`));
            showTela(link.getAttribute('data-page'));
        });
    });

    // Navegação por Sidebar
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            activateSidebarLink(this);
            activateMenuLink(document.querySelector(`#menuBar .menu-link[data-page="${this.getAttribute('data-sidebar')}"]`));
            showTela(this.getAttribute('data-sidebar'));
        });
    });

    window.addEventListener('resize', () => {
        handleInitialAndResize();
        const active = document.querySelector('#menuBar .menu-link.active');
        if (active) updateMenuUnderline(active);
    });
    
    // Simula auto-expansão da textarea do chat
    chatInput.addEventListener('input', () => {
        chatInput.style.height = '40px'; // Altura mínima
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    });
    
    // Conecta ao chat ao clicar no link
    document.querySelector('[data-page="chat"]').addEventListener('click', () => {
         setTimeout(connectToServer, 100); 
    });
    
    sendButton.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // ----------------------------------------------------
    // Blocos de lógica para interações com API
    // ----------------------------------------------------
    
    document.getElementById('entrarBtn').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const senha = document.getElementById('loginSenha').value;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
            });
            const data = await response.json();
            if (response.ok) {
                console.log(data.message);
                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                loadUserFromSession(); 
                fecharLogin();
                showTela('inicio');
            } else {
                console.error(data.error || 'Erro ao fazer login. Verifique suas credenciais.');
            }
        } catch (error) {
            console.error('Erro ao conectar com a API de login:', error);
        }
    });

    document.getElementById('criarContaBtn').addEventListener('click', async () => {
        const nome = document.getElementById('cadastroNome').value;
        const email = document.getElementById('cadastroEmail').value;
        const senha = document.getElementById('cadastroSenha').value;
        const confirmarSenha = document.getElementById('cadastroConfirmarSenha').value;

        if (senha !== confirmarSenha) {
            console.error('As senhas não coincidem!');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/cadastrar_usuario`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha }),
            });
            const data = await response.json();
            if (response.ok) {
                console.log(data.message);
                fecharCriarConta();
                abrirLogin();
            } else {
                console.error(data.error || 'Erro ao criar conta.');
            }
        } catch (error) {
            console.error('Erro ao conectar com a API de cadastro:', error);
        }
    });
    
    document.getElementById('salvarEdicaoBtn').addEventListener('click', async () => {
        const novoNome = document.getElementById('editNome').value;
        const novoEmail = document.getElementById('editEmail').value;
        const novaSenha = document.getElementById('editSenha').value;
        const novaFotoUrl = document.getElementById('editFotoUrl').value;

        if (!novoNome || !novoEmail) {
            console.error('Nome e E-mail não podem ser vazios.');
            return;
        }

        const updateData = {
            nome: novoNome,
            email: novoEmail,
            url_foto: novaFotoUrl 
        };
        if (novaSenha) {
            updateData.senha = novaSenha;
        }

        try {
            if (!currentUser.id) {
                console.error('Nenhum usuário logado para editar.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/editar_usuario/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            const data = await response.json();
            if (response.ok) {
                console.log(data.message);
                currentUser.nome = novoNome;
                currentUser.email = novoEmail;
                currentUser.fotoUrl = novaFotoUrl;
                const sessionUser = JSON.parse(sessionStorage.getItem('currentUser'));
                sessionUser.nome = novoNome;
                sessionUser.email = novoEmail;
                sessionUser.url_foto = novaFotoUrl;
                sessionStorage.setItem('currentUser', JSON.stringify(sessionUser));
                
                updateProfileDisplay();
                fecharEditarPerfil();
            } else {
                console.error(data.error || 'Erro ao salvar alterações.');
            }
        } catch (error) {
            console.error('Erro ao conectar com a API de edição:', error);
        }
    });

    document.getElementById('editFotoUrl').addEventListener('input', (e) => {
        const imgPreview = document.getElementById('editFotoPreview');
        const url = e.target.value;
        if (url) {
            imgPreview.src = url;
        } else {
            imgPreview.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        }
    });

    // Gerar Resumo
    document.getElementById('gerarResumoBtn').addEventListener('click', async () => {
        if (!currentUser.id) return console.error("Você precisa estar logado.");
        const tema = document.getElementById('resumoInput').value;
        if (!tema) return console.error('Por favor, digite um tema.');
        
        const btn = document.getElementById('gerarResumoBtn');
        btn.disabled = true; btn.textContent = "Gerando...";

        try {
            const response = await fetch(`${API_BASE_URL}/resumo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tema, id_aluno: currentUser.id })
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('resumoTitulo').textContent = `Resumo sobre: ${stripMarkdown(data.assunto)}`;
                document.getElementById('resumoConteudo').innerHTML = stripMarkdown(data.conteudo).replace(/\n/g, '<br>');
                document.getElementById('resumoOutput').classList.remove('hidden');
            } else {
                console.error(data.error || 'Erro ao gerar resumo.');
            }
        } catch (error) {
            console.error('Erro API de resumo:', error);
        } finally {
            btn.disabled = false; btn.textContent = "Gerar Resumo";
        }
    });

    // Corrigir Texto
    document.getElementById('corrigirTextoBtn').addEventListener('click', async () => {
        if (!currentUser.id) return console.error("Você precisa estar logado.");
        const tema = document.getElementById('correcaoTemaInput').value;
        const texto = document.getElementById('correcaoTextoInput').value;
        if (!tema || !texto) return console.error('Preencha o tema e o texto.');
        
        const btn = document.getElementById('corrigirTextoBtn');
        btn.disabled = true; btn.textContent = "Corrigindo...";
        try {
            const response = await fetch(`${API_BASE_URL}/correcao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tema, texto, id_aluno: currentUser.id })
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('correcaoConteudo').innerHTML = stripMarkdown(data.correcao).replace(/\n/g, '<br>');
                document.getElementById('correcaoOutput').classList.remove('hidden');
            } else {
                console.error(data.error || 'Erro ao corrigir texto.');
            }
        } catch (error) {
            console.error('Erro API de correção:', error);
        } finally {
            btn.disabled = false; btn.textContent = "Corrigir Texto";
        }
    });

    // Gerar Flashcards
    document.getElementById('gerarFlashcardsBtn').addEventListener('click', async () => {
        if (!currentUser.id) return console.error("Você precisa estar logado.");
        
        let payload = { id_aluno: currentUser.id };
        if (currentUser.plano === 'premium') {
            const tema = document.getElementById('flashcardInput').value;
            if (!tema) return console.error("Digite um tema para os flashcards.");
            payload.tema = tema;
        } else {
            payload.category = document.getElementById('flashcardCategory').value;
        }

        const btn = document.getElementById('gerarFlashcardsBtn');
        btn.disabled = true; btn.textContent = "Gerando...";
        try {
            const response = await fetch(`${API_BASE_URL}/flashcard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            const container = document.getElementById('flashcardsContainer');
            container.innerHTML = '';

            if (response.ok) {
                data.forEach(fc => {
                    const div = document.createElement('div');
                    div.className = 'flashcard';
                    div.onclick = () => div.classList.toggle('flipped');
                    div.innerHTML = `
                        <div class="flashcard-front"><span class="font-semibold text-gray-800">${fc.pergunta}</span></div>
                        <div class="flashcard-back">
                            <div class="flex flex-col items-center text-center p-2 text-gray-700">
                                <span class="font-bold text-pink-600">${fc.resposta}</span>
                                <span class="text-xs mt-2 text-gray-500">${fc.explicacao || ''}</span>
                            </div>
                        </div>`;
                    container.appendChild(div);
                });
            } else {
                console.error(data.error || 'Erro ao gerar flashcards.');
            }
        } catch (error) {
            console.error('Erro API de flashcards:', error);
        } finally {
            btn.disabled = false; btn.textContent = "Gerar Flashcards";
        }
    });
    
    // Gerar Quiz
    document.getElementById("gerarQuizBtn").addEventListener("click", async () => {
        if (!currentUser.id) return console.error("Você precisa estar logado.");

        let payload = { id_aluno: currentUser.id };
        if (currentUser.plano === 'premium') {
            const tema = document.getElementById('quizInput').value;
            if (!tema) return console.error("Digite um tema para o quiz.");
            payload.tema = tema;
        } else {
            payload.category = document.getElementById('quizCategory').value;
        }

        const btn = document.getElementById("gerarQuizBtn");
        btn.disabled = true; btn.textContent = "Gerando...";

        const output = document.getElementById("quizOutput");
        const popup = document.getElementById("quizPopup");
        output.innerHTML = "";
        output.classList.add("hidden");
        popup.classList.remove("show");

        try {
            const response = await fetch(`${API_BASE_URL}/quiz`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Ocorreu um erro no servidor");
            }

            const quizJson = await response.json();
            
            let totalQuestoes = quizJson.length;
            let respostasCorretas = 0;
            let respondidas = 0;
            const scoreDisplay = document.getElementById("quizScore");
            
            quizJson.forEach((questao, index) => {
                const card = document.createElement("div");
                card.className = "mb-6 p-4 bg-white rounded-lg shadow w-full";
                card.innerHTML = `<p class="quiz-question-number">Pergunta ${index + 1}</p><p class="font-semibold text-lg mb-3">${questao.question || questao.pergunta}</p>`;

                const opcoesContainer = document.createElement("div");
                opcoesContainer.className = "space-y-2";
                
                const opcoes = questao.options || questao.opcoes;
                const respostaCorreta = questao.correctAnswer || questao.resposta_correta;

                opcoes.forEach((opcaoTexto) => {
                    const opcaoBtn = document.createElement("button");
                    opcaoBtn.className = "quiz-option w-full text-left p-3 border rounded-lg hover:bg-gray-100 transition text-gray-700";
                    opcaoBtn.textContent = opcaoTexto;
                    
                    opcaoBtn.addEventListener("click", () => {
                        if (card.classList.contains("card-respondida")) return;
                        card.classList.add("card-respondida");
                        respondidas++;

                        if (opcaoBtn.textContent === respostaCorreta) {
                            respostasCorretas++;
                            opcaoBtn.classList.add("correct-answer");
                        } else {
                            opcaoBtn.classList.add("wrong-answer");
                            const corretaBtn = Array.from(opcoesContainer.children).find(btn => btn.textContent === respostaCorreta);
                            if(corretaBtn) corretaBtn.classList.add("correct-answer");
                        }
                        
                        opcoesContainer.querySelectorAll("button").forEach(b => b.disabled = true);
                        
                        const explanationDiv = card.querySelector('.quiz-explanation');
                        if (explanationDiv) explanationDiv.classList.remove('hidden');
                        
                        if (respondidas === totalQuestoes) {
                            scoreDisplay.textContent = `Você acertou ${respostasCorretas} de ${totalQuestoes} perguntas!`;
                            popup.classList.add("show");
                        }
                    });
                    opcoesContainer.appendChild(opcaoBtn);
                });

                card.appendChild(opcoesContainer);

                if(questao.explicacao){
                    const explanationDiv = document.createElement('div');
                    explanationDiv.className = 'quiz-explanation hidden';
                    explanationDiv.innerHTML = `<strong>Explicação:</strong> ${questao.explicacao}`;
                    card.appendChild(explanationDiv);
                }

                output.appendChild(card);
            });

            output.classList.remove("hidden");
            
        } catch (error) {
            console.error("Erro ao gerar quiz: " + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Gerar Quiz";
        }
    });
    
    document.getElementById("restartQuizBtn").addEventListener("click", () => {
        document.getElementById("quizOutput").innerHTML = "";
        document.getElementById("quizOutput").classList.add("hidden");
        document.getElementById("quizPopup").classList.remove("show");
    });
});
