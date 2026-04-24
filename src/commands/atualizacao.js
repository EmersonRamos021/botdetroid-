const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('atualizacao')
        .setDescription('Envia um Changelog/Atualização detalhado com visual oficial da Staff.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option => 
            option.setName('canal')
                .setDescription('O canal onde a atualização será enviada')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
        ),

    async execute(interaction) {
        // Obter o canal escolhido cacheando temporariamente para usar no Modal
        const canal = interaction.options.getChannel('canal');

        // Cria o Modal
        const modal = new ModalBuilder()
            .setCustomId(`modal_atualizacao_${canal.id}`) // Gambiarra segura para passar o ID do canal para o Modal
            .setTitle('Formulário de Atualização');

        // Input 1: Título/Versão
        const tituloInput = new TextInputBuilder()
            .setCustomId('input_titulo')
            .setLabel('Título da Atualização')
            .setPlaceholder('Ex: Changelog ou v2.5.0')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Input 2: Adições/Alterações
        const adicoesInput = new TextInputBuilder()
            .setCustomId('input_adicoes')
            .setLabel('O que foi adicionado/alterado?')
            .setPlaceholder('Escreva os itens com ícones ou hífens (-)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // Input 3: Regras Alteradas (Opcional)
        const regrasInput = new TextInputBuilder()
            .setCustomId('input_regras')
            .setLabel('Novas Regras (Opcional)')
            .setPlaceholder('A regra 6.1.1. de Assaltos foi alterada...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        // Input 4: Links (Opcional)
        const linksInput = new TextInputBuilder()
            .setCustomId('input_links')
            .setLabel('Link p/ Redirecionamento (Opcional)')
            .setPlaceholder('[Documento de Regras - Clique Aqui](URL)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // O Modal exige ActionRows separadas para cada Input
        modal.addComponents(
            new ActionRowBuilder().addComponents(tituloInput),
            new ActionRowBuilder().addComponents(adicoesInput),
            new ActionRowBuilder().addComponents(regrasInput),
            new ActionRowBuilder().addComponents(linksInput)
        );

        // Abre o Modal na tela
        await interaction.showModal(modal);
    },
};
