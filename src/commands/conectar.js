const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('conectar')
        .setDescription('Envia o painel de conexão do servidor (Apenas Staff).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Embed estilo o da imagem
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setAuthor({ name: 'Detroit Roleplay', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`**💙 Informações**\n\`\`\`Utilize 'Conectar-se' para se conectar em nosso servidor, certifique-se de ter o MTA:SA instalado.\`\`\`\n**🛡️ Nome do servidor:**\n\`\`\`[BR] DETROIT ROLEPLAY | WHITELIST | discord.gg/detroitroleplay\`\`\`\n**🌍 Status:**\n\`\`\`🟢 Online\`\`\`\n**📡 Conectar - Cole o comando abaixo no F8:**\n\`\`\`connect jogar.detroitroleplay.com\`\`\``)
            .setFooter({ text: 'Status atualizado a cada 2 minutos. Não utilize os botões de copiar.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 Conectar-se')
                .setStyle(ButtonStyle.Link)
                .setURL('https://detroitroleplay.com/jogar'),
            new ButtonBuilder()
                .setLabel('💙 Site')
                .setStyle(ButtonStyle.Link)
                .setURL('https://detroitroleplay.com/')
        );

        await interaction.reply({
            content: '✅ Painel de conexão enviado com sucesso!',
            ephemeral: true
        });

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
