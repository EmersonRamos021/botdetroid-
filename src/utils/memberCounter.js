const config = require('../config');

// Números em fonte bold (matemática) - fallback para canais de voz (que não suportam emojis customizados no nome)
const boldDigits = {
  '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒',
  '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
};

// Emojis customizados para canais de texto (suportam custom emojis no tópico)
const customEmojiNames = {
  '0': 'pureza_i36', '1': 'pureza_i37', '2': 'pureza_i38', '3': 'pureza_i39', '4': 'pureza_i40',
  '5': 'pureza_i41', '6': 'pureza_i42', '7': 'pureza_i43', '8': 'pureza_i44', '9': 'pureza_i45'
};

function formatBoldNumber(number) {
    return number.toString().split('').map(d => boldDigits[d] || d).join(' ');
}

function formatCustomEmojiNumber(client, number) {
    return number.toString().split('').map(d => {
        const emojiName = customEmojiNames[d];
        if (emojiName) {
            const emoji = client.emojis.cache.find(e => e.name === emojiName);
            // Se encontrou o emoji no servidor, retorna o código dele. Se não, usa o bold como fallback.
            return emoji ? emoji.toString() : (boldDigits[d] || d);
        }
        return d;
    }).join(' ');
}

/**
 * Atualiza o canal de contador de membros
 * Pode ser um canal de texto (atualiza o tópico) ou canal de voz (atualiza o nome)
 */
async function updateMemberCounter(client) {
    const channelId = config.memberCounterChannelId;
    if (!channelId) return;

    try {
        const guildId = config.guildId;
        if (!guildId) return;

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        const memberCount = guild.memberCount;

        // Se for canal de texto, atualiza o tópico (usando Emojis Customizados)
        if (channel.isTextBased() && !channel.isThread()) {
            const formattedCountCustom = formatCustomEmojiNumber(client, memberCount);
            const dynamicTopic = `${formattedCountCustom} População`;
            
            if (channel.topic !== dynamicTopic) {
                await channel.setTopic(dynamicTopic, 'Atualização de contador de membros');
                console.log(`[Contador] Tópico do canal ${channel.name} atualizado para: ${dynamicTopic}`);
            }
        } 
        // Se for canal de voz, atualiza o nome (usando fallback bold)
        else if (channel.isVoiceBased()) {
            const formattedCountVoice = formatBoldNumber(memberCount);
            const newName = `👥 População: ${formattedCountVoice}`;
            if (channel.name !== newName) {
                await channel.setName(newName, 'Atualização de contador de membros');
                console.log(`[Contador] Nome do canal de voz atualizado para: ${newName}`);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar contador de membros:', error.message);
    }
}

module.exports = { updateMemberCounter };
