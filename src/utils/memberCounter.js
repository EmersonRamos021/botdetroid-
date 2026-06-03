const config = require('../config');

// Números em fonte bold (matemática)
const boldDigits = {
  '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒',
  '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
};

function formatBoldNumber(number) {
    return number.toString().split('').map(d => boldDigits[d] || d).join(' ');
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
        const formattedCount = formatBoldNumber(memberCount);

        // Se for canal de texto, atualiza o tópico
        if (channel.isTextBased() && !channel.isThread()) {
            const newTopic = `𝟏 𝟕 𝟒 𝟖 𝟏 𝟑 População`; // Formato original que o usuário pediu? Não, dinâmico:
            const dynamicTopic = `${formattedCount} População`;
            
            if (channel.topic !== dynamicTopic) {
                await channel.setTopic(dynamicTopic, 'Atualização de contador de membros');
                console.log(`[Contador] Tópico do canal ${channel.name} atualizado para: ${dynamicTopic}`);
            }
        } 
        // Se for canal de voz, atualiza o nome
        else if (channel.isVoiceBased()) {
            const newName = `👥 População: ${formattedCount}`;
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
