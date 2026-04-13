const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('destrancar')
        .setDescription('Destranca o canal atual (permite @everyone enviar mensagens)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = interaction.channel;
            const everyoneRole = interaction.guild.roles.everyone;

            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null, // Remove a override, voltando ao padrão
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🔓 Canal Destrancado')
                .setDescription(
                    `Este canal foi destrancado por ${interaction.user}.\n\n` +
                    `Os membros podem enviar mensagens normalmente.`
                )
                .setFooter({ text: 'Detroit Roleplay • Moderação' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            await interaction.editReply('✅ Canal destrancado com sucesso!');
        } catch (error) {
            console.error('Erro ao destrancar canal:', error);
            await interaction.editReply('❌ Ocorreu um erro ao destrancar o canal.');
        }
    },
};
