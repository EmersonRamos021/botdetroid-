const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { performFullBackup } = require('../utils/backup');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Força a criação de um backup completo do BD e Discord imediatamente.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const success = await performFullBackup(interaction.client);

        if (success) {
            await interaction.editReply({
                content: '✅ Backup gerado com sucesso! Verifique o canal de logs da Staff para baixar os arquivos.'
            });
        } else {
            await interaction.editReply({
                content: '❌ Ocorreu um erro ao gerar o backup. Verifique o console.'
            });
        }
    }
};
