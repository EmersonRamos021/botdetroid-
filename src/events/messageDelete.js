const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message, client) {
        // Ignorar se a mensagem for do bot ou se não houver autor (parcial)
        if (!message.author || message.author.bot) return;

        const logChannelId = config.logChatChannelId || config.logChannelId;
        if (!logChannelId) return;

        const logChannel = client.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mensagem Deletada')
            .setColor(config.colors.danger)
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: '👤 Autor', value: `<@${message.author.id}> (${message.author.id})`, inline: true },
                { name: '📺 Canal', value: `<#${message.channel.id}>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Detroit Roleplay • Logs de Chat`, iconURL: client.user.displayAvatarURL() });

        if (message.content) {
            // Se o conteúdo for muito longo, cortamos para caber no embed
            const content = message.content.length > 1024 ? message.content.slice(0, 1021) + '...' : message.content;
            embed.addFields({ name: '📝 Conteúdo', value: content, inline: false });
        }

        // Se houver anexos (imagens, arquivos)
        if (message.attachments.size > 0) {
            const attachmentUrls = message.attachments.map(a => a.url).join('\n');
            embed.addFields({ name: '📎 Anexos Apagados', value: attachmentUrls || 'Nenhum', inline: false });
            
            // Se for imagem, tentar colocar no thumbnail
            const firstImage = message.attachments.find(a => a.contentType && a.contentType.startsWith('image/'));
            if (firstImage) {
                embed.setImage(firstImage.url);
            }
        }

        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao enviar log de mensagem apagada:', error.message);
        }
    }
};
