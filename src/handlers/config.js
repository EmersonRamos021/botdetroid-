const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder,
} = require('discord.js');
const config = require('../config');
const { saveSetting, getSetting, getSettings, removeSetting } = require('../utils/settings');

// ═══════════════════════════════════════════════════════════════
// CONSTRUIR PAINEL DE CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════
function buildConfigPanel(guild) {
    const settings = getSettings();

    // Status de cada configuração
    const guildConfigured = settings.guildId || process.env.GUILD_ID;
    const categoryConfigured = settings.ticketCategoryId || process.env.TICKET_CATEGORY_ID;
    const logConfigured = settings.logChannelId || process.env.LOG_CHANNEL_ID;
    const staffConfigured = settings.staffRoleId || process.env.STAFF_ROLE_ID;
    const permanentConfigured = settings.permanentCategoryId;
    const denunciasConfigured = settings.denunciasChannelId;
    const autoRoleConfigured = settings.autoRoleId || process.env.AUTO_ROLE_ID;
    const automodLogConfigured = settings.automodLogChannelId || process.env.AUTOMOD_LOG_CHANNEL_ID;
    const linkFilterEnabled = settings.linkFilterEnabled === 'true';

    // Verificar nomes dos canais/cargos do servidor
    let categoryName = '`Não configurado`';
    let logName = '`Não configurado`';
    let staffName = '`Não configurado`';
    let guildName = '`Não configurado`';
    let permanentName = '`Não configurado`';
    let denunciasName = '`Não configurado`';
    let autoRoleName = '`Não configurado`';
    let automodLogName = '`Não configurado`';

    if (guild) {
        if (guildConfigured) {
            guildName = `\`${guild.name}\` (\`${guild.id}\`)`;
        }
        if (categoryConfigured) {
            const ch = guild.channels.cache.get(categoryConfigured);
            categoryName = ch ? `<#${ch.id}> (\`${ch.name}\`)` : `\`ID: ${categoryConfigured}\``;
        }
        if (logConfigured) {
            const ch = guild.channels.cache.get(logConfigured);
            logName = ch ? `<#${ch.id}>` : `\`ID: ${logConfigured}\``;
        }
        if (staffConfigured) {
            const role = guild.roles.cache.get(staffConfigured);
            staffName = role ? `<@&${role.id}>` : `\`ID: ${staffConfigured}\``;
        }
        if (permanentConfigured) {
            const ch = guild.channels.cache.get(permanentConfigured);
            permanentName = ch ? `<#${ch.id}> (\`${ch.name}\`)` : `\`ID: ${permanentConfigured}\``;
        }
        if (denunciasConfigured) {
            const ch = guild.channels.cache.get(denunciasConfigured);
            denunciasName = ch ? `<#${ch.id}>` : `\`ID: ${denunciasConfigured}\``;
        }
        if (autoRoleConfigured) {
            const role = guild.roles.cache.get(autoRoleConfigured);
            autoRoleName = role ? `<@&${role.id}>` : `\`ID: ${autoRoleConfigured}\``;
        }
        if (automodLogConfigured) {
            const ch = guild.channels.cache.get(automodLogConfigured);
            automodLogName = ch ? `<#${ch.id}>` : `\`ID: ${automodLogConfigured}\``;
        }
    }

    // Contar configurações prontas
    const configured = [guildConfigured, categoryConfigured, logConfigured, staffConfigured, permanentConfigured, denunciasConfigured, autoRoleConfigured, automodLogConfigured].filter(Boolean).length;
    const total = 8;
    const allConfigured = configured === total;

    // Barra de progresso visual
    const progressFilled = '🟥'.repeat(configured);
    const progressEmpty = '⬛'.repeat(total - configured);
    const progressBar = progressFilled + progressEmpty;

    // Status geral
    let statusText;
    let statusEmoji;
    if (allConfigured) {
        statusText = 'Todas as configurações estão prontas!';
        statusEmoji = '✅';
    } else if (configured > 0) {
        statusText = `${configured}/${total} configurações definidas.`;
        statusEmoji = '⚠️';
    } else {
        statusText = 'Nenhuma configuração definida.';
        statusEmoji = '❌';
    }

    const embed = new EmbedBuilder()
        .setColor(allConfigured ? config.colors.success : config.colors.primary)
        .setTitle('⚙️ Painel de Configuração')
        .setDescription(
            `Configure o bot **Detroit Roleplay** diretamente aqui.\n` +
            `Clique nos botões abaixo para definir cada configuração.\n\n` +
            `${progressBar}  ${configured}/${total}`
        )
        .addFields(
            {
                name: `${guildConfigured ? '✅' : '❌'}  🏠 Servidor`,
                value: guildName,
                inline: false,
            },
            {
                name: `${categoryConfigured ? '✅' : '❌'}  📁 Categoria de Tickets`,
                value: categoryName,
                inline: false,
            },
            {
                name: `${logConfigured ? '✅' : '❌'}  📝 Canal de Logs`,
                value: logName,
                inline: false,
            },
            {
                name: `${staffConfigured ? '✅' : '❌'}  👥 Cargo Staff`,
                value: staffName,
                inline: false,
            },
            {
                name: `${permanentConfigured ? '✅' : '❌'}  📌 Cat. Suporte Permanente`,
                value: permanentName,
                inline: false,
            },
            {
                name: `${denunciasConfigured ? '✅' : '❌'}  📢 Canal de Denúncias`,
                value: denunciasName,
                inline: false,
            },
            {
                name: `${autoRoleConfigured ? '✅' : '❌'}  ➕ Auto Role (Cargo)`,
                value: autoRoleName,
                inline: false,
            },
            {
                name: `${linkFilterEnabled ? '✅' : '❌'}  🔗 Filtro de Links`,
                value: linkFilterEnabled ? '`Ativado` — Links de outros servidores serão bloqueados' : '`Desativado`',
                inline: false,
            },
            {
                name: `${automodLogConfigured ? '✅' : '❌'}  🛡️ Canal de Auto-Moderação`,
                value: automodLogName,
                inline: false,
            },
            {
                name: '\u200b',
                value: `${statusEmoji} **Status:** ${statusText}`,
                inline: false,
            }
        )
        .setFooter({ text: 'Detroit Roleplay • Configurações' })
        .setTimestamp();

    // Botões de configuração
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('cfg_guild')
            .setLabel('Servidor')
            .setEmoji('🏠')
            .setStyle(guildConfigured ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cfg_category')
            .setLabel('Categoria de Tickets')
            .setEmoji('📁')
            .setStyle(categoryConfigured ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cfg_log')
            .setLabel('Canal de Logs')
            .setEmoji('📝')
            .setStyle(logConfigured ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cfg_staff')
            .setLabel('Cargo Staff')
            .setEmoji('👥')
            .setStyle(staffConfigured ? ButtonStyle.Success : ButtonStyle.Danger),
    );

    // Segunda row com ações extras e o permanente
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('cfg_permanent')
            .setLabel('Cat. Permanente')
            .setEmoji('📌')
            .setStyle(permanentConfigured ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cfg_denuncias')
            .setLabel('Canal Denúncias')
            .setEmoji('📢')
            .setStyle(denunciasConfigured ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cfg_autorole')
            .setLabel('Auto Role')
            .setEmoji('➕')
            .setStyle(autoRoleConfigured ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cfg_reset')
            .setLabel('Resetar Tudo')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cfg_refresh')
            .setLabel('Atualizar')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary),
    );

    // Terceira row: toggles
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('cfg_automod')
            .setLabel('Logs Auto-Mod')
            .setEmoji('🛡️')
            .setStyle(automodLogConfigured ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cfg_linkfilter')
            .setLabel(linkFilterEnabled ? 'Desativar Filtro Links' : 'Ativar Filtro Links')
            .setEmoji('🔗')
            .setStyle(linkFilterEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('cfg_badwords_menu')
            .setLabel('Gerenciar Palavras')
            .setEmoji('🤬')
            .setStyle(ButtonStyle.Primary),
    );

    return { embed, components: [row1, row2, row3] };
}

// ═══════════════════════════════════════════════════════════════
// HANDLER DE BOTÕES DO CONFIG
// ═══════════════════════════════════════════════════════════════
async function handleConfigButton(interaction) {
    const customId = interaction.customId;

    // ── Auto-detectar servidor ──
    if (customId === 'cfg_guild') {
        await saveSetting('guildId', interaction.guild.id);

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    // ── Categoria de tickets → mostrar channel select ──
    if (customId === 'cfg_category') {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId('cfg_select_category')
            .setPlaceholder('📁 Selecione a categoria para os tickets')
            .setChannelTypes(ChannelType.GuildCategory)
            .setMinValues(1)
            .setMaxValues(1);

        const backBtn = new ButtonBuilder()
            .setCustomId('cfg_back')
            .setLabel('Voltar')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(backBtn);

        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📁 Selecionar Categoria de Tickets')
            .setDescription(
                'Selecione a **categoria de canais** onde os tickets serão criados.\n\n' +
                '> 💡 Dica: Crie uma categoria chamada "Tickets" ou "Atendimento" no seu servidor antes de selecionar.'
            )
            .setFooter({ text: 'Detroit Roleplay • Configurações' });

        await interaction.update({
            embeds: [infoEmbed],
            components: [selectRow, btnRow],
        });
        return;
    }

    // ── Canal de Logs → mostrar channel select ──
    if (customId === 'cfg_log') {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId('cfg_select_log')
            .setPlaceholder('📝 Selecione o canal de logs')
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1);

        const backBtn = new ButtonBuilder()
            .setCustomId('cfg_back')
            .setLabel('Voltar')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(backBtn);

        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📝 Selecionar Canal de Logs')
            .setDescription(
                'Selecione o **canal de texto** onde os logs de tickets serão enviados.\n\n' +
                '> 💡 Dica: Use um canal privado que apenas a administração tenha acesso, como `#logs-tickets`.'
            )
            .setFooter({ text: 'Detroit Roleplay • Configurações' });

        await interaction.update({
            embeds: [infoEmbed],
            components: [selectRow, btnRow],
        });
        return;
    }

    // ── Cargo Staff → mostrar role select ──
    if (customId === 'cfg_staff') {
        const selectMenu = new RoleSelectMenuBuilder()
            .setCustomId('cfg_select_staff')
            .setPlaceholder('👥 Selecione o cargo da equipe')
            .setMinValues(1)
            .setMaxValues(1);

        const backBtn = new ButtonBuilder()
            .setCustomId('cfg_back')
            .setLabel('Voltar')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(backBtn);

        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('👥 Selecionar Cargo Staff')
            .setDescription(
                'Selecione o **cargo** da equipe que poderá ver e gerenciar os tickets.\n\n' +
                '> 💡 Dica: Selecione o cargo principal da sua equipe de suporte ou administração.'
            )
            .setFooter({ text: 'Detroit Roleplay • Configurações' });

        await interaction.update({
            embeds: [infoEmbed],
            components: [selectRow, btnRow],
        });
        return;
    }

    // ── Auto Role → mostrar role select ──
    if (customId === 'cfg_autorole') {
        const selectMenu = new RoleSelectMenuBuilder()
            .setCustomId('cfg_select_autorole')
            .setPlaceholder('➕ Selecione o cargo automático')
            .setMinValues(1)
            .setMaxValues(1);

        const backBtn = new ButtonBuilder()
            .setCustomId('cfg_back')
            .setLabel('Voltar')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(backBtn);

        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('➕ Selecionar Auto Role')
            .setDescription(
                'Selecione o **cargo** que será dado automaticamente a novos membros que entrarem no servidor.\n\n' +
                '> 💡 Dica: Selecione um cargo como `Membro` ou `Cidadão`.'
            )
            .setFooter({ text: 'Detroit Roleplay • Configurações' });

        await interaction.update({
            embeds: [infoEmbed],
            components: [selectRow, btnRow],
        });
        return;
    }

    // ── Cat. Permanente → mostrar channel select ──
    if (customId === 'cfg_permanent') {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId('cfg_select_permanent')
            .setPlaceholder('📌 Selecione a categoria p/ tickets permanentes')
            .setChannelTypes(ChannelType.GuildCategory)
            .setMinValues(1)
            .setMaxValues(1);

        const backBtn = new ButtonBuilder()
            .setCustomId('cfg_back')
            .setLabel('Voltar')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(backBtn);

        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📌 Selecionar Categoria Permanente')
            .setDescription(
                'Selecione a **categoria de canais** para onde os tickets serão movidos ao clicar em "Tornar Permanente".\n\n' +
                '> 💡 Dica: Crie uma categoria chamada "Arquivos" ou "Permanentes" no seu servidor antes de selecionar.'
            )
            .setFooter({ text: 'Detroit Roleplay • Configurações' });

        await interaction.update({
            embeds: [infoEmbed],
            components: [selectRow, btnRow],
        });
        return;
    }

    // ── Canal de Denúncias → mostrar channel select ──
    if (customId === 'cfg_denuncias') {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId('cfg_select_denuncias')
            .setPlaceholder('📢 Selecione o canal de denúncias')
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1);

        const backBtn = new ButtonBuilder()
            .setCustomId('cfg_back')
            .setLabel('Voltar')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(backBtn);

        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📢 Selecionar Canal de Denúncias')
            .setDescription(
                'Selecione o **canal de texto** onde as denúncias e revisões serão enviadas para a staff analisar.\n\n' +
                '> 💡 Dica: Crie um canal como `#denúncias` visível apenas para a staff.'
            )
            .setFooter({ text: 'Detroit Roleplay • Configurações' });

        await interaction.update({
            embeds: [infoEmbed],
            components: [selectRow, btnRow],
        });
        return;
    }

    // ── Canal de Logs Auto-Mod → mostrar channel select ──
    if (customId === 'cfg_automod') {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId('cfg_select_automod')
            .setPlaceholder('🛡️ Selecione canal de logs Auto-Mod')
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1);

        const backBtn = new ButtonBuilder()
            .setCustomId('cfg_back')
            .setLabel('Voltar')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(backBtn);

        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('🛡️ Canal de Auto-Moderação')
            .setDescription(
                'Selecione o **canal de logs** separado onde alertas de Anti-Flood e Palavras Proibidas serão enviados.\n\n' +
                '> 💡 Deixe isso separado do canal de logs de ticket para melhor visualização.'
            )
            .setFooter({ text: 'Detroit Roleplay • Configurações' });

        await interaction.update({
            embeds: [infoEmbed],
            components: [selectRow, btnRow],
        });
        return;
    }

    // ── Voltar ao painel principal ──
    if (customId === 'cfg_back') {
        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    // ── Resetar tudo ──
    if (customId === 'cfg_reset') {
        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('🗑️ Resetar Configurações')
            .setDescription(
                '**Tem certeza?** Isso irá remover todas as configurações salvas.\n\n' +
                'Você precisará configurar tudo novamente.'
            );

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cfg_confirm_reset')
                .setLabel('Sim, Resetar')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cfg_back')
                .setLabel('Cancelar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary),
        );

        await interaction.update({
            embeds: [confirmEmbed],
            components: [confirmRow],
        });
        return;
    }

    // ── Confirmar reset ──
    if (customId === 'cfg_confirm_reset') {
        await removeSetting('guildId');
        await removeSetting('ticketCategoryId');
        await removeSetting('logChannelId');
        await removeSetting('staffRoleId');
        await removeSetting('permanentCategoryId');
        await removeSetting('denunciasChannelId');
        await removeSetting('autoRoleId');
        await removeSetting('linkFilterEnabled');
        await removeSetting('automodLogChannelId');

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }


    // ── Toggle Filtro de Links ──
    if (customId === 'cfg_linkfilter') {
        const current = getSetting('linkFilterEnabled') === 'true';
        if (current) {
            await removeSetting('linkFilterEnabled');
        } else {
            await saveSetting('linkFilterEnabled', 'true');
        }

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    // ── Atualizar painel ──
    if (customId === 'cfg_refresh') {
        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    // ── Menu de Palavras Proibidas ──
    if (customId === 'cfg_badwords_menu') {
        const words = config.badWords;
        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🤬 Gerenciar Palavras Proibidas')
            .setDescription(
                'Abaixo está a lista de palavras **bloqueadas pelo Auto-Mod** no servidor inteiro.\n' +
                '> Mensagens com essas palavras são deletadas automagicamente!\n> Enviar **4 vezes** num prazo de 3 minutos rende um **Mute (Timeout) de 5 min** ao infrator.\n\n' +
                `**Palavras em Quarentena:**\n\`${words.join('`, `')}\``
            )
            .setFooter({ text: 'Detroit Roleplay • Auto-Moderação' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cfg_bw_add')
                .setLabel('Adicionar Palavra')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cfg_bw_rem')
                .setLabel('Remover Palavra')
                .setEmoji('➖')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cfg_back')
                .setLabel('Voltar ao Painel')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [infoEmbed], components: [row] });
        return;
    }

    // Modal para Adicionar
    if (customId === 'cfg_bw_add') {
        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
        const modal = new ModalBuilder()
            .setCustomId('modal_bw_add')
            .setTitle('Adicionar Palavras');
        const input = new TextInputBuilder()
            .setCustomId('words_input')
            .setLabel('Quais palavras? (separe por vírgula)')
            .setPlaceholder('exemplo, teste, palavrao')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
    }

    // Modal para Remover
    if (customId === 'cfg_bw_rem') {
        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
        const modal = new ModalBuilder()
            .setCustomId('modal_bw_rem')
            .setTitle('Remover Palavras da Lista');
        const input = new TextInputBuilder()
            .setCustomId('words_input')
            .setLabel('Qual palavra remover? (apenas a palavra)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
    }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER DE SELECT MENUS DO CONFIG
// ═══════════════════════════════════════════════════════════════
async function handleConfigSelect(interaction) {
    const customId = interaction.customId;

    if (customId === 'cfg_select_category') {
        const channelId = interaction.values[0];
        await saveSetting('ticketCategoryId', channelId);

        // Auto-save guild ID também
        if (!getSetting('guildId')) {
            await saveSetting('guildId', interaction.guild.id);
        }

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    if (customId === 'cfg_select_log') {
        const channelId = interaction.values[0];
        await saveSetting('logChannelId', channelId);

        if (!getSetting('guildId')) {
            await saveSetting('guildId', interaction.guild.id);
        }

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    if (customId === 'cfg_select_staff') {
        const roleId = interaction.values[0];
        await saveSetting('staffRoleId', roleId);

        if (!getSetting('guildId')) {
            await saveSetting('guildId', interaction.guild.id);
        }

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    if (customId === 'cfg_select_autorole') {
        const roleId = interaction.values[0];
        await saveSetting('autoRoleId', roleId);

        if (!getSetting('guildId')) {
            await saveSetting('guildId', interaction.guild.id);
        }

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    if (customId === 'cfg_select_permanent') {
        const channelId = interaction.values[0];
        await saveSetting('permanentCategoryId', channelId);

        if (!getSetting('guildId')) {
            await saveSetting('guildId', interaction.guild.id);
        }

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    if (customId === 'cfg_select_denuncias') {
        const channelId = interaction.values[0];
        await saveSetting('denunciasChannelId', channelId);

        if (!getSetting('guildId')) {
            await saveSetting('guildId', interaction.guild.id);
        }

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }

    if (customId === 'cfg_select_automod') {
        const channelId = interaction.values[0];
        await saveSetting('automodLogChannelId', channelId);

        if (!getSetting('guildId')) {
            await saveSetting('guildId', interaction.guild.id);
        }

        const { embed, components } = buildConfigPanel(interaction.guild);
        await interaction.update({ embeds: [embed], components });
        return;
    }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER DE MODAIS (PALAVRAS BLOQUEADAS)
// ═══════════════════════════════════════════════════════════════
async function handleConfigModal(interaction) {
    const customId = interaction.customId;

    if (customId === 'modal_bw_add' || customId === 'modal_bw_rem') {
        const input = interaction.fields.getTextInputValue('words_input');
        // Separamos por vírgula e removemos espaços das pontas
        const userWords = input.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
        let currentWords = config.badWords;

        if (customId === 'modal_bw_add') {
            for (const w of userWords) {
                if (!currentWords.includes(w)) {
                    currentWords.push(w);
                }
            }
        } else {
            currentWords = currentWords.filter(w => !userWords.includes(w));
        }

        // Salva DB as novas strings JSON
        await saveSetting('badWords_list', JSON.stringify(currentWords));

        // Volta pra tela de gerenciamento mostrando atualizado
        const infoEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🤬 Gerenciar Palavras Proibidas')
            .setDescription(
                'Abaixo está a lista de palavras **bloqueadas pelo Auto-Mod** no servidor inteiro.\n' +
                '> Mensagens com essas palavras são deletadas automagicamente!\n> Enviar **4 vezes** num prazo de 3 minutos rende um **Mute (Timeout) de 5 min** ao infrator.\n\n' +
                `**Palavras em Quarentena:**\n\`${currentWords.join('`, `')}\``
            )
            .setFooter({ text: 'Detroit Roleplay • Auto-Moderação' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cfg_bw_add')
                .setLabel('Adicionar Palavra')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cfg_bw_rem')
                .setLabel('Remover Palavra')
                .setEmoji('➖')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cfg_back')
                .setLabel('Voltar ao Painel')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [infoEmbed], components: [row] });
        return;
    }
}

module.exports = {
    buildConfigPanel,
    handleConfigButton,
    handleConfigSelect,
    handleConfigModal,
};
