const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildConfigPanel } = require('../handlers/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Painel de configuração do bot Detroit Roleplay')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { embed, components } = buildConfigPanel(interaction.guild);

        await interaction.reply({
            embeds: [embed],
            components,
            ephemeral: true,
        });
    },
};
