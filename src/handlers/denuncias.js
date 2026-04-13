const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config = require('../config');
const { query } = require('../utils/database');

// ═══════════════════════════════════════════════════════════════
// GERAÇÃO DE CÓDIGO ALFANUMÉRICO ÚNICO
// ═══════════════════════════════════════════════════════════════
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I para evitar confusão

function randomCode() {
    let code = 'DR-';
    for (let i = 0; i < 5; i++) {
        code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    return code;
}

async function generateUniqueCode() {
    for (let attempt = 0; attempt < 10; attempt++) {
        const code = randomCode();
        const existing = await query('SELECT id FROM reports WHERE code = ?', [code]);
        if (existing.length === 0) return code;
    }
    // Fallback: usar timestamp se todas as tentativas falharem
    return `DR-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE BANCO DE DADOS
// ═══════════════════════════════════════════════════════════════

async function saveReport(report) {
    await query(
        `INSERT INTO reports (code, type, user_id, user_tag, id_infrator, motivo, link_provas, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            report.code,
            'denuncia',
            report.userId,
            report.userTag,
            report.idInfrator,
            report.motivo,
            report.linkProvas,
            'pendente',
        ]
    );
}

async function saveRevisao(code, revisao) {
    await query(
        `UPDATE reports SET 
            revisao_user_id = ?, 
            revisao_user_tag = ?, 
            revisao_motivo = ?, 
            revisao_link_provas = ?, 
            revisao_created_at = NOW(), 
            revisao_status = 'pendente'
         WHERE code = ?`,
        [revisao.userId, revisao.userTag, revisao.motivo, revisao.linkProvas, code]
    );
}

async function saveMessageId(code, messageId) {
    await query('UPDATE reports SET message_id = ? WHERE code = ?', [messageId, code]);
}

async function saveRevisaoMessageId(code, messageId) {
    await query('UPDATE reports SET revisao_message_id = ? WHERE code = ?', [messageId, code]);
}

async function updateDenunciaStatus(code, status, staffId, staffTag, reason) {
    await query(
        'UPDATE reports SET status = ?, resolved_by = ?, resolved_tag = ?, staff_reason = ?, resolved_at = NOW() WHERE code = ?',
        [status, staffId, staffTag, reason, code]
    );
}

async function updateRevisaoStatus(code, status, staffId, staffTag, reason) {
    await query(
        'UPDATE reports SET revisao_status = ?, revisao_resolved_by = ?, revisao_resolved_tag = ?, revisao_staff_reason = ?, revisao_resolved_at = NOW() WHERE code = ?',
        [status, staffId, staffTag, reason, code]
    );
}

async function findReport(code) {
    const rows = await query('SELECT * FROM reports WHERE code = ?', [code.toUpperCase()]);
    if (rows.length === 0) return null;

    const r = rows[0];
    return {
        code: r.code,
        type: r.type,
        userId: r.user_id,
        userTag: r.user_tag,
        idInfrator: r.id_infrator,
        motivo: r.motivo,
        linkProvas: r.link_provas,
        status: r.status,
        createdAt: r.created_at,
        resolvedBy: r.resolved_by,
        resolvedTag: r.resolved_tag,
        staffReason: r.staff_reason,
        resolvedAt: r.resolved_at,
        messageId: r.message_id,
        // Revisão data
        revisaoUserId: r.revisao_user_id,
        revisaoUserTag: r.revisao_user_tag,
        revisaoMotivo: r.revisao_motivo,
        revisaoLinkProvas: r.revisao_link_provas,
        revisaoCreatedAt: r.revisao_created_at,
        revisaoStatus: r.revisao_status,
        revisaoResolvedBy: r.revisao_resolved_by,
        revisaoResolvedTag: r.revisao_resolved_tag,
        revisaoStaffReason: r.revisao_staff_reason,
        revisaoResolvedAt: r.revisao_resolved_at,
        revisaoMessageId: r.revisao_message_id,
        // Helpers
        hasRevisao: !!r.revisao_user_id,
    };
}

// ═══════════════════════════════════════════════════════════════
// HANDLER DOS BOTÕES DO PAINEL
// ═══════════════════════════════════════════════════════════════
async function handleDenunciaButton(interaction) {
    const customId = interaction.customId;

    if (customId === 'btn_denuncia') {
        await showDenunciaModal(interaction);
    } else if (customId === 'btn_revisao') {
        await showRevisaoModal(interaction);
    } else if (customId === 'btn_consultar') {
        await showConsultaModal(interaction);
    }
}

// ═══════════════════════════════════════════════════════════════
// MODAL: REALIZAR DENÚNCIA
// ═══════════════════════════════════════════════════════════════
async function showDenunciaModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('modal_denuncia')
        .setTitle('📢 Realizar Denúncia');

    const idInfrator = new TextInputBuilder()
        .setCustomId('id_infrator')
        .setLabel('ID do Infrator')
        .setPlaceholder('Digite o ID numérico do infrator')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

    const motivo = new TextInputBuilder()
        .setCustomId('motivo_denuncia')
        .setLabel('Motivo da Denúncia')
        .setPlaceholder('Explique brevemente a regra quebrada, e o motivo da denúncia')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1024);

    const linkProvas = new TextInputBuilder()
        .setCustomId('link_provas')
        .setLabel('Link das Provas (somente YouTube)')
        .setPlaceholder('https://youtube.com/...')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

    modal.addComponents(
        new ActionRowBuilder().addComponents(idInfrator),
        new ActionRowBuilder().addComponents(motivo),
        new ActionRowBuilder().addComponents(linkProvas),
    );

    await interaction.showModal(modal);
}

// ═══════════════════════════════════════════════════════════════
// MODAL: REVISAR PUNIÇÃO
// ═══════════════════════════════════════════════════════════════
async function showRevisaoModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('modal_revisao')
        .setTitle('⚠️ Revisar Punição');

    const codigo = new TextInputBuilder()
        .setCustomId('codigo')
        .setLabel('Código do Caso')
        .setPlaceholder('Ex: DR-4AK7X')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

    const motivoRevisao = new TextInputBuilder()
        .setCustomId('motivo_revisao')
        .setLabel('Motivo para Revisão')
        .setPlaceholder('Explique o motivo para revisionarmos a punição.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1024);

    const linkProvas = new TextInputBuilder()
        .setCustomId('link_provas')
        .setLabel('Link das Provas (somente YouTube)')
        .setPlaceholder('https://youtube.com/...')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

    modal.addComponents(
        new ActionRowBuilder().addComponents(codigo),
        new ActionRowBuilder().addComponents(motivoRevisao),
        new ActionRowBuilder().addComponents(linkProvas),
    );

    await interaction.showModal(modal);
}

// ═══════════════════════════════════════════════════════════════
// MODAL: CONSULTAR CÓDIGO
// ═══════════════════════════════════════════════════════════════
async function showConsultaModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('modal_consultar')
        .setTitle('🔍 Consultar Código');

    const codigo = new TextInputBuilder()
        .setCustomId('codigo_consulta')
        .setLabel('Código do Caso')
        .setPlaceholder('Ex: DR-4AK7X')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

    modal.addComponents(
        new ActionRowBuilder().addComponents(codigo),
    );

    await interaction.showModal(modal);
}

// ═══════════════════════════════════════════════════════════════
// EMBEDS PARA O CANAL DE DENÚNCIAS (STAFF)
// ═══════════════════════════════════════════════════════════════

// Embed de denúncia nova (quando alguém abre denúncia)
function buildDenunciaStaffEmbed(report, user) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`📢 Nova Denúncia — \`${report.code}\``)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '🔑 Código do Caso', value: `\`${report.code}\``, inline: true },
            { name: '📊 Status', value: '🟡 Pendente', inline: true },
            { name: '👤 Denunciante', value: `${user} (\`${user.username}\`)`, inline: false },
            { name: '🆔 ID do Infrator', value: `\`${report.idInfrator}\``, inline: true },
            { name: '📝 Motivo', value: report.motivo, inline: false },
            { name: '🔗 Link das Provas', value: report.linkProvas, inline: false },
            { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter({ text: `Detroit Roleplay • ${report.code}` })
        .setTimestamp();

    return embed;
}

// Embed de revisão (mostra contexto completo: denúncia + decisão + revisão)
function buildRevisaoStaffEmbed(report, revisaoUser) {
    const statusLabels = {
        'pendente': '🟡 Pendente',
        'aprovada': '🟢 Aprovada',
        'negada': '🔴 Negada',
        'concluida': '✅ Concluída',
    };

    const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`⚠️ Revisão de Punição — \`${report.code}\``)
        .setThumbnail(revisaoUser.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '🔑 Código do Caso', value: `\`${report.code}\``, inline: true },
            { name: '📊 Status da Revisão', value: '🟡 Pendente', inline: true },
            { name: '👤 Solicitante', value: `${revisaoUser} (\`${revisaoUser.username}\`)`, inline: false },
            { name: '📝 Motivo da Revisão', value: report.revisaoMotivo, inline: false },
            { name: '🔗 Provas da Revisão', value: report.revisaoLinkProvas, inline: false },
        );

    // Contexto completo da denúncia original
    embed.addFields(
        { name: '\u200b', value: '━━━ **📋 Denúncia Original** ━━━', inline: false },
        { name: '👤 Denunciante', value: `\`${report.userTag}\``, inline: true },
        { name: '📊 Decisão', value: statusLabels[report.status] || report.status, inline: true },
        { name: '🆔 ID do Infrator', value: `\`${report.idInfrator}\``, inline: true },
        { name: '📝 Motivo Original', value: report.motivo, inline: false },
        { name: '🔗 Provas Originais', value: report.linkProvas, inline: false },
    );

    // Se a denúncia já teve decisão, mostrar
    if (report.staffReason) {
        embed.addFields(
            { name: `${report.status === 'aprovada' ? '✅' : '❌'} Decisão da Staff`, value: report.staffReason, inline: false },
            { name: '👮 Resolvido por', value: `\`${report.resolvedTag}\``, inline: true },
        );
    }

    embed.addFields(
        { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
        { name: '📅 Revisão aberta em', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
    );

    embed.setFooter({ text: `Detroit Roleplay • ${report.code} • Revisão` })
        .setTimestamp();

    return embed;
}

function buildStaffButtons(code, type) {
    const suffix = type === 'revisao' ? 'rev' : 'den';
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`btn_aceitar_${suffix}_${code}`)
            .setLabel(type === 'revisao' ? 'Aceitar Revisão' : 'Aceitar Denúncia')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        new ButtonBuilder()
            .setCustomId(`btn_negar_${suffix}_${code}`)
            .setLabel(type === 'revisao' ? 'Negar Revisão' : 'Negar Denúncia')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌'),
    );
}

// ═══════════════════════════════════════════════════════════════
// HANDLER: MODAL DENÚNCIA SUBMIT
// ═══════════════════════════════════════════════════════════════
async function handleDenunciaModal(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const idInfrator = interaction.fields.getTextInputValue('id_infrator');
        const motivo = interaction.fields.getTextInputValue('motivo_denuncia');
        const linkProvas = interaction.fields.getTextInputValue('link_provas');

        // Validar link do YouTube
        if (!isYoutubeLink(linkProvas)) {
            return interaction.editReply({
                content: '❌ O link das provas deve ser um link válido do YouTube!',
            });
        }

        // Gerar código alfanumérico único
        const code = await generateUniqueCode();

        const reportData = {
            code,
            userId: interaction.user.id,
            userTag: interaction.user.username,
            idInfrator,
            motivo,
            linkProvas,
        };

        // Salvar no banco de dados
        await saveReport(reportData);

        // Enviar para o canal de denúncias
        if (config.denunciasChannelId) {
            const denunciasChannel = interaction.guild.channels.cache.get(config.denunciasChannelId);
            if (denunciasChannel) {
                const staffEmbed = buildDenunciaStaffEmbed(reportData, interaction.user);
                const staffButtons = buildStaffButtons(code, 'denuncia');

                const staffMsg = await denunciasChannel.send({
                    embeds: [staffEmbed],
                    components: [staffButtons],
                });

                await saveMessageId(code, staffMsg.id);
            }
        }

        // Resposta privada ao usuário
        const responseEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Denúncia Registrada com Sucesso')
            .setDescription(
                `Sua denúncia foi enviada para a equipe de administração.\n\n` +
                `**Código do Caso:**\n# \`${code}\`\n\n` +
                `> 📋 Guarde este código! Use o botão **"Consultar Código"** para verificar o status.\n` +
                `> ⚠️ Se desejar revisar a punição, use o botão **"Revisar Punição"** com este mesmo código.`
            )
            .addFields(
                { name: '🆔 ID do Infrator', value: `\`${idInfrator}\``, inline: true },
                { name: '📊 Status', value: '🟡 Pendente', inline: true },
            )
            .setFooter({ text: `Detroit Roleplay • ${code}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [responseEmbed] });
    } catch (error) {
        console.error('Erro ao processar denúncia:', error);
        await interaction.editReply({
            content: '❌ Ocorreu um erro ao registrar sua denúncia. Tente novamente.',
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER: MODAL REVISÃO SUBMIT
// ═══════════════════════════════════════════════════════════════
async function handleRevisaoModal(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const codigoInput = interaction.fields.getTextInputValue('codigo').trim().toUpperCase();
        const motivoRevisao = interaction.fields.getTextInputValue('motivo_revisao');
        const linkProvas = interaction.fields.getTextInputValue('link_provas');

        if (!isYoutubeLink(linkProvas)) {
            return interaction.editReply({
                content: '❌ O link das provas deve ser um link válido do YouTube!',
            });
        }

        // Buscar o caso original
        const report = await findReport(codigoInput);

        if (!report) {
            return interaction.editReply({
                content: `❌ O código **\`${codigoInput}\`** não foi encontrado no sistema.\n\nVerifique se digitou corretamente (ex: \`DR-4AK7X\`).`,
            });
        }

        // Verificar se já existe revisão aberta
        if (report.hasRevisao) {
            const statusLabels = {
                'pendente': '🟡 Pendente',
                'aprovada': '🟢 Aprovada',
                'negada': '🔴 Negada',
            };
            return interaction.editReply({
                content: `❌ Já existe uma revisão aberta para o caso **\`${codigoInput}\`**.\n\nStatus atual da revisão: **${statusLabels[report.revisaoStatus] || report.revisaoStatus}**`,
            });
        }

        // Salvar revisão no mesmo registro
        await saveRevisao(codigoInput, {
            userId: interaction.user.id,
            userTag: interaction.user.username,
            motivo: motivoRevisao,
            linkProvas,
        });

        // Recarregar report com dados atualizados
        const updatedReport = await findReport(codigoInput);

        // Enviar para o canal de denúncias com contexto completo
        if (config.denunciasChannelId) {
            const denunciasChannel = interaction.guild.channels.cache.get(config.denunciasChannelId);
            if (denunciasChannel) {
                const staffEmbed = buildRevisaoStaffEmbed(updatedReport, interaction.user);
                const staffButtons = buildStaffButtons(codigoInput, 'revisao');

                const staffMsg = await denunciasChannel.send({
                    embeds: [staffEmbed],
                    components: [staffButtons],
                });

                await saveRevisaoMessageId(codigoInput, staffMsg.id);
            }
        }

        // Resposta privada ao usuário
        const responseEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Revisão Registrada com Sucesso')
            .setDescription(
                `Sua solicitação de revisão foi enviada para a equipe.\n\n` +
                `**Código do Caso:**\n# \`${codigoInput}\`\n\n` +
                `> 📋 Use o mesmo código para consultar. A equipe irá reanalisar o caso.`
            )
            .addFields(
                { name: '🔑 Caso', value: `\`${codigoInput}\``, inline: true },
                { name: '📊 Status', value: '🟡 Pendente', inline: true },
            )
            .setFooter({ text: `Detroit Roleplay • ${codigoInput}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [responseEmbed] });
    } catch (error) {
        console.error('Erro ao processar revisão:', error);
        await interaction.editReply({
            content: '❌ Ocorreu um erro ao registrar sua revisão. Tente novamente.',
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER: STAFF CLICA ACEITAR/NEGAR (abre modal de motivo)
// ═══════════════════════════════════════════════════════════════
async function handleAceitarNegar(interaction) {
    const customId = interaction.customId;

    // Verificar se é staff
    if (config.staffRoleId && !interaction.member.roles.cache.has(config.staffRoleId)) {
        return interaction.reply({
            content: '❌ Apenas membros da equipe podem aceitar/negar.',
            ephemeral: true,
        });
    }

    // Extrair: btn_aceitar_den_DR-4AK7X ou btn_negar_rev_DR-4AK7X
    const isAceitar = customId.startsWith('btn_aceitar_');
    const rest = customId.replace('btn_aceitar_', '').replace('btn_negar_', '');
    const isRevisao = rest.startsWith('rev_');
    const code = rest.replace('den_', '').replace('rev_', '');
    const targetType = isRevisao ? 'revisao' : 'denuncia';

    // Verificar se existe
    const report = await findReport(code);
    if (!report) {
        return interaction.reply({
            content: `❌ Caso \`${code}\` não encontrado.`,
            ephemeral: true,
        });
    }

    // Verificar se já foi resolvido
    const currentStatus = isRevisao ? report.revisaoStatus : report.status;
    if (currentStatus !== 'pendente') {
        const statusLabels = {
            'aprovada': '🟢 Aprovada',
            'negada': '🔴 Negada',
        };
        return interaction.reply({
            content: `❌ ${isRevisao ? 'Esta revisão' : 'Esta denúncia'} já foi resolvida. Status: **${statusLabels[currentStatus] || currentStatus}**`,
            ephemeral: true,
        });
    }

    // Abrir modal pedindo o motivo
    const action = isAceitar ? 'aceitar' : 'negar';
    const typeLabel = isRevisao ? 'Revisão' : 'Denúncia';

    const modal = new ModalBuilder()
        .setCustomId(`modal_${action}_${targetType === 'revisao' ? 'rev' : 'den'}_${code}`)
        .setTitle(`${isAceitar ? '✅' : '❌'} ${isAceitar ? 'Aceitar' : 'Negar'} ${typeLabel}`);

    const motivoInput = new TextInputBuilder()
        .setCustomId('motivo_decisao')
        .setLabel(`Motivo para ${action} a ${typeLabel.toLowerCase()}:`)
        .setPlaceholder(`Escreva o motivo...`)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(1024);

    modal.addComponents(
        new ActionRowBuilder().addComponents(motivoInput),
    );

    await interaction.showModal(modal);
}

// ═══════════════════════════════════════════════════════════════
// HANDLER: MODAL ACEITAR/NEGAR SUBMIT (processa decisão)
// ═══════════════════════════════════════════════════════════════
async function handleAceitarNegarModal(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const customId = interaction.customId;
        // modal_aceitar_den_DR-4AK7X ou modal_negar_rev_DR-4AK7X
        const isAceitar = customId.startsWith('modal_aceitar_');
        const rest = customId.replace('modal_aceitar_', '').replace('modal_negar_', '');
        const isRevisao = rest.startsWith('rev_');
        const code = rest.replace('den_', '').replace('rev_', '');
        const motivo = interaction.fields.getTextInputValue('motivo_decisao');

        const report = await findReport(code);
        if (!report) {
            return interaction.editReply(`❌ Caso \`${code}\` não encontrado.`);
        }

        const currentStatus = isRevisao ? report.revisaoStatus : report.status;
        if (currentStatus !== 'pendente') {
            return interaction.editReply(`❌ ${isRevisao ? 'Esta revisão' : 'Esta denúncia'} já foi resolvida.`);
        }

        const newStatus = isAceitar ? 'aprovada' : 'negada';
        const staffId = interaction.user.id;
        const staffTag = interaction.user.username;

        // Atualizar no banco
        if (isRevisao) {
            await updateRevisaoStatus(code, newStatus, staffId, staffTag, motivo);
        } else {
            await updateDenunciaStatus(code, newStatus, staffId, staffTag, motivo);
        }

        // Atualizar embed original no canal de denúncias
        const msgId = isRevisao ? report.revisaoMessageId : report.messageId;
        if (config.denunciasChannelId && msgId) {
            try {
                const denunciasChannel = interaction.guild.channels.cache.get(config.denunciasChannelId);
                if (denunciasChannel) {
                    const originalMsg = await denunciasChannel.messages.fetch(msgId);
                    if (originalMsg) {
                        const oldEmbed = originalMsg.embeds[0];
                        const updatedEmbed = EmbedBuilder.from(oldEmbed)
                            .setColor(isAceitar ? config.colors.success : config.colors.danger);

                        // Atualizar campo de status (índice 1)
                        updatedEmbed.spliceFields(1, 1, {
                            name: isRevisao ? '📊 Status da Revisão' : '📊 Status',
                            value: isAceitar ? '🟢 Aprovada' : '🔴 Negada',
                            inline: true,
                        });

                        // Adicionar decisão
                        updatedEmbed.addFields(
                            { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
                            { name: `${isAceitar ? '✅' : '❌'} Decisão da Staff`, value: motivo, inline: false },
                            { name: '👮 Resolvido por', value: `${interaction.user} (\`${staffTag}\`)`, inline: true },
                            { name: '📅 Resolvido em', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        );

                        // Desativar botões
                        const suffix = isRevisao ? 'rev' : 'den';
                        const disabledButtons = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`btn_aceitar_${suffix}_${code}`)
                                .setLabel(isRevisao ? 'Aceitar Revisão' : 'Aceitar Denúncia')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('✅')
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId(`btn_negar_${suffix}_${code}`)
                                .setLabel(isRevisao ? 'Negar Revisão' : 'Negar Denúncia')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('❌')
                                .setDisabled(true),
                        );

                        await originalMsg.edit({
                            embeds: [updatedEmbed],
                            components: [disabledButtons],
                        });
                    }
                }
            } catch (e) {
                console.error('Erro ao atualizar embed:', e);
            }
        }

        // Enviar DM ao envolvido
        try {
            const targetUserId = isRevisao ? report.revisaoUserId : report.userId;
            const targetUser = await interaction.client.users.fetch(targetUserId);
            if (targetUser) {
                const typeLabel = isRevisao ? 'Revisão' : 'Denúncia';
                const dmEmbed = new EmbedBuilder()
                    .setColor(isAceitar ? config.colors.success : config.colors.danger)
                    .setTitle(`${isAceitar ? '✅' : '❌'} Sua ${typeLabel} foi ${isAceitar ? 'Aceita' : 'Negada'}`)
                    .setDescription(
                        `O caso **\`${code}\`** foi analisado pela equipe.\n\n` +
                        `**Decisão:** ${isAceitar ? '🟢 Aprovada' : '🔴 Negada'}\n` +
                        `**Motivo da Staff:**\n> ${motivo}`
                    )
                    .addFields(
                        { name: '👮 Resolvido por', value: `\`${staffTag}\``, inline: true },
                        { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    )
                    .setFooter({ text: `Detroit Roleplay • ${code}` })
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            }
        } catch (e) {
            console.error('Não foi possível enviar DM:', e.message);
        }

        // Feedback para o staff
        const typeLabel = isRevisao ? 'Revisão' : 'Denúncia';
        const actionLabel = isAceitar ? 'aceita' : 'negada';
        await interaction.editReply(
            `✅ ${typeLabel} do caso **\`${code}\`** foi **${actionLabel}** com sucesso. O usuário foi notificado via DM.`
        );

    } catch (error) {
        console.error('Erro ao processar decisão:', error);
        await interaction.editReply('❌ Ocorreu um erro ao processar a decisão. Tente novamente.');
    }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER: MODAL CONSULTAR SUBMIT
// ═══════════════════════════════════════════════════════════════
async function handleConsultaModal(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const codigoInput = interaction.fields.getTextInputValue('codigo_consulta').trim().toUpperCase();

        const report = await findReport(codigoInput);

        if (!report) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('❌ Código Não Encontrado')
                .setDescription(
                    `O código **\`${codigoInput}\`** não foi encontrado no sistema.\n\n` +
                    `Verifique se digitou corretamente.\n` +
                    `Os códigos seguem o formato: \`DR-XXXXX\``
                )
                .setFooter({ text: 'Detroit Roleplay' })
                .setTimestamp();

            return interaction.editReply({ embeds: [notFoundEmbed] });
        }

        // Formatar status
        const statusLabels = {
            'pendente': '🟡 Pendente',
            'em_analise': '🔵 Em Análise',
            'aprovada': '🟢 Aprovada',
            'negada': '🔴 Negada',
            'concluida': '✅ Concluída',
        };

        const createdTimestamp = Math.floor(new Date(report.createdAt).getTime() / 1000);

        const resultEmbed = new EmbedBuilder()
            .setColor(report.status === 'pendente' ? config.colors.warning :
                       report.status === 'aprovada' || report.status === 'concluida' ? config.colors.success :
                       report.status === 'negada' ? config.colors.danger : config.colors.info)
            .setTitle(`🔍 Caso: \`${report.code}\``)
            .addFields(
                { name: '🔑 Código', value: `\`${report.code}\``, inline: true },
                { name: '📊 Status da Denúncia', value: statusLabels[report.status] || report.status, inline: true },
                { name: '📅 Abertura', value: `<t:${createdTimestamp}:F>`, inline: false },
                { name: '🆔 ID do Infrator', value: `\`${report.idInfrator}\``, inline: true },
                { name: '📝 Motivo', value: report.motivo, inline: false },
                { name: '🔗 Provas', value: report.linkProvas, inline: false },
            );

        // Mostrar decisão da denúncia
        if (report.staffReason) {
            const resolvedTimestamp = report.resolvedAt ? Math.floor(new Date(report.resolvedAt).getTime() / 1000) : null;
            resultEmbed.addFields(
                { name: `${report.status === 'aprovada' ? '✅' : '❌'} Decisão da Staff`, value: report.staffReason, inline: false },
                { name: '👮 Resolvido por', value: `\`${report.resolvedTag}\``, inline: true },
            );
            if (resolvedTimestamp) {
                resultEmbed.addFields(
                    { name: '📅 Resolvido em', value: `<t:${resolvedTimestamp}:F>`, inline: true },
                );
            }
        }

        // Mostrar revisão se existir
        if (report.hasRevisao) {
            const revTimestamp = report.revisaoCreatedAt ? Math.floor(new Date(report.revisaoCreatedAt).getTime() / 1000) : null;

            resultEmbed.addFields(
                { name: '\u200b', value: '━━━ **⚠️ Revisão** ━━━', inline: false },
                { name: '📊 Status da Revisão', value: statusLabels[report.revisaoStatus] || report.revisaoStatus || '🟡 Pendente', inline: true },
                { name: '👤 Solicitante', value: `\`${report.revisaoUserTag}\``, inline: true },
                { name: '📝 Motivo da Revisão', value: report.revisaoMotivo, inline: false },
                { name: '🔗 Provas da Revisão', value: report.revisaoLinkProvas, inline: false },
            );

            if (revTimestamp) {
                resultEmbed.addFields(
                    { name: '📅 Revisão aberta em', value: `<t:${revTimestamp}:F>`, inline: false },
                );
            }

            // Decisão da revisão
            if (report.revisaoStaffReason) {
                const revResolvedTimestamp = report.revisaoResolvedAt ? Math.floor(new Date(report.revisaoResolvedAt).getTime() / 1000) : null;
                resultEmbed.addFields(
                    { name: `${report.revisaoStatus === 'aprovada' ? '✅' : '❌'} Decisão da Revisão`, value: report.revisaoStaffReason, inline: false },
                    { name: '👮 Resolvido por', value: `\`${report.revisaoResolvedTag}\``, inline: true },
                );
                if (revResolvedTimestamp) {
                    resultEmbed.addFields(
                        { name: '📅 Resolvido em', value: `<t:${revResolvedTimestamp}:F>`, inline: true },
                    );
                }
            }

            resultEmbed.addFields(
                { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
            );
        }

        resultEmbed.setFooter({ text: `Detroit Roleplay • ${report.code}` });
        resultEmbed.setTimestamp();

        await interaction.editReply({ embeds: [resultEmbed] });

    } catch (error) {
        console.error('Erro ao processar consulta:', error);
        await interaction.editReply({
            content: '❌ Ocorreu um erro ao processar sua consulta. Tente novamente.',
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
function isYoutubeLink(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
    return youtubeRegex.test(url);
}

module.exports = {
    handleDenunciaButton,
    handleDenunciaModal,
    handleRevisaoModal,
    handleConsultaModal,
    handleAceitarNegar,
    handleAceitarNegarModal,
};
