/**
 * Gerador de Transcrição HTML para Tickets
 * Tema dark inspirado no Discord com identidade visual Detroit Roleplay
 */

async function generateTranscript(channel, ticketOwner, ticketType) {
    // Buscar todas as mensagens do canal
    const messages = [];
    let lastId = null;

    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) break;

        messages.push(...fetched.values());
        lastId = fetched.last().id;

        if (fetched.size < 100) break;
    }

    // Ordenar do mais antigo para o mais recente
    messages.reverse();

    const typeLabels = {
        'ticket_compras': 'Compras/Lojas',
        'ticket_suporte': 'Suporte Geral/Bugs',
        'denuncia': 'Denúncia',
        'revisao': 'Revisão de Punição',
        'consulta': 'Consulta de Código',
    };

    const categoryLabel = typeLabels[ticketType] || 'Ticket';
    const createdAt = channel.createdAt ? formatDate(channel.createdAt) : 'Desconhecido';
    const closedAt = formatDate(new Date());

    // Gerar mensagens HTML
    let messagesHtml = '';
    let lastAuthorId = null;

    for (const msg of messages) {
        const isNewGroup = msg.author.id !== lastAuthorId;
        lastAuthorId = msg.author.id;

        const avatarUrl = msg.author.displayAvatarURL({ extension: 'png', size: 64 });
        const username = msg.author.globalName || msg.author.username;
        const isBot = msg.author.bot;
        const timestamp = formatDate(msg.createdAt);
        const roleColor = isBot ? '#e80000' : '#ffffff';

        // Processar conteúdo
        let content = escapeHtml(msg.content || '');
        // Converter menções básicas
        content = content.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@Usuário</span>');
        content = content.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#canal</span>');
        content = content.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention">@cargo</span>');
        // Converter bold e italic
        content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Converter quebras de linha
        content = content.replace(/\n/g, '<br>');

        // Embeds
        let embedsHtml = '';
        if (msg.embeds.length > 0) {
            for (const embed of msg.embeds) {
                embedsHtml += `<div class="embed" style="border-left-color: ${embed.hexColor || '#e80000'}">`;
                if (embed.title) embedsHtml += `<div class="embed-title">${escapeHtml(embed.title)}</div>`;
                if (embed.description) embedsHtml += `<div class="embed-desc">${escapeHtml(embed.description)}</div>`;
                if (embed.fields && embed.fields.length > 0) {
                    embedsHtml += '<div class="embed-fields">';
                    for (const field of embed.fields) {
                        embedsHtml += `<div class="embed-field${field.inline ? ' inline' : ''}">`;
                        embedsHtml += `<div class="embed-field-name">${escapeHtml(field.name)}</div>`;
                        embedsHtml += `<div class="embed-field-value">${escapeHtml(field.value)}</div>`;
                        embedsHtml += '</div>';
                    }
                    embedsHtml += '</div>';
                }
                embedsHtml += '</div>';
            }
        }

        // Attachments
        let attachmentsHtml = '';
        if (msg.attachments.size > 0) {
            for (const [, attachment] of msg.attachments) {
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    attachmentsHtml += `<div class="attachment"><img src="${attachment.url}" alt="Imagem anexada"></div>`;
                } else {
                    attachmentsHtml += `<div class="attachment"><a href="${attachment.url}" target="_blank">📎 ${escapeHtml(attachment.name)}</a></div>`;
                }
            }
        }

        if (isNewGroup) {
            messagesHtml += `
                <div class="message-group">
                    <div class="msg-avatar">
                        <img src="${avatarUrl}" alt="Avatar" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%235865F2%22 width=%2240%22 height=%2240%22/><text x=%2220%22 y=%2226%22 fill=%22white%22 text-anchor=%22middle%22 font-size=%2218%22>${username.charAt(0).toUpperCase()}</text></svg>'">
                    </div>
                    <div class="msg-content">
                        <div class="msg-header">
                            <span class="msg-author" style="color: ${roleColor}">${escapeHtml(username)}</span>
                            ${isBot ? '<span class="bot-badge">BOT</span>' : ''}
                            <span class="msg-time">${timestamp}</span>
                        </div>
                        <div class="msg-text">${content}</div>
                        ${embedsHtml}
                        ${attachmentsHtml}
                    </div>
                </div>`;
        } else {
            messagesHtml += `
                <div class="message-continuation">
                    <span class="msg-time-hover">${formatTime(msg.createdAt)}</span>
                    <div class="msg-text">${content}</div>
                    ${embedsHtml}
                    ${attachmentsHtml}
                </div>`;
        }
    }

    // Gerar HTML completo
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcrição - ${escapeHtml(channel.name)} | Detroit Roleplay</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #1a1a1d;
            color: #dcddde;
            font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif;
            font-size: 15px;
            line-height: 1.5;
        }

        /* ═══ HEADER ═══ */
        .header {
            background: linear-gradient(135deg, #0d0d0d 0%, #1a0000 50%, #2d0000 100%);
            border-bottom: 3px solid #e80000;
            padding: 30px 40px;
            display: flex;
            align-items: center;
            gap: 24px;
        }

        .header-logo {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            border: 3px solid #e80000;
            object-fit: cover;
            box-shadow: 0 0 20px rgba(232, 0, 0, 0.3);
        }

        .header-info h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .header-info h1 span {
            color: #e80000;
        }

        .header-info p {
            color: #8a8a8e;
            font-size: 14px;
        }

        /* ═══ TICKET INFO ═══ */
        .ticket-info {
            background: #111114;
            border-bottom: 1px solid #2a2a2e;
            padding: 20px 40px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .info-label {
            color: #72767d;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
        }

        .info-value.highlight {
            color: #e80000;
        }

        /* ═══ MESSAGES ═══ */
        .messages {
            padding: 16px 0;
            max-width: 100%;
        }

        .message-group {
            display: flex;
            padding: 8px 40px;
            margin-top: 12px;
        }

        .message-group:hover {
            background: #1e1e22;
        }

        .message-continuation {
            padding: 2px 40px 2px 96px;
            position: relative;
        }

        .message-continuation:hover {
            background: #1e1e22;
        }

        .msg-avatar {
            flex-shrink: 0;
            margin-right: 16px;
        }

        .msg-avatar img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
        }

        .msg-content {
            flex: 1;
            min-width: 0;
        }

        .msg-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 2px;
        }

        .msg-author {
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
        }

        .msg-author:hover {
            text-decoration: underline;
        }

        .bot-badge {
            background: #5865F2;
            color: white;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 5px;
            border-radius: 3px;
            text-transform: uppercase;
        }

        .msg-time {
            color: #72767d;
            font-size: 12px;
            font-weight: 400;
        }

        .msg-time-hover {
            position: absolute;
            left: 40px;
            color: #72767d;
            font-size: 11px;
            opacity: 0;
            width: 40px;
            text-align: right;
        }

        .message-continuation:hover .msg-time-hover {
            opacity: 1;
        }

        .msg-text {
            color: #dcddde;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .mention {
            background: rgba(88, 101, 242, 0.15);
            color: #dee0fc;
            padding: 0 2px;
            border-radius: 3px;
            font-weight: 500;
        }

        /* ═══ EMBEDS ═══ */
        .embed {
            background: #111114;
            border-left: 4px solid #e80000;
            border-radius: 4px;
            padding: 12px 16px;
            margin-top: 8px;
            max-width: 520px;
        }

        .embed-title {
            color: #ffffff;
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 6px;
        }

        .embed-desc {
            color: #b9bbbe;
            font-size: 14px;
            white-space: pre-wrap;
        }

        .embed-fields {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }

        .embed-field {
            flex: 0 0 100%;
        }

        .embed-field.inline {
            flex: 0 0 calc(33.33% - 8px);
        }

        .embed-field-name {
            color: #ffffff;
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 2px;
        }

        .embed-field-value {
            color: #b9bbbe;
            font-size: 14px;
        }

        /* ═══ ATTACHMENTS ═══ */
        .attachment {
            margin-top: 8px;
        }

        .attachment img {
            max-width: 400px;
            max-height: 300px;
            border-radius: 8px;
        }

        .attachment a {
            color: #00aff4;
            text-decoration: none;
        }

        .attachment a:hover {
            text-decoration: underline;
        }

        /* ═══ FOOTER ═══ */
        .footer {
            background: #111114;
            border-top: 1px solid #2a2a2e;
            padding: 20px 40px;
            text-align: center;
            color: #72767d;
            font-size: 13px;
        }

        .footer strong {
            color: #e80000;
        }

        /* ═══ DIVIDER ═══ */
        .divider {
            display: flex;
            align-items: center;
            padding: 16px 40px;
            gap: 8px;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #2a2a2e;
        }

        .divider span {
            color: #72767d;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
        }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 768px) {
            .header {
                padding: 20px;
            }
            .ticket-info {
                padding: 16px 20px;
                grid-template-columns: 1fr 1fr;
            }
            .message-group {
                padding: 8px 16px;
            }
            .message-continuation {
                padding-left: 72px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-info">
            <h1>Detroit <span>Roleplay</span></h1>
            <p>Transcrição de Ticket • #${escapeHtml(channel.name)}</p>
        </div>
    </div>

    <div class="ticket-info">
        <div class="info-item">
            <span class="info-label">Canal</span>
            <span class="info-value">#${escapeHtml(channel.name)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Categoria</span>
            <span class="info-value highlight">${categoryLabel}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Aberto por</span>
            <span class="info-value">${escapeHtml(ticketOwner.globalName || ticketOwner.username)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Criado em</span>
            <span class="info-value">${createdAt}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Fechado em</span>
            <span class="info-value">${closedAt}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Total de Mensagens</span>
            <span class="info-value">${messages.length}</span>
        </div>
    </div>

    <div class="divider">
        <span>Início da Transcrição</span>
    </div>

    <div class="messages">
        ${messagesHtml}
    </div>

    <div class="divider">
        <span>Fim da Transcrição</span>
    </div>

    <div class="footer">
        <p>Gerado automaticamente por <strong>Detroit Roleplay</strong> em ${closedAt}</p>
        <p>Total de ${messages.length} mensagens registradas.</p>
    </div>
</body>
</html>`;

    return Buffer.from(html, 'utf-8');
}

function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Sao_Paulo',
    }).format(date);
}

function formatTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    }).format(date);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = { generateTranscript };
