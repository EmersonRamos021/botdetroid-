const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trancar')
        .setDescription('Tranca o canal atual (impede @everyone de enviar mensagens)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = interaction.channel;
            const everyoneRole = interaction.guild.roles.everyone;

            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('🔒 Canal Trancado')
                .setDescription(
                    `Este canal foi trancado por ${interaction.user}.\n\n` +
                    `Nenhum membro pode enviar mensagens até que o canal seja destrancado.`
                )
                .setFooter({ text: 'Detroit Roleplay • Moderação' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            await interaction.editReply('✅ Canal trancado com sucesso!');
        } catch (error) {
            console.error('Erro ao trancar canal:', error);
            await interaction.editReply('❌ Ocorreu um erro ao trancar o canal.');
        }
    },
};
