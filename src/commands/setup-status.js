const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildStatusPayload } = require('../utils/statusPanel');
const { saveSetting } = require('../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-status')
        .setDescription('Envia o Painel Fixo de Status do Servidor MTA neste canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const payload = await buildStatusPayload(interaction.client);

            const sentMessage = await interaction.channel.send(payload);

            // Salvar no banco de dados para a rotina de atualização encontrar
            await saveSetting('statusPanelChannelId', interaction.channel.id);
            await saveSetting('statusPanelMessageId', sentMessage.id);

            await interaction.editReply({
                content: '✅ **Painel de Status** configurado com sucesso! Ele será atualizado automaticamente a cada 2 minutos.',
            });

        } catch (error) {
            console.error('Erro ao configurar status panel:', error);
            await interaction.editReply({
                content: '❌ Erro ao configurar o painel de status.',
            });
        }
    },
};
