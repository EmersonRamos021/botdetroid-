const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
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
const { getNextCount, getPool } = require('../utils/database');

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
            type: 0, // role
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            id: user.id,
            type: 1, // member
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
            ],
        },
    ];

    // Adicionar permissão para o bot
    permissionOverwrites.push({
        id: interaction.client.user.id,
        type: 1, // member
        allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
        ],
    });

    // Buscar no banco de dados quais membros específicos da staff têm acesso a este tipo
    try {
        const { query } = require('../utils/database');
        const staffRows = await query('SELECT discord_id, categories FROM ticket_staff');
        
        for (const row of staffRows) {
            let cats = [];
            try {
                cats = typeof row.categories === 'string' ? JSON.parse(row.categories) : row.categories;
            } catch(e) {}
            
            // Se o tipo do ticket (ex: 'ticket_compras') for um dos selecionados
            // Ou se mapearmos 'ticket_compras' para 'compras'
            const typeKey = type.replace('ticket_', ''); // ticket_compras -> compras, ticket_suporte -> suporte
            
            if (cats.includes(typeKey) && row.discord_id) {
                const discordIdStr = String(row.discord_id);
                if (/^\d{17,20}$/.test(discordIdStr)) {
                    permissionOverwrites.push({
                        id: discordIdStr,
                        type: 1, // member
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                        ],
                    });
                }
            }
        }
    } catch (e) {
        console.error('Erro ao buscar ticket_staff no banco:', e);
    }

    // Criar canal
    const channelOptions = {
        name: channelName,
        type: ChannelType.GuildText,
        topic: `owner:${user.id} | type:${type} | status:open | ticket:${ticketNum}`,
        permissionOverwrites,
    };

    // Determinar qual categoria usar com base no tipo
    let targetCategory = null;
    if (type === 'ticket_compras') targetCategory = config.ticketCategoryCompras;
    else if (type === 'ticket_suporte') targetCategory = config.ticketCategorySuporte;
    else if (type === 'denuncia') targetCategory = config.ticketCategoryDenuncia;
    else if (type === 'revisao') targetCategory = config.ticketCategoryRevisao;

    // Fallback para a categoria genérica caso a específica não esteja configurada
    if (!targetCategory) targetCategory = config.ticketCategoryId;

    if (targetCategory) {
        channelOptions.parent = targetCategory;
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
        let ticketOwner = null;
        if (ownerId) {
            try {
                ticketOwner = await client.users.fetch(ownerId);
            } catch (e) {
                console.error('Não foi possível buscar o dono do ticket:', e);
            }
        }

        const transcriptBuffer = await generateTranscript(channel, ticketOwner || interaction.user, ticketType);
        const transcriptFile = new AttachmentBuilder(transcriptBuffer, {
            name: `transcript-${channel.name}.html`,
        });

        // 1. Salvar no banco
        let ticketDbId = null;
        try {
            const transcriptHtml = transcriptBuffer.toString('utf-8');
            const pool = getPool();
            const [result] = await pool.execute(
                `INSERT INTO tickets (channel_name, owner_id, owner_tag, ticket_type, closed_by, closed_by_id, transcript_html)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    channel.name,
                    ticketOwner ? ticketOwner.id : (ownerId || 'desconhecido'),
                    ticketOwner ? ticketOwner.tag : 'Desconhecido',
                    ticketType,
                    interaction.user.tag,
                    interaction.user.id, // O ID do Staff que clicou em fechar
                    transcriptHtml
                ]
            );
            ticketDbId = result.insertId;
        } catch (dbError) {
            console.error('❌ Erro ao salvar ticket no banco de dados:', dbError.message);
        }

        // 2. Enviar transcrição no canal de logs
        if (config.logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const logEmbed = buildLogEmbed(
                    `#${channel.name}`,
                    ticketOwner || 'Desconhecido',
                    interaction.user,
                    ticketType,
                );
                await logChannel.send({ embeds: [logEmbed], files: [transcriptFile] });
            }
        }

        // 3. Trancar o canal (remover SendMessages do ticketOwner)
        if (ticketOwner) {
            try {
                await channel.permissionOverwrites.edit(ticketOwner.id, {
                    SendMessages: false
                });
            } catch(e) {}
        }

        // 4. Enviar mensagem pedindo avaliação
        const evalEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('📝 Atendimento Finalizado!')
            .setDescription(`Olá ${ticketOwner ? ticketOwner : 'usuário'}, o seu ticket foi encerrado.\n\nPor favor, **avalie o atendimento** clicando no botão abaixo. Sua nota é muito importante para nós!`)
            .setFooter({ text: 'Detroit Roleplay' });

        const btnEval = new ButtonBuilder()
            .setCustomId(`btn_avaliar_ticket_${ticketDbId || '0'}_${interaction.user.id}`)
            .setLabel('Avaliar Atendimento')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⭐');
            
        const btnSkip = new ButtonBuilder()
            .setCustomId(`btn_pular_avaliacao_${ticketDbId || '0'}_${interaction.user.id}`)
            .setLabel('Pular e Fechar')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        await channel.send({
            content: ticketOwner ? `${ticketOwner}` : '',
            embeds: [evalEmbed],
            components: [new ActionRowBuilder().addComponents(btnEval, btnSkip)]
        });

    } catch (error) {
        console.error('Erro ao fechar ticket:', error);
        await channel.send({ content: '❌ Ocorreu um erro ao processar o encerramento.' });
        setTimeout(() => channel.delete().catch(() => {}), 5000);
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

// ═══════════════════════════════════════════════════════════════
// AVALIAÇÃO DE TICKET
// ═══════════════════════════════════════════════════════════════
async function handleTicketEvaluate(interaction) {
    const customId = interaction.customId; // btn_avaliar_ticket_DBID_STAFFID
    const parts = customId.split('_');
    const dbId = parts[3];
    const staffId = parts[4];

    const modal = new ModalBuilder()
        .setCustomId(`modal_avaliar_${dbId}_${staffId}`)
        .setTitle('⭐ Avaliar Atendimento');

    const inputNota = new TextInputBuilder()
        .setCustomId('input_nota')
        .setLabel('Nota do Atendimento (1 a 5)')
        .setPlaceholder('Ex: 5')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

    const inputDesc = new TextInputBuilder()
        .setCustomId('input_desc')
        .setLabel('Descrição do Atendimento')
        .setPlaceholder('Deixe um elogio ou crítica...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(inputNota),
        new ActionRowBuilder().addComponents(inputDesc)
    );

    await interaction.showModal(modal);
}

async function handleTicketEvaluateSubmit(interaction) {
    // Responde imediatamente para o Discord não invalidar a interação
    await interaction.reply({ content: '✅ Avaliação recebida! Fechando o ticket em alguns segundos...', ephemeral: true }).catch(() => {});
    
    try {
        const customId = interaction.customId; // modal_avaliar_DBID_STAFFID
        const parts = customId.split('_');
        const dbId = parts[2];
        const staffId = parts[3];
        
        let notaStr = interaction.fields.getTextInputValue('input_nota');
        const desc = interaction.fields.getTextInputValue('input_desc');
        
        // Validar nota
        let nota = parseInt(notaStr);
        if (isNaN(nota) || nota < 1 || nota > 5) {
            nota = 5; // Fallback
        }

        const channel = interaction.channel;
        const topic = channel.topic || '';
        const ownerMatch = topic.match(/owner:(\d+)/);
        const ownerId = ownerMatch ? ownerMatch[1] : null;
        const typeMatch = topic.match(/type:(\S+)/);
        const ticketType = typeMatch ? typeMatch[1] : 'desconhecido';

        // Atualizar DB
        if (dbId && dbId !== '0') {
            try {
                const pool = getPool();
                await pool.execute(
                    'UPDATE tickets SET rating = ?, review_comment = ? WHERE id = ?',
                    [nota, desc, dbId]
                );
            } catch (e) {
                console.error('Erro ao atualizar avaliação no DB:', e);
            }
        }

        // Buscar dados para a Embed
        const avaliador = interaction.user;
        let staffUser = `<@${staffId}>`;
        if (staffId && staffId !== 'undefined') {
            try {
                const userObj = await interaction.client.users.fetch(staffId);
                staffUser = `${userObj} (${staffId})`;
            } catch (e) { }
        }

        // Enviar Embed no canal de avaliações
        const reviewChannelId = config.reviewChannelId;
        if (reviewChannelId) {
            const reviewChannel = interaction.guild.channels.cache.get(reviewChannelId);
            if (reviewChannel) {
                const stars = '⭐'.repeat(nota) + '☆'.repeat(5 - nota);
                
                // Mapear motivo
                const typeLabels = {
                    'ticket_compras': 'Compras',
                    'ticket_suporte': 'Suporte',
                    'denuncia': 'Denúncia',
                    'revisao': 'Revisão',
                };
                const motivo = typeLabels[ticketType] || ticketType;

                const embed = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTitle('Avaliação do Staff')
                    .addFields(
                        { name: '👤 Avaliador:', value: `↳ ${avaliador}, ${avaliador.id}` },
                        { name: '👮 Staff:', value: `↳ ${staffUser}` },
                        { name: '🕒 Data:', value: `↳ <t:${Math.floor(Date.now() / 1000)}:F>` },
                        { name: '⭐ Nota do Atendimento:', value: `↳ ${stars} (${nota}/5)` },
                        { name: '💬 Motivo do Atendimento:', value: `\`\`\`\n${motivo}\n\`\`\`` },
                        { name: '📝 Descrição do Atendimento:', value: `\`\`\`\n${desc}\n\`\`\`` }
                    )
                    .setFooter({ text: 'Detroit Roleplay' });

                await reviewChannel.send({ embeds: [embed] });
            }
        }

        // Deletar o canal após 3 segundos
        setTimeout(async () => {
            try {
                await channel.delete('Ticket avaliado e fechado');
            } catch (e) { }
        }, 3000);

    } catch (error) {
        console.error('Erro ao processar avaliação:', error);
        // Evita erro de unknown message caso tente enviar algo depois
    }
}

async function handleSkipEvaluation(interaction) {
    const channel = interaction.channel;
    
    await interaction.reply({
        content: '✅ Avaliação pulada. O ticket será fechado em alguns segundos.',
        ephemeral: true
    });
    
    setTimeout(async () => {
        try {
            await channel.delete('Ticket fechado sem avaliação');
        } catch (e) { }
    }, 3000);
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
    handleTicketEvaluate,
    handleTicketEvaluateSubmit,
    handleSkipEvaluation,
};
