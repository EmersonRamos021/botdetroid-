const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildAtendimentoEmbed, buildAtendimentoSelectMenu } = require('../utils/embeds');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-atendimento')
        .setDescription('Configura o painel de atendimento no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Logo como attachment
            const logoPath = path.join(process.cwd(), 'image.png');
            const logo = new AttachmentBuilder(logoPath, { name: 'logo.png' });

            const embed = buildAtendimentoEmbed();
            const selectMenu = buildAtendimentoSelectMenu();

            await interaction.channel.send({
                embeds: [embed],
                components: [selectMenu],
                files: [logo],
            });

            await interaction.editReply({
                content: '✅ Painel de **Atendimento** configurado com sucesso neste canal!',
            });

        } catch (error) {
            console.error('Erro ao configurar atendimento:', error);
            await interaction.editReply({
                content: '❌ Erro ao configurar o painel de atendimento. Verifique as permissões do bot.',
            });
        }
    },
};
