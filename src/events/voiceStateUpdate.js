const config = require('../config');
const { getPool } = require('../utils/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState, client) {
        // Ignorar se o usuário for um bot
        if (newState.member.user.bot) return;

        // Verificar se o usuário ENTROU em um canal de voz
        // Se oldState.channelId for nulo e newState.channelId existir (Entrou)
        // Ou se oldState.channelId for diferente de newState.channelId (Mudou de sala)
        if (!oldState.channelId && newState.channelId || (oldState.channelId !== newState.channelId && newState.channelId)) {
            
            const supportVoiceChannelId = config.supportVoiceChannelId;

            // Se o canal que ele entrou for a Call de Suporte
            if (supportVoiceChannelId && newState.channelId === supportVoiceChannelId) {
                try {
                    const pool = getPool();
                    // Buscar staffs que atendem suporte
                    const [staffRows] = await pool.query('SELECT discord_id, categories FROM ticket_staff');
                    
                    if (!staffRows || staffRows.length === 0) return;

                    // Filtrar apenas staffs que têm 'suporte' nas categorias
                    const staffsParaAvisar = staffRows.filter(row => {
                        try {
                            const cats = Array.isArray(row.categories) ? row.categories : JSON.parse(row.categories || '[]');
                            return cats.includes('suporte');
                        } catch (e) {
                            return false;
                        }
                    });

                    // Enviar DM para cada staff filtrado
                    for (const staff of staffsParaAvisar) {
                        try {
                            // Buscar o objeto do usuário na API do Discord
                            const staffUser = await client.users.fetch(staff.discord_id);
                            if (staffUser) {
                                const embed = new EmbedBuilder()
                                    .setTitle('🔔 Novo Chamado de Suporte')
                                    .setColor('#ffcc00')
                                    .setDescription(`Olá <@${staff.discord_id}>!\n\nO jogador **${newState.member.user.username}** acabou de entrar na call **Aguardando Suporte**.\nPor favor, dirija-se à sala para atendê-lo!`)
                                    .addFields(
                                        { name: '👤 Usuário', value: `${newState.member.user}`, inline: true },
                                        { name: '🆔 ID', value: `\`${newState.member.user.id}\``, inline: true }
                                    )
                                    .setThumbnail(newState.member.user.displayAvatarURL())
                                    .setTimestamp()
                                    .setFooter({ text: 'Detroit Roleplay • Sistema de Suporte', iconURL: client.user.displayAvatarURL() });

                                await staffUser.send({ content: `<@${staff.discord_id}>, tem alguém aguardando atendimento!`, embeds: [embed] });
                            }
                        } catch (err) {
                            // O staff pode estar com a DM fechada
                            console.error(`Não foi possível enviar DM para o staff ${staff.discord_id} - DM Fechada ou Usuário Inválido.`);
                        }
                    }

                } catch (error) {
                    console.error('Erro ao processar notificação de voz de suporte:', error);
                }
            }
        }

        // ════════════════════════════════════════════
        // LÓGICA DE AUDITORIA (LOGS DE VOZ)
        // ════════════════════════════════════════════
        const logVoiceChannelId = config.logVoiceChannelId || config.logChannelId;
        if (!logVoiceChannelId) return;

        const logChannel = client.channels.cache.get(logVoiceChannelId);
        if (!logChannel) return;

        try {
            const embed = new EmbedBuilder()
                .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
                .setTimestamp()
                .setFooter({ text: `Detroit Roleplay • Logs de Voz`, iconURL: client.user.displayAvatarURL() });

            // Entrou em um canal
            if (!oldState.channelId && newState.channelId) {
                embed.setTitle('🎤 Entrou em um canal de Voz')
                     .setColor(config.colors.success)
                     .addFields(
                         { name: '👤 Usuário', value: `<@${newState.member.user.id}> (${newState.member.user.id})`, inline: true },
                         { name: '📥 Canal', value: `<#${newState.channelId}>`, inline: true }
                     );
                await logChannel.send({ embeds: [embed] });
            }
            // Saiu de um canal
            else if (oldState.channelId && !newState.channelId) {
                embed.setTitle('🚪 Saiu de um canal de Voz')
                     .setColor(config.colors.danger)
                     .addFields(
                         { name: '👤 Usuário', value: `<@${newState.member.user.id}> (${newState.member.user.id})`, inline: true },
                         { name: '📤 Canal', value: `<#${oldState.channelId}>`, inline: true }
                     );
                await logChannel.send({ embeds: [embed] });
            }
            // Mudou de canal (movido ou trocou sozinho)
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                embed.setTitle('↔️ Mudou de canal de Voz')
                     .setColor(config.colors.warning)
                     .addFields(
                         { name: '👤 Usuário', value: `<@${newState.member.user.id}> (${newState.member.user.id})`, inline: false },
                         { name: '📤 Saiu de', value: `<#${oldState.channelId}>`, inline: true },
                         { name: '📥 Entrou em', value: `<#${newState.channelId}>`, inline: true }
                     );
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Erro ao enviar log de auditoria de voz:', error.message);
        }
    }
};
