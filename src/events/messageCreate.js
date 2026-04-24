const { EmbedBuilder, Collection } = require('discord.js');
const config = require('../config');

const spamTracker = new Collection();
const badWordTracker = new Collection();
// Regex para detectar links de convite do Discord
const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

module.exports = async (client, message) => {
    // Ignorar bots e DMs
    if (message.author.bot || !message.guild) return;

    // Staff é isento do filtro (Flood, Filtro de link e Palavras)
    const isStaff = config.staffRoleId && message.member?.roles.cache.has(config.staffRoleId);

    // ═══════════════════════════════════════
    // SISTEMA DE PALAVRAS PROIBIDAS
    // ═══════════════════════════════════════
    if (!isStaff) {
        const contentLower = message.content.toLowerCase();
        
        // Verifica se qualquer bad word configurada está na string
        const encontrouPalavrao = config.badWords.some(word => {
            // Regex de borda limitadora garante que "cor" não accione com "corno"
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(contentLower);
        });

        if (encontrouPalavrao) {
            await message.delete().catch(() => {});
            
            const now = Date.now();
            const userId = message.author.id;

            if (!badWordTracker.has(userId)) {
                badWordTracker.set(userId, []);
            }

            const userBW = badWordTracker.get(userId);
            userBW.push(now);

            // 3 minutos = 180000ms
            const recentBW = userBW.filter((timestamp) => (now - timestamp) < 180000);
            badWordTracker.set(userId, recentBW);

            let timeoutApplied = false;

            if (recentBW.length >= 4) {
                try {
                    // Mute de 5 minutos (300000ms)
                    if (message.member && message.member.moderatable) {
                        await message.member.timeout(300000, "Múltiplas palavras proibidas (Auto-Mod)");
                        timeoutApplied = true;

                        const aviso = await message.channel.send({
                            content: `🛑 ${message.author} recebeu um **Mute Automático de 5 minutos** por insistir no uso de palavras bloqueadas.`
                        });
                        setTimeout(() => aviso.delete().catch(() => {}), 10000);

                        // Limpa pra não mutar de novo em sequencia
                        badWordTracker.set(userId, []);
                    }
                } catch (e) {
                    console.error("Erro ao aplicar timeout:", e);
                }
            } 
            
            if (!timeoutApplied) {
                const aviso = await message.channel.send({
                    content: `${message.author} ⚠️ Você utilizou uma palavra proibida. Sua mensagem foi removida.\n> 🔴 *Cuidado: Insistir nisso resultará em Mute.*`
                });
                setTimeout(() => aviso.delete().catch(() => {}), 6000);
            }

            if (config.automodLogChannelId) {
                const logChannel = message.guild.channels.cache.get(config.automodLogChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.danger)
                        .setTitle('🗣️ Palavra Proibida Detectada')
                        .addFields(
                            { name: '👤 Usuário', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                            { name: '📍 Canal', value: `<#${message.channel.id}>`, inline: true },
                            { name: '💬 Mensagem Original', value: `\`\`\`${message.content.substring(0, 1000)}\`\`\``, inline: false },
                            { name: '⚠️ Punição', value: timeoutApplied ? '`🚨 Tomou Mute de 5 Mins (Infrator Recorrente)`' : '`Aviso e Deleção (Punição Acumulando)`', inline: false }
                        )
                        .setFooter({ text: 'Auto-Moderação' })
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
            return;
        }
    }

    // ═══════════════════════════════════════
    // SISTEMA ANTI-FLOOD
    // ═══════════════════════════════════════
    if (!isStaff) {
        const now = Date.now();
        const userId = message.author.id;

        if (!spamTracker.has(userId)) {
            spamTracker.set(userId, []);
        }

        const userMessages = spamTracker.get(userId);
        userMessages.push(now);

        // Mantém as msgs dentro da janela configurada na config.js (4000ms = 4s)
        const recentMessages = userMessages.filter((timestamp) => (now - timestamp) < config.antiFlood.timeWindowMs);
        spamTracker.set(userId, recentMessages);

        if (recentMessages.length > config.antiFlood.maxMessages) {
            await message.delete().catch(() => {});
            
            spamTracker.set(userId, []); // Previne sobrecarregar a memória no loop

            try {
                if (message.member && message.member.moderatable) {
                    // 15 minutos em milissegundos
                    await message.member.timeout(15 * 60 * 1000, "Fez Spam/Flood no chat (Auto-Mod)");
                    
                    const aviso = await message.channel.send({
                        content: `🛑 ${message.author} recebeu um **Mute de 15 minutos** por Floodar/Fazer Spam de mensagens.`
                    });
                    setTimeout(() => aviso.delete().catch(() => {}), 10000);
                }
            } catch (e) {
                console.error("Erro ao aplicar timeout (Anti-Flood):", e);
            }

            if (config.automodLogChannelId) {
                const logChannel = message.guild.channels.cache.get(config.automodLogChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('🛑 Sistema Anti-Flood Ativado')
                        .addFields(
                            { name: '👤 Usuário', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                            { name: '📍 Canal', value: `<#${message.channel.id}>`, inline: true },
                            { name: '⚠️ Ação / Punição', value: `\`🚨 Silenciado (Timeout) por 15 Minutos\``, inline: false },
                        )
                        .setFooter({ text: 'Auto-Moderação' })
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
            return;
        }
    }

    // ═══════════════════════════════════════
    // FILTRO DE LINKS
    // ═══════════════════════════════════════
    if (!config.linkFilterEnabled) return;

    // Verificar se a mensagem contém links de convite
    const matches = message.content.match(INVITE_REGEX);
    if (!matches) return;

    // Verificar cada convite encontrado
    for (const inviteUrl of matches) {
        // Extrair o código do convite
        const codeMatch = inviteUrl.match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/i);
        if (!codeMatch) continue;

        const inviteCode = codeMatch[1];

        try {
            const invite = await client.fetchInvite(inviteCode);

            // Se o convite NÃO for do servidor atual → deletar
            if (invite.guild && invite.guild.id !== message.guild.id) {
                await message.delete();

                const warningEmbed = new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('⚠️ Link de Servidor Bloqueado')
                    .setDescription(
                        `${message.author}, links de convite de **outros servidores** não são permitidos aqui.\n\n` +
                        `> Apenas links do nosso servidor são aceitos.`
                    )
                    .setFooter({ text: 'Detroit Roleplay • Auto-Moderação' })
                    .setTimestamp();

                const warning = await message.channel.send({ embeds: [warningEmbed] });

                // Apagar o aviso após 8 segundos
                setTimeout(() => warning.delete().catch(() => {}), 8000);

                // Log no canal de logs
                if (config.logChannelId) {
                    const logChannel = message.guild.channels.cache.get(config.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle('🔗 Link de Servidor Bloqueado')
                            .addFields(
                                { name: '👤 Usuário', value: `${message.author} (\`${message.author.username}\`)`, inline: true },
                                { name: '📍 Canal', value: `<#${message.channel.id}>`, inline: true },
                                { name: '🔗 Link Bloqueado', value: `\`${inviteUrl}\``, inline: false },
                                { name: '🏠 Servidor do Link', value: `\`${invite.guild.name}\``, inline: true },
                            )
                            .setFooter({ text: 'Detroit Roleplay • Auto-Moderação' })
                            .setTimestamp();

                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                return; // Mensagem já deletada, não precisa verificar mais
            }
        } catch (e) {
            // Convite inválido ou expirado — deletar por segurança
            if (e.code === 10006) {
                await message.delete().catch(() => {});

                const warning = await message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.danger)
                            .setDescription(`${message.author}, este link de convite é inválido ou expirado e foi removido.`)
                            .setFooter({ text: 'Detroit Roleplay • Auto-Moderação' })
                    ]
                });
                setTimeout(() => warning.delete().catch(() => {}), 5000);
                return;
            }
        }
    }
};
