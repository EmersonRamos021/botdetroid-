const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const ADMIN_API_URL = 'https://detroitadministracao.squareweb.app';
const ADMIN_TOKEN = 'detroit_mta_token_999';

// Função para quebrar um array grande em vários fields do Discord (máximo de 1024 chars por field)
function addChunkedFields(embed, title, array, inline = false) {
    if (!array || array.length === 0) return;
    
    let currentChunk = [];
    let currentLength = 0;
    let part = 1;

    for (const item of array) {
        const itemStr = item.toString();
        // 2 chars for ', '
        if (currentLength + itemStr.length + 2 > 1000) {
            embed.addFields({ name: `${title} (Pt. ${part})`, value: `\`${currentChunk.join(', ')}\``, inline });
            currentChunk = [itemStr];
            currentLength = itemStr.length;
            part++;
        } else {
            currentChunk.push(itemStr);
            currentLength += itemStr.length + 2;
        }
    }

    if (currentChunk.length > 0) {
        const fieldName = part === 1 ? title : `${title} (Pt. ${part})`;
        embed.addFields({ name: fieldName, value: `\`${currentChunk.join(', ')}\``, inline });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ids')
        .setDescription('Mostra a lista de IDs in-game disponíveis e vendidos.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption(option =>
            option.setName('digitos')
                .setDescription('Filtrar por tamanho do ID')
                .setRequired(true)
                .addChoices(
                    { name: '2 Dígitos (10 a 99)', value: 2 },
                    { name: '3 Dígitos (100 a 999)', value: 3 },
                    { name: '4 Dígitos (1000 a 9999)', value: 4 },
                ))
        .addIntegerOption(option =>
            option.setName('pagina')
                .setDescription('Página de IDs livres (padrão: 1)')
                .setRequired(false)
                .setMinValue(1)),

    async execute(interaction) {
        // Resposta pública
        await interaction.deferReply({ ephemeral: false });

        const digitos = interaction.options.getInteger('digitos');
        let paginaAtual = interaction.options.getInteger('pagina') || 1;

        try {
            const response = await fetch(`${ADMIN_API_URL}/api/bot/ids`, {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                return interaction.editReply({ content: `❌ Erro ao buscar IDs: HTTP ${response.status}` });
            }

            const result = await response.json();
            const occupiedIds = result.ids || [];

            let minId, maxId, limitPerPage;
            if (digitos === 2) { minId = 10; maxId = 99; limitPerPage = 50; }
            else if (digitos === 3) { minId = 100; maxId = 999; limitPerPage = 100; }
            else { minId = 1000; maxId = 9999; limitPerPage = 150; }

            const occupiedMap = new Map();
            for (const item of occupiedIds) {
                if (item.game_id >= minId && item.game_id <= maxId) {
                    occupiedMap.set(item.game_id, item.status);
                }
            }

            const vendidos = [];
            const reservados = [];
            const livres = [];

            for (let i = minId; i <= maxId; i++) {
                const status = occupiedMap.get(i);
                if (status === 'vendido') vendidos.push(i);
                else if (status === 'reservado') reservados.push(i);
                else if (status !== 'indisponivel') livres.push(i);
            }

            const totalPaginas = Math.ceil(livres.length / limitPerPage) || 1;

            // Função para gerar o Embed baseado na página atual
            const generateEmbed = (page) => {
                const startIndex = (page - 1) * limitPerPage;
                const endIndex = startIndex + limitPerPage;
                const livresPagina = livres.slice(startIndex, endIndex);

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Gerenciamento de IDs — ${digitos} Dígitos`)
                    .setColor(0xE80000)
                    .setDescription(`Resumo de disponibilidade para IDs entre **${minId}** e **${maxId}**:`)
                    .addFields(
                        { name: '🟢 Livres', value: `${livres.length} IDs disponíveis`, inline: true },
                        { name: '🔴 Vendidos', value: `${vendidos.length} IDs`, inline: true },
                        { name: '🟡 Reservados', value: `${reservados.length} IDs`, inline: true },
                    )
                    .setTimestamp();

                // Mostra todos os vendidos divididos em blocos se necessário
                if (vendidos.length > 0) {
                    addChunkedFields(embed, '🔴 Vendidos', vendidos, false);
                }

                // Mostra todos os reservados divididos em blocos se necessário
                if (reservados.length > 0) {
                    addChunkedFields(embed, '🟡 Reservados', reservados, false);
                }

                // Mostra os livres da página atual
                if (livresPagina.length > 0) {
                    addChunkedFields(embed, `✅ IDs Livres (Pág. ${page}/${totalPaginas})`, livresPagina, false);
                } else {
                    embed.addFields({ name: '✅ IDs Livres', value: 'Nenhum ID livre encontrado.', inline: false });
                }

                return embed;
            };

            // Função para gerar os botões
            const generateButtons = (page) => {
                const row = new ActionRowBuilder();
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('◀ Anterior')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Próxima ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPaginas)
                );
                
                return row;
            };

            paginaAtual = Math.min(Math.max(1, paginaAtual), totalPaginas);

            const message = await interaction.editReply({ 
                embeds: [generateEmbed(paginaAtual)],
                components: totalPaginas > 1 ? [generateButtons(paginaAtual)] : []
            });

            // Criar o coletor de botões se houver mais de uma página
            if (totalPaginas > 1) {
                const collector = message.createMessageComponentCollector({ 
                    componentType: ComponentType.Button, 
                    time: 300000 // 5 minutos de duração
                });

                collector.on('collect', async (i) => {
                    // Apenas quem executou o comando (ou staff) pode mudar a página para evitar spam
                    if (i.user.id !== interaction.user.id && !i.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                        return i.reply({ content: 'Você não pode usar estes botões.', ephemeral: true });
                    }

                    if (i.customId === 'prev_page') {
                        paginaAtual--;
                    } else if (i.customId === 'next_page') {
                        paginaAtual++;
                    }

                    await i.update({
                        embeds: [generateEmbed(paginaAtual)],
                        components: [generateButtons(paginaAtual)]
                    });
                });

                collector.on('end', () => {
                    // Remove os botões quando o tempo acabar para evitar botões mortos
                    interaction.editReply({ components: [] }).catch(() => {});
                });
            }

        } catch (error) {
            console.error('[ids] Erro:', error);
            return interaction.editReply({ content: `❌ Erro interno: ${error.message}` });
        }
    }
};
