const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'messageUpdate',
    once: false,
    async execute(oldMessage, newMessage, client) {
        // Ignorar se a mensagem for do bot, ou se o conteúdo não mudou (apenas embeds carregados pelo discord)
        if (!oldMessage.author || oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const logChannelId = config.logChatChannelId || config.logChannelId;
        if (!logChannelId) return;

        const logChannel = client.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Mensagem Editada')
            .setColor(config.colors.warning)
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
            .addFields(
                { name: '👤 Autor', value: `<@${newMessage.author.id}> (${newMessage.author.id})`, inline: true },
                { name: '📺 Canal', value: `<#${newMessage.channel.id}> [Ir para mensagem](${newMessage.url})`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Detroit Roleplay • Logs de Chat`, iconURL: client.user.displayAvatarURL() });

        const oldContent = oldMessage.content ? (oldMessage.content.length > 500 ? oldMessage.content.slice(0, 497) + '...' : oldMessage.content) : 'Nenhum (ou não carregado)';
        const newContent = newMessage.content ? (newMessage.content.length > 500 ? newMessage.content.slice(0, 497) + '...' : newMessage.content) : 'Nenhum';

        embed.addFields(
            { name: '🔴 Antes', value: oldContent, inline: false },
            { name: '🟢 Depois', value: newContent, inline: false }
        );

        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao enviar log de mensagem editada:', error.message);
        }
    }
};
