const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config');

// ═══════════════════════════════════════════════════════════════
// EMBED DE ATENDIMENTO
// ═══════════════════════════════════════════════════════════════
function buildAtendimentoEmbed() {
    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Suporte | Detroit Roleplay')
        .setDescription(
            `📢 Obrigado por entrar em contato conosco! Clique no menu abaixo para abrir seu ticket. Descreva corretamente seu assunto para que possamos lhe ajudar com mais eficiência.\n\n` +
            `**Horário de Atendimento:**\n\n` +
            `• **Segunda** – **Sexta** das **12:00h** - **23:00h**\n` +
            `• **Sábado**, **Domingo** e **Feriados** das **12:00h** - **18:00h**\n\n` +
            `Após a abertura do ticket, aguarde para ser atendido.`
        )
        .setThumbnail('attachment://logo.png')
        .setFooter({ text: 'Atendimento • Detroit Roleplay', iconURL: 'attachment://logo.png' })
        .setTimestamp();
}

function buildAtendimentoSelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('atendimento_select')
        .setPlaceholder('❓ Selecione um assunto.')
        .addOptions([
            {
                label: 'Compras/Lojas',
                description: 'Solicitações e dúvidas sobre compras.',
                value: 'ticket_compras',
                emoji: '💰',
            },
            {
                label: 'Suporte Geral/Bugs',
                description: 'Solicite suporte e obtenha ajuda.',
                value: 'ticket_suporte',
                emoji: '🔧',
            },
        ]);

    return new ActionRowBuilder().addComponents(selectMenu);
}

// ═══════════════════════════════════════════════════════════════
// EMBED DE DENÚNCIAS E REVISÕES
// ═══════════════════════════════════════════════════════════════
function buildDenunciasEmbed() {
    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Detroit Roleplay')
        .setDescription(
            `📢 Para que sua denúncia de possíveis infrações cometidas por outro usuário seja atendida corretamente, é necessário que leia atentamente os requisitos para procedimentos de Denúncias/Revisões. Solicitações fora dos padrões ou que não cumpram os requisitos corretamente serão negadas.\n\n` +
            `🎯 Utilize os botões abaixo para abrir seu formulário de denúncia, realizar uma revisão ou consultar uma punição (neste caso é necessário informar o código de acompanhamento ou o código da punição para visualizar mais detalhes). Descreva corretamente todas as informações solicitadas para que possamos lhe ajudar com mais eficiência.`
        )
        .setThumbnail('attachment://logo.png')
        .setFooter({ text: 'Detroit Roleplay', iconURL: 'attachment://logo.png' })
        .setTimestamp();
}

function buildDenunciasButtons() {
    const btnDenuncia = new ButtonBuilder()
        .setCustomId('btn_denuncia')
        .setLabel('Realizar Denúncia')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📢');

    const btnRevisao = new ButtonBuilder()
        .setCustomId('btn_revisao')
        .setLabel('Revisar Punição')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚠️');

    const btnConsultar = new ButtonBuilder()
        .setCustomId('btn_consultar')
        .setLabel('Consultar Código')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔍');

    return new ActionRowBuilder().addComponents(btnDenuncia, btnRevisao, btnConsultar);
}

// ═══════════════════════════════════════════════════════════════
// EMBED DO TICKET ABERTO
// ═══════════════════════════════════════════════════════════════
function buildTicketEmbed(user, type, data = {}) {
    const typeLabels = {
        'ticket_compras': '💰 Compras/Lojas',
        'ticket_suporte': '🔧 Suporte Geral/Bugs',
    };

    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${config.emojis.ticket} Ticket Aberto`)
        .setDescription(`Bem-vindo ao seu ticket! Um membro da equipe irá atendê-lo em breve.`)
        .addFields(
            { name: '👤 Usuário', value: `${user} (${user.tag})`, inline: true },
            { name: '📋 Categoria', value: typeLabels[type] || type, inline: true },
            { name: '📅 Aberto em', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Detroit Roleplay • Sistema de Tickets' })
        .setTimestamp();

    // Descrição do assunto (preenchido no modal de atendimento)
    if (data.descricao) {
        embed.addFields({ name: '📝 Descrição do Assunto', value: data.descricao, inline: false });
    }

    return embed;
}

function buildTicketButtons() {
    const btnFechar = new ButtonBuilder()
        .setCustomId('btn_fechar_ticket')
        .setLabel('Fechar Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

    const btnGerenciar = new ButtonBuilder()
        .setCustomId('btn_gerenciar_ticket')
        .setLabel('Gerenciar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚙️');

    const btnAssumir = new ButtonBuilder()
        .setCustomId('btn_assumir_ticket')
        .setLabel('Assumir Ticket')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✋');

    return new ActionRowBuilder().addComponents(btnAssumir, btnFechar, btnGerenciar);
}

function buildTicketManageEmbed() {
    return new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('⚙️ Gerenciamento do Ticket')
        .setDescription('Selecione uma ação de gerenciamento abaixo:');
}

function buildTicketManageComponents() {
    const btnCall = new ButtonBuilder()
        .setCustomId('btn_ticket_call')
        .setLabel('Criar Call')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📞');

    const btnAddId = new ButtonBuilder()
        .setCustomId('btn_ticket_add_id')
        .setLabel('Add ID')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➕');

    const btnRemId = new ButtonBuilder()
        .setCustomId('btn_ticket_rem_id')
        .setLabel('Remover ID')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('➖');

    const btnPermanent = new ButtonBuilder()
        .setCustomId('btn_ticket_permanent')
        .setLabel('Permanente')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📌');

    const btnInatividade = new ButtonBuilder()
        .setCustomId('btn_notificar_inatividade')
        .setLabel('Notificar Inatividade')
        .setStyle(ButtonStyle.Warning)
        .setEmoji('🔔');

    return [
        new ActionRowBuilder().addComponents(btnCall, btnAddId, btnRemId, btnPermanent),
        new ActionRowBuilder().addComponents(btnInatividade)
    ];
}

function buildConfirmCloseEmbed() {
    return new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⚠️ Confirmar Fechamento')
        .setDescription('Tem certeza que deseja fechar este ticket?\nUma transcrição será gerada e enviada automaticamente.');
}

function buildConfirmCloseButtons() {
    const btnConfirm = new ButtonBuilder()
        .setCustomId('btn_confirmar_fechar')
        .setLabel('Confirmar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('✅');

    const btnCancel = new ButtonBuilder()
        .setCustomId('btn_cancelar_fechar')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

    return new ActionRowBuilder().addComponents(btnConfirm, btnCancel);
}

function buildAddUserIdModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal_add_user_id')
        .setTitle('➕ Adicionar Membro por ID');

    const inputId = new TextInputBuilder()
        .setCustomId('input_user_id')
        .setLabel('ID do Usuário do Discord')
        .setPlaceholder('Ex: 123456789012345678')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(15)
        .setMaxLength(20);

    modal.addComponents(new ActionRowBuilder().addComponents(inputId));

    return modal;
}

function buildRemUserIdModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal_rem_user_id')
        .setTitle('➖ Remover Membro por ID');

    const inputId = new TextInputBuilder()
        .setCustomId('input_user_id')
        .setLabel('ID do Usuário do Discord')
        .setPlaceholder('Ex: 123456789012345678')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(15)
        .setMaxLength(20);

    modal.addComponents(new ActionRowBuilder().addComponents(inputId));

    return modal;
}

// ═══════════════════════════════════════════════════════════════
// EMBED DE LOG
// ═══════════════════════════════════════════════════════════════
function buildLogEmbed(ticketChannel, user, closedBy, type) {
    const typeLabels = {
        'ticket_compras': '💰 Compras/Lojas',
        'ticket_suporte': '🔧 Suporte Geral/Bugs',
        'denuncia': '📢 Denúncia',
        'revisao': '⚠️ Revisão de Punição',
        'consulta': '🔍 Consulta de Código',
    };

    return new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🔒 Ticket Fechado')
        .addFields(
            { name: '📋 Canal', value: ticketChannel, inline: true },
            { name: '📂 Categoria', value: typeLabels[type] || 'Desconhecido', inline: true },
            { name: '👤 Aberto por', value: `${user}`, inline: true },
            { name: '🔒 Fechado por', value: `${closedBy}`, inline: true },
            { name: '📅 Fechado em', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter({ text: 'Detroit Roleplay • Logs de Tickets' })
        .setTimestamp();
}

module.exports = {
    buildAtendimentoEmbed,
    buildAtendimentoSelectMenu,
    buildDenunciasEmbed,
    buildDenunciasButtons,
    buildTicketEmbed,
    buildTicketButtons,
    buildTicketManageEmbed,
    buildTicketManageComponents,
    buildAddUserIdModal,
    buildRemUserIdModal,
    buildConfirmCloseEmbed,
    buildConfirmCloseButtons,
    buildLogEmbed,
};
