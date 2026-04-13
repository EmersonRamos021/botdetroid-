const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { buildDenunciasEmbed, buildDenunciasButtons } = require('../utils/embeds');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-denuncias')
        .setDescription('Configura o painel de denúncias e revisões no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Logo como attachment
            const logoPath = path.join(process.cwd(), 'image.png');
            const logo = new AttachmentBuilder(logoPath, { name: 'logo.png' });

            const embed = buildDenunciasEmbed();
            const buttons = buildDenunciasButtons();

            await interaction.channel.send({
                embeds: [embed],
                components: [buttons],
                files: [logo],
            });

            await interaction.editReply({
                content: '✅ Painel de **Denúncias e Revisões** configurado com sucesso neste canal!',
            });

        } catch (error) {
            console.error('Erro ao configurar denúncias:', error);
            await interaction.editReply({
                content: '❌ Erro ao configurar o painel de denúncias. Verifique as permissões do bot.',
            });
        }
    },
};
