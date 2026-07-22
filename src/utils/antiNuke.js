const { EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

const joinHistory = [];
const deleteHistory = [];

async function handleMemberJoin(member, client) {
    const now = Date.now();
    joinHistory.push({ id: member.id, time: now });

    const RAID_TIMEFRAME = config.antiRaid_time * 1000;
    
    // Limpar histórico velho
    while (joinHistory.length > 0 && now - joinHistory[0].time > RAID_TIMEFRAME) {
        joinHistory.shift();
    }

    // Se detectou Raid
    if (joinHistory.length >= config.antiRaid_threshold) {
        console.warn('⚠️ [ANTI-RAID] Ataque detectado! Banindo bots invasores...');
        const logChannel = member.guild.channels.cache.get(config.logChannelId);
        
        // Banir os IDs que entraram nessa janela de tempo
        const idsToBan = joinHistory.map(j => j.id);
        let bannedCount = 0;
        
        for (const id of idsToBan) {
            try {
                await member.guild.members.ban(id, { reason: 'Proteção Anti-Raid Automática' });
                bannedCount++;
            } catch (e) {
                // Pode falhar se não tiver permissão
            }
        }

        // Limpar histórico para não ficar banindo em loop desnecessário
        joinHistory.length = 0;

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚨 PROTEÇÃO ANTI-RAID ATIVADA')
                .setDescription(`Múltiplas contas entraram em um curto período de tempo.\nForam banidas **${bannedCount}** contas invasoras preventivamente.`)
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    }
}

async function handleDeletionEvent(item, client, type) {
    const now = Date.now();
    const guild = item.guild;
    
    // Obter quem deletou via Audit Logs
    try {
        const auditType = type === 'channel' ? AuditLogEvent.ChannelDelete : AuditLogEvent.RoleDelete;
        const fetchedLogs = await guild.fetchAuditLogs({ limit: 1, type: auditType });
        const deletionLog = fetchedLogs.entries.first();

        if (!deletionLog) return;
        const { executor, createdTimestamp } = deletionLog;
        
        // Se o evento for muito antigo, ignora (limite 5s)
        if (now - createdTimestamp > 5000) return;

        // Se quem deletou for o próprio bot ou o dono do server, ignora
        if (executor.id === client.user.id || executor.id === guild.ownerId || executor.id === process.env.OWNER_ID) return;

        deleteHistory.push({ executorId: executor.id, time: now });

        const NUKE_TIMEFRAME = config.antiNuke_time * 1000;
        const recentDeletes = deleteHistory.filter(d => d.executorId === executor.id && (now - d.time) <= NUKE_TIMEFRAME);

        if (recentDeletes.length >= config.antiNuke_threshold) {
            console.warn(`🚨 [ANTI-NUKE] Executor ${executor.tag} detectado deletando em massa!`);
            
            // Punição: Remover todos os cargos ou banir
            const memberToPunish = await guild.members.fetch(executor.id).catch(() => null);
            if (memberToPunish) {
                // Tenta remover os cargos do infrator primeiro para parar o nuke
                try {
                    await memberToPunish.roles.set([], 'Proteção Anti-Nuke: Removendo permissões');
                } catch(e) {}
                
                // Tenta banir
                try {
                    await memberToPunish.ban({ reason: 'Proteção Anti-Nuke Automática (Destruição em massa)' });
                } catch(e) {}
            }

            // Enviar alerta
            const logChannel = guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('☢️ ALERTA ANTI-NUKE ACIONADO')
                    .setDescription(`**Infrator:** ${executor.tag} (${executor.id})\n**Ação:** Tentativa de deletar ${type}s em massa.\n\nO sistema retirou as permissões e baniu o infrator automaticamente para proteger o servidor.`)
                    .setTimestamp();
                await logChannel.send({ content: '@everyone ALERTA CRÍTICO DE SEGURANÇA', embeds: [embed] });
            }

            // Limpa o histórico desse usuário para não triggar múltiplas vezes no mesmo milissegundo
            const keep = deleteHistory.filter(d => d.executorId !== executor.id);
            deleteHistory.length = 0;
            deleteHistory.push(...keep);
        }
    } catch (e) {
        console.error('Erro no Anti-Nuke:', e);
    }
}

module.exports = {
    handleMemberJoin,
    handleDeletionEvent
};
