const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('limpar')
        .setDescription('Limpa mensagens do canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('Quantidade de mensagens para apagar (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const quantidade = interaction.options.getInteger('quantidade');

        try {
            const deleted = await interaction.channel.bulkDelete(quantidade, true);

            await interaction.editReply(
                `🗑️ **${deleted.size}** mensagens foram apagadas com sucesso!` +
                (deleted.size < quantidade ? `\n> ⚠️ Mensagens com mais de 14 dias não podem ser apagadas em massa.` : '')
            );
        } catch (error) {
            console.error('Erro ao limpar mensagens:', error);
            await interaction.editReply('❌ Ocorreu um erro ao tentar limpar as mensagens.');
        }
    },
};
