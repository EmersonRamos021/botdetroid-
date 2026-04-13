const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Regex para detectar links de convite do Discord
const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

module.exports = async (client, message) => {
    // Ignorar bots e DMs
    if (message.author.bot || !message.guild) return;

    // Verificar se o filtro de links está ativado
    if (!config.linkFilterEnabled) return;

    // Verificar se a mensagem contém links de convite
    const matches = message.content.match(INVITE_REGEX);
    if (!matches) return;

    // Staff é isento do filtro
    if (config.staffRoleId && message.member.roles.cache.has(config.staffRoleId)) return;

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
