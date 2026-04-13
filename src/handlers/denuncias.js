const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
} = require('discord.js');
const config = require('../config');
const { query, getNextCount } = require('../utils/database');

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE BANCO DE DADOS
// ═══════════════════════════════════════════════════════════════

async function generateCode(type) {
    const num = await getNextCount(type);
    const prefix = type === 'denuncia' ? 'DEN' : 'REV';
    return `${prefix}-${String(num).padStart(4, '0')}`;
}

async function saveReport(report) {
    await query(
        `INSERT INTO reports (code, type, user_id, user_tag, id_infrator, motivo, codigo_original, motivo_revisao, link_provas, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            report.code,
            report.type,
            report.userId,
            report.userTag,
            report.idInfrator || null,
            report.motivo || null,
            report.codigoOriginal || null,
            report.motivoRevisao || null,
            report.linkProvas || null,
            report.status || 'pendente',
        ]
    );
}

async function findReport(code) {
    const rows = await query('SELECT * FROM reports WHERE code = ?', [code.toUpperCase()]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
        code: row.code,
        type: row.type,
        userId: row.user_id,
        userTag: row.user_tag,
        idInfrator: row.id_infrator,
        motivo: row.motivo,
        codigoOriginal: row.codigo_original,
        motivoRevisao: row.motivo_revisao,
        linkProvas: row.link_provas,
        status: row.status,
        createdAt: row.created_at,
    };
}

// ═══════════════════════════════════════════════════════════════
// HANDLER DOS BOTÕES
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
        .setTitle('⚠️ Recorrendo Punição');

    const codigo = new TextInputBuilder()
        .setCustomId('codigo')
        .setLabel('Código')
        .setPlaceholder('Digite o código único de denúncia')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

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
        .setLabel('Código da Punição')
        .setPlaceholder('Ex: DEN-0001 ou REV-0001')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

    modal.addComponents(
        new ActionRowBuilder().addComponents(codigo),
    );

    await interaction.showModal(modal);
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

        // Gerar código único (atômico via MySQL)
        const code = await generateCode('denuncia');

        // Salvar no banco de dados MySQL
        await saveReport({
            code,
            type: 'denuncia',
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            idInfrator,
            motivo,
            linkProvas,
            status: 'pendente',
        });

        // Enviar para o canal de logs
        if (config.logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('📢 Nova Denúncia Registrada')
                    .addFields(
                        { name: '🔑 Código', value: `\`${code}\``, inline: true },
                        { name: '📊 Status', value: '🟡 Pendente', inline: true },
                        { name: '👤 Denunciante', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: false },
                        { name: '🆔 ID do Infrator', value: `\`${idInfrator}\``, inline: true },
                        { name: '📝 Motivo', value: motivo, inline: false },
                        { name: '🔗 Link das Provas', value: linkProvas, inline: false },
                        { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    )
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Detroit Roleplay • Denúncias • ${code}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // Resposta privada ao usuário com o código
        const responseEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Denúncia Registrada com Sucesso')
            .setDescription(
                `Sua denúncia foi enviada para a equipe de administração.\n\n` +
                `**Código de Acompanhamento:**\n# \`${code}\`\n\n` +
                `> 📋 Guarde este código! Use o botão **"Consultar Código"** para verificar o status da sua denúncia.\n\n` +
                `A equipe irá analisar as provas e tomar as providências cabíveis.`
            )
            .addFields(
                { name: '🆔 ID do Infrator', value: `\`${idInfrator}\``, inline: true },
                { name: '📊 Status', value: '🟡 Pendente', inline: true },
            )
            .setFooter({ text: 'Detroit Roleplay • Denúncias' })
            .setTimestamp();

        await interaction.editReply({
            embeds: [responseEmbed],
        });
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
        const codigoOriginal = interaction.fields.getTextInputValue('codigo');
        const motivoRevisao = interaction.fields.getTextInputValue('motivo_revisao');
        const linkProvas = interaction.fields.getTextInputValue('link_provas');

        if (!isYoutubeLink(linkProvas)) {
            return interaction.editReply({
                content: '❌ O link das provas deve ser um link válido do YouTube!',
            });
        }

        // Gerar código único para a revisão (atômico via MySQL)
        const code = await generateCode('revisao');

        // Salvar no banco de dados MySQL
        await saveReport({
            code,
            type: 'revisao',
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            codigoOriginal,
            motivoRevisao,
            linkProvas,
            status: 'pendente',
        });

        // Enviar para o canal de logs
        if (config.logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('⚠️ Nova Revisão de Punição')
                    .addFields(
                        { name: '🔑 Código da Revisão', value: `\`${code}\``, inline: true },
                        { name: '📊 Status', value: '🟡 Pendente', inline: true },
                        { name: '👤 Solicitante', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: false },
                        { name: '🔑 Código Original', value: `\`${codigoOriginal}\``, inline: true },
                        { name: '📝 Motivo da Revisão', value: motivoRevisao, inline: false },
                        { name: '🔗 Link das Provas', value: linkProvas, inline: false },
                        { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    )
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Detroit Roleplay • Revisões • ${code}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // Resposta privada ao usuário com o código
        const responseEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Revisão Registrada com Sucesso')
            .setDescription(
                `Sua solicitação de revisão foi enviada para a equipe.\n\n` +
                `**Código de Acompanhamento:**\n# \`${code}\`\n\n` +
                `> 📋 Guarde este código! Use o botão **"Consultar Código"** para verificar o status da sua revisão.\n\n` +
                `A equipe irá reanalisar o caso e responder o mais breve possível.`
            )
            .addFields(
                { name: '🔑 Código Original', value: `\`${codigoOriginal}\``, inline: true },
                { name: '📊 Status', value: '🟡 Pendente', inline: true },
            )
            .setFooter({ text: 'Detroit Roleplay • Revisões' })
            .setTimestamp();

        await interaction.editReply({
            embeds: [responseEmbed],
        });
    } catch (error) {
        console.error('Erro ao processar revisão:', error);
        await interaction.editReply({
            content: '❌ Ocorreu um erro ao registrar sua revisão. Tente novamente.',
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER: MODAL CONSULTAR SUBMIT
// ═══════════════════════════════════════════════════════════════
async function handleConsultaModal(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const codigoInput = interaction.fields.getTextInputValue('codigo_consulta').trim().toUpperCase();

        // Buscar no banco de dados MySQL
        const report = await findReport(codigoInput);

        if (!report) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('❌ Código Não Encontrado')
                .setDescription(
                    `O código **\`${codigoInput}\`** não foi encontrado no sistema.\n\n` +
                    `Verifique se digitou corretamente.\n` +
                    `Os códigos seguem o formato: \`DEN-0001\` ou \`REV-0001\``
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

        const typeLabels = {
            'denuncia': '📢 Denúncia',
            'revisao': '⚠️ Revisão de Punição',
        };

        const createdDate = new Date(report.createdAt);
        const timestamp = Math.floor(createdDate.getTime() / 1000);

        const resultEmbed = new EmbedBuilder()
            .setColor(report.status === 'pendente' ? config.colors.warning :
                       report.status === 'aprovada' || report.status === 'concluida' ? config.colors.success :
                       report.status === 'negada' ? config.colors.danger : config.colors.info)
            .setTitle(`🔍 Consulta: \`${report.code}\``)
            .addFields(
                { name: '🔑 Código', value: `\`${report.code}\``, inline: true },
                { name: '📋 Tipo', value: typeLabels[report.type] || report.type, inline: true },
                { name: '📊 Status', value: statusLabels[report.status] || report.status, inline: true },
                { name: '📅 Data de Abertura', value: `<t:${timestamp}:F>`, inline: false },
            );

        // Campos extras baseados no tipo
        if (report.type === 'denuncia') {
            resultEmbed.addFields(
                { name: '🆔 ID do Infrator', value: `\`${report.idInfrator}\``, inline: true },
            );
        }
        if (report.type === 'revisao') {
            resultEmbed.addFields(
                { name: '🔑 Código Original', value: `\`${report.codigoOriginal}\``, inline: true },
            );
        }

        resultEmbed.setFooter({ text: 'Detroit Roleplay • Consulta de Código' });
        resultEmbed.setTimestamp();

        await interaction.editReply({ embeds: [resultEmbed] });

        // Logar a consulta
        if (config.logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setTitle('🔍 Consulta de Código')
                    .addFields(
                        { name: '👤 Usuário', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
                        { name: '🔑 Código', value: `\`${codigoInput}\``, inline: true },
                        { name: '📊 Resultado', value: report ? 'Encontrado' : 'Não encontrado', inline: true },
                    )
                    .setFooter({ text: 'Detroit Roleplay • Consultas' })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

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
};
