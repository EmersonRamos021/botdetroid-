const spamTracker = new Collection();

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
            
            const aviso = await message.channel.send({
                content: `${message.author} ⚠️ Você utilizou uma palavra proibida ou termo bloqueado. Sua mensagem foi removida.`
            });
            setTimeout(() => aviso.delete().catch(() => {}), 6000);

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
            
            spamTracker.set(userId, []); // Previne spammar alertas seguidos

            const aviso = await message.channel.send({
                content: `${message.author} 🛑 **Anti-Flood!** Você está enviando mensagens rápido demais. Contenha-se!`
            });
            setTimeout(() => aviso.delete().catch(() => {}), 6000);

            if (config.automodLogChannelId) {
                const logChannel = message.guild.channels.cache.get(config.automodLogChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('🛑 Sistema Anti-Flood Ativado')
                        .addFields(
                            { name: '👤 Usuário', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                            { name: '📍 Canal', value: `<#${message.channel.id}>`, inline: true },
                            { name: '⚠️ Ação', value: `Flood detectado e as mensagens finais foram apagadas.`, inline: false },
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
