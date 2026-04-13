const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const { createTicketChannel } = require('./ticket');
const { buildAtendimentoSelectMenu } = require('../utils/embeds');

/**
 * Handler do Select Menu de Atendimento
 * Quando o usuário seleciona uma categoria, abre um modal para descrever o assunto
 */
async function handleAtendimentoSelect(interaction) {
    const selectedValue = interaction.values[0];

    // Verificar se o usuário já tem um ticket aberto
    const existingTicket = interaction.guild.channels.cache.find(
        (ch) => ch.topic && ch.topic.includes(`owner:${interaction.user.id}`) && ch.topic.includes('status:open')
    );

    if (existingTicket) {
        return interaction.reply({
            content: `❌ Você já possui um ticket aberto! Acesse: ${existingTicket}\n\nFeche o ticket atual antes de abrir um novo.`,
            ephemeral: true,
        });
    }

    // Labels para o título do modal
    const titleLabels = {
        'ticket_compras': 'Compras/Lojas',
        'ticket_suporte': 'Suporte Geral/Bugs',
    };

    // Abrir modal pedindo descrição do assunto
    const modal = new ModalBuilder()
        .setCustomId(`modal_atendimento_${selectedValue}`)
        .setTitle(titleLabels[selectedValue] || 'Abrir Ticket');

    const descricao = new TextInputBuilder()
        .setCustomId('descricao_ticket')
        .setLabel('Descreva um assunto para abertura do ticket:')
        .setPlaceholder('Escreva aqui detalhes do seu problema ou solicitação...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1024);

    modal.addComponents(
        new ActionRowBuilder().addComponents(descricao),
    );

    await interaction.showModal(modal);

    // Limpa a seleção visual aguardando um curto tempo após o modal abrir
    setTimeout(async () => {
        try {
            await interaction.message.edit({ components: [buildAtendimentoSelectMenu()] });
        } catch (e) {}
    }, 1000);
}

/**
 * Handler do Modal de Atendimento
 * Após o usuário descrever o assunto, cria o ticket
 */
async function handleAtendimentoModal(interaction) {
    // Extrair o tipo do customId: modal_atendimento_ticket_compras
    const type = interaction.customId.replace('modal_atendimento_', '');
    const descricao = interaction.fields.getTextInputValue('descricao_ticket');

    // Verificar duplicata novamente (pode ter aberto entre o modal e o submit)
    const existingTicket = interaction.guild.channels.cache.find(
        (ch) => ch.topic && ch.topic.includes(`owner:${interaction.user.id}`) && ch.topic.includes('status:open')
    );

    if (existingTicket) {
        return interaction.reply({
            content: `❌ Você já possui um ticket aberto! Acesse: ${existingTicket}\n\nFeche o ticket atual antes de abrir um novo.`,
            ephemeral: true,
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const channel = await createTicketChannel(interaction, type, {
            descricao,
        });

        await interaction.editReply({
            content: `✅ Seu ticket foi aberto com sucesso! Acesse: ${channel}\n\nAguarde um membro da equipe atendê-lo.`,
        });
    } catch (error) {
        console.error('Erro ao criar ticket de atendimento:', error);
        await interaction.editReply({
            content: '❌ Ocorreu um erro ao criar seu ticket. Tente novamente mais tarde.',
        });
    }
}

module.exports = { handleAtendimentoSelect, handleAtendimentoModal };
