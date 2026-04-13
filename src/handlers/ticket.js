const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config = require('../config');
const {
    buildTicketEmbed,
    buildTicketButtons,
    buildTicketManageEmbed,
    buildTicketManageComponents,
    buildAddUserIdModal,
    buildRemUserIdModal,
    buildConfirmCloseEmbed,
    buildConfirmCloseButtons,
    buildLogEmbed,
} = require('../utils/embeds');
const { generateTranscript } = require('../utils/transcript');
const { getNextCount } = require('../utils/database');

async function getNextTicketNumber() {
    const num = await getNextCount('ticket');
    return String(num).padStart(4, '0');
}

// ═══════════════════════════════════════════════════════════════
// CRIAR CANAL DE TICKET
// ═══════════════════════════════════════════════════════════════
async function createTicketChannel(interaction, type, formData = {}) {
    const guild = interaction.guild;
    const user = interaction.user;
    const ticketNum = await getNextTicketNumber();

    // Prefixo do canal baseado no tipo com emoji
    const prefixes = {
        'ticket_compras': '💰・compras',
        'ticket_suporte': '🔧・suporte',
    };
    const prefix = prefixes[type] || '🎫・ticket';
    const channelName = `${prefix}-${user.username.replace(/[^a-zA-Z0-9]/g, '')}-${ticketNum}`;

    // Permissões do canal
    const permissionOverwrites = [
        {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            id: user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
            ],
        },
    ];

    // Adicionar cargo staff (se configurado)
    if (config.staffRoleId) {
        permissionOverwrites.push({
            id: config.staffRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
            ],
        });
    }

    // Adicionar permissão para o bot
    permissionOverwrites.push({
        id: interaction.client.user.id,
        allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
        ],
    });

    // Criar canal
    const channelOptions = {
        name: channelName,
        type: ChannelType.GuildText,
        topic: `owner:${user.id} | type:${type} | status:open | ticket:${ticketNum}`,
        permissionOverwrites,
    };

    // Adicionar à categoria se configurada
    if (config.ticketCategoryId) {
        channelOptions.parent = config.ticketCategoryId;
    }

    const channel = await guild.channels.create(channelOptions);

    // Enviar embed do ticket
    const ticketEmbed = buildTicketEmbed(user, type, formData);
    const ticketButtons = buildTicketButtons();

    await channel.send({
        content: `${user} Bem-vindo ao seu ticket! ${config.staffRoleId ? `<@&${config.staffRoleId}>` : ''}`,
        embeds: [ticketEmbed],
        components: [ticketButtons],
    });

    // Log
    if (config.logChannelId) {
        const logChannel = guild.channels.cache.get(config.logChannelId);
        if (logChannel) {
            const typeLabels = {
                'ticket_compras': '💰 Compras/Lojas',
                'ticket_suporte': '🔧 Suporte Geral',
                'denuncia': '📢 Denúncia',
                'revisao': '⚠️ Revisão',
            };

            const logEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🎫 Novo Ticket Aberto')
                .addFields(
                    { name: '📋 Canal', value: `${channel}`, inline: true },
                    { name: '📂 Categoria', value: typeLabels[type] || type, inline: true },
                    { name: '👤 Aberto por', value: `${user} (${user.tag})`, inline: true },
                    { name: '🔢 Número', value: `#${ticketNum}`, inline: true },
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Detroit Roleplay • Logs de Tickets' })
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        }
    }

    return channel;
}

// ═══════════════════════════════════════════════════════════════
// FECHAR TICKET (mostra confirmação)
// ═══════════════════════════════════════════════════════════════
async function handleCloseTicket(interaction) {
    // Verificar se é um canal de ticket
    const topic = interaction.channel.topic;
    if (!topic || !topic.includes('status:open')) {
        return interaction.reply({
            content: '❌ Este não é um canal de ticket ativo.',
            ephemeral: true,
        });
    }

    const embed = buildConfirmCloseEmbed();
    const buttons = buildConfirmCloseButtons();

    await interaction.reply({
        embeds: [embed],
        components: [buttons],
    });
}

// ═══════════════════════════════════════════════════════════════
// CONFIRMAR FECHAMENTO
// ═══════════════════════════════════════════════════════════════
async function handleConfirmClose(interaction, client) {
    const channel = interaction.channel;
    const topic = channel.topic || '';

    // Extrair informações do topic
    const ownerMatch = topic.match(/owner:(\d+)/);
    const typeMatch = topic.match(/type:(\S+)/);
    const ticketMatch = topic.match(/ticket:(\d+)/);
    const callMatch = topic.match(/call:(\d+)/); // Captura eventual call vinculada

    const ownerId = ownerMatch ? ownerMatch[1] : null;
    const ticketType = typeMatch ? typeMatch[1] : 'desconhecido';
    const ticketNum = ticketMatch ? ticketMatch[1] : '0000';
    const callId = callMatch ? callMatch[1] : null;

    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('⏳ Fechando ticket...')
                .setDescription('Gerando transcrição e encerrando o ticket. Aguarde...'),
        ],
        components: [],
    });

    try {
        // Buscar o dono do ticket
        let ticketOwner = null;
        if (ownerId) {
            try {
                ticketOwner = await client.users.fetch(ownerId);
            } catch (e) {
                console.error('Não foi possível buscar o dono do ticket:', e);
            }
        }

        // Gerar transcrição HTML
        const transcriptBuffer = await generateTranscript(channel, ticketOwner || interaction.user, ticketType);
        const transcriptFile = new AttachmentBuilder(transcriptBuffer, {
            name: `transcript-${channel.name}.html`,
        });

        // Enviar transcrição no canal de logs
        let transcriptUrl = null;
        if (config.logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const logEmbed = buildLogEmbed(
                    `#${channel.name}`,
                    ticketOwner || 'Desconhecido',
                    interaction.user,
                    ticketType,
                );

                const logMessage = await logChannel.send({
                    embeds: [logEmbed],
                    files: [transcriptFile],
                });

                const attachedFile = logMessage.attachments.first();
                if (attachedFile) {
                    transcriptUrl = attachedFile.url;
                }
            }
        }

        // Enviar transcrição na DM do dono do ticket
        if (ticketOwner) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('📋 Transcrição do Ticket')
                    .setDescription(
                        `Seu ticket **#${channel.name}** foi fechado.\n\n` +
                        `**Clique no botão abaixo para baixar a transcrição**.\n` +
                        `O arquivo é do formato HTML e pode ser aberto no seu navegador para ver como o ticket era.`
                    )
                    .addFields(
                        { name: '🔒 Fechado por', value: `${interaction.user.tag}`, inline: true },
                        { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    )
                    .setFooter({ text: 'Detroit Roleplay' })
                    .setTimestamp();

                let dmPayload = { embeds: [dmEmbed] };

                if (transcriptUrl) {
                    // Envia com botão (sem anexo)
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Baixar Transcrição')
                            .setEmoji('📥')
                            .setStyle(ButtonStyle.Link)
                            .setURL(transcriptUrl)
                    );
                    dmPayload.components = [row];
                } else {
                    // Fallback: reutiliza o buffer já gerado
                    const dmTranscriptFile = new AttachmentBuilder(transcriptBuffer, {
                        name: `transcript-${channel.name}.html`,
                    });
                    dmPayload.files = [dmTranscriptFile];
                }

                await ticketOwner.send(dmPayload);
            } catch (e) {
                console.error('Não foi possível enviar DM ao dono do ticket:', e.message);
            }
        }

        // Mensagem de encerramento
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.danger)
                    .setTitle('🔒 Ticket Encerrado')
                    .setDescription(
                        `Este ticket foi fechado por ${interaction.user}.\n` +
                        `A transcrição foi salva e enviada.\n\n` +
                        `**Este canal será deletado em 5 segundos.**`
                    )
                    .setTimestamp(),
            ],
        });

        // Deletar canal de voz temporário (se existir)
        if (callId) {
            try {
                const callChannel = channel.guild.channels.cache.get(callId);
                if (callChannel) await callChannel.delete('Ticket fechado');
            } catch (err) {
                console.error('Erro ao deletar call do ticket:', err);
            }
        }

        // Deletar canal de texto após 5 segundos
        setTimeout(async () => {
            try {
                await channel.delete('Ticket fechado');
            } catch (e) {
                console.error('Erro ao deletar canal do ticket:', e);
            }
        }, 5000);

    } catch (error) {
        console.error('Erro ao fechar ticket:', error);
        await channel.send({
            content: '❌ Ocorreu um erro ao gerar a transcrição, mas o ticket será fechado.',
        });

        setTimeout(async () => {
            try {
                await channel.delete('Ticket fechado (com erro)');
            } catch (e) {
                console.error('Erro ao deletar canal:', e);
            }
        }, 5000);
    }
}

// ═══════════════════════════════════════════════════════════════
// CANCELAR FECHAMENTO
// ═══════════════════════════════════════════════════════════════
async function handleCancelClose(interaction) {
    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ Fechamento Cancelado')
                .setDescription('O ticket continuará aberto.'),
        ],
        components: [],
    });

    // Apagar a mensagem de cancelamento após 3 segundos
    setTimeout(async () => {
        try {
            await interaction.deleteReply();
        } catch (e) {
            // Ignora
        }
    }, 3000);
}

// ═══════════════════════════════════════════════════════════════
// GERENCIAR TICKET (Engrenagem)
// ═══════════════════════════════════════════════════════════════
async function handleManageTicket(interaction) {
    if (config.staffRoleId && !interaction.member.roles.cache.has(config.staffRoleId)) {
        return interaction.reply({
            content: '❌ Apenas membros da equipe podem gerenciar tickets.',
            ephemeral: true,
        });
    }

    const embed = buildTicketManageEmbed();
    const components = buildTicketManageComponents();

    await interaction.reply({
        embeds: [embed],
        components: components,
        ephemeral: true,
    });
}

// ═══════════════════════════════════════════════════════════════
// ADICIONAR / REMOVER USUÁRIO DO TICKET
// ═══════════════════════════════════════════════════════════════
// ── Abrir Modal de Adicionar por ID ──
async function handleTicketAddUserModalOpen(interaction) {
    const modal = buildAddUserIdModal();
    await interaction.showModal(modal);
}

// ── Processar o Submit do ID (Adicionar) ──
async function handleTicketAddUserIdSubmit(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const userId = interaction.fields.getTextInputValue('input_user_id').replace(/\D/g, ''); // limpa não numéricos
        const channel = interaction.channel;

        if (userId.length < 17 || userId.length > 20) {
            return interaction.editReply('❌ O ID informado é inválido. IDs do Discord possuem entre 17 e 20 números.');
        }

        let discordUser;
        try {
            discordUser = await interaction.client.users.fetch(userId);
        } catch (e) {
            return interaction.editReply('❌ **Erro:** O usuário com este ID não foi encontrado no Discord.');
        }
        
        await channel.permissionOverwrites.edit(discordUser.id, {
            ViewChannel: true,
            SendMessages: true,
            AttachFiles: true,
            ReadMessageHistory: true,
        }, { type: 1 /* OverwriteType.Member */ });

        await interaction.editReply(`✅ O usuário \`${discordUser.tag}\` (<@${discordUser.id}>) foi **adicionado** ao ticket.`);
        
        await channel.send({ content: `🔹 <@${discordUser.id}> foi adicionado ao ticket via ID por ${interaction.user}.` });
    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Ocorreu um erro ao adicionar o membro por ID. Verifique se o ID existe.');
    }
}

// ── Abrir Modal de Remover por ID ──
async function handleTicketRemUserModalOpen(interaction) {
    const modal = buildRemUserIdModal();
    await interaction.showModal(modal);
}

// ── Processar o Submit do ID (Remover) ──
async function handleTicketRemUserIdSubmit(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const userId = interaction.fields.getTextInputValue('input_user_id').replace(/\D/g, ''); // limpa numéricos
        const channel = interaction.channel;
        
        // Verifica se está tentando remover o dono
        const topic = channel.topic || '';
        const ownerMatch = topic.match(/owner:(\d+)/);
        if (ownerMatch && ownerMatch[1] === userId) {
            return interaction.editReply('❌ Você não pode remover o dono do ticket.');
        }

        let discordUser;
        try {
            discordUser = await interaction.client.users.fetch(userId);
        } catch (e) {
            return interaction.editReply('❌ **Erro:** O usuário com este ID não foi encontrado no Discord.');
        }

        await channel.permissionOverwrites.edit(discordUser.id, {
            ViewChannel: false,
        }, { type: 1 });

        await interaction.editReply(`✅ O usuário \`${discordUser.tag}\` (<@${discordUser.id}>) foi **removido** do ticket.`);
        
        await channel.send({ content: `🔸 <@${discordUser.id}> foi removido do ticket via ID por ${interaction.user}.` });
    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Ocorreu um erro ao remover o membro por ID. Verifique se o ID existe.');
    }
}

// ═══════════════════════════════════════════════════════════════
// TORNAR TICKET PERMANENTE
// ═══════════════════════════════════════════════════════════════
async function handleTicketPermanent(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const permanentCatId = config.permanentCategoryId;
        const channel = interaction.channel;

        if (!permanentCatId) {
            return interaction.editReply('❌ A Categoria de Tickets Permanentes não foi configurada. Use o comando `/config` para configurar.');
        }

        if (channel.parentId === permanentCatId) {
            return interaction.editReply('❌ Este ticket já está na categoria Permanente.');
        }

        await channel.setParent(permanentCatId, { lockPermissions: false });
        await interaction.editReply('✅ Ticket movido para a categoria Permanente com sucesso.');
        
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('📌 Ticket Permanente')
                    .setDescription(`Este ticket foi movido para a categoria permanente por ${interaction.user}. Ele não será mais encerrado automaticamente, exceto se fechado manualmente.`)
            ]
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Ocorreu um erro ao tentar mover o ticket de categoria. Verifique as permissões do bot.');
    }
}

// ═══════════════════════════════════════════════════════════════
// CRIAR CALL TEMPORÁRIA
// ═══════════════════════════════════════════════════════════════
async function handleTicketCreateCall(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const textChannel = interaction.channel;
        const topic = textChannel.topic || '';
        
        if (topic.includes('call:')) {
            return interaction.editReply('❌ Já existe uma call ativa para este ticket.');
        }

        const ticketName = textChannel.name.replace(/^(..・)/, ''); // Remove emoji prefix
        const voiceChannelName = `📞・${ticketName}`;

        const channelOptions = {
            name: voiceChannelName,
            type: ChannelType.GuildVoice,
            permissionOverwrites: textChannel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                allow: overwrite.allow.toArray(),
                deny: overwrite.deny.toArray(),
            }))
        };

        if (textChannel.parentId) {
            channelOptions.parent = textChannel.parentId;
        }

        const voiceChannel = await interaction.guild.channels.create(channelOptions);
        
        // Atualiza o tópico para registrar o ID da call
        await textChannel.edit({ topic: `${topic} | call:${voiceChannel.id}` });

        await interaction.editReply(`✅ Call temporária criada! Acesse: ${voiceChannel}`);
        await textChannel.send(`📞 Sala de voz temporária criada para este ticket: ${voiceChannel}`);
    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Erro ao criar a call temporária.');
    }
}

module.exports = {
    createTicketChannel,
    handleCloseTicket,
    handleConfirmClose,
    handleCancelClose,
    handleManageTicket,
    handleTicketAddUserModalOpen,
    handleTicketAddUserIdSubmit,
    handleTicketRemUserModalOpen,
    handleTicketRemUserIdSubmit,
    handleTicketCreateCall,
    handleTicketPermanent,
};
