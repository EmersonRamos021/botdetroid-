const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const ADMIN_API_URL = 'https://detroitadministracao.squareweb.app';
const ADMIN_TOKEN = 'detroit_mta_token_999';

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
        await interaction.deferReply({ ephemeral: true });

        const digitos = interaction.options.getInteger('digitos');
        const pagina = interaction.options.getInteger('pagina') || 1;

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

            const totalPosiveis = (maxId - minId) + 1;

            // Separar IDs do tamanho requisitado
            const occupiedMap = new Map();
            for (const item of occupiedIds) {
                if (item.game_id >= minId && item.game_id <= maxId) {
                    occupiedMap.set(item.game_id, item.status);
                }
            }

            const vendidos = [];
            const reservados = [];
            const indisponiveis = [];
            const livres = [];

            // Classificar todos os IDs
            for (let i = minId; i <= maxId; i++) {
                const status = occupiedMap.get(i);
                if (status === 'vendido') vendidos.push(i);
                else if (status === 'reservado') reservados.push(i);
                else if (status === 'indisponivel') indisponiveis.push(i);
                else livres.push(i);
            }

            // Paginação dos livres (para não bugar o Discord com muitos caracteres)
            const totalPaginas = Math.ceil(livres.length / limitPerPage);
            const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas || 1);
            const startIndex = (paginaAtual - 1) * limitPerPage;
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

            // Formatando listas em blocos de código
            const formatList = (arr) => arr.length > 0 ? `\`${arr.join(', ')}\`` : 'Nenhum';

            if (vendidos.length > 0 && digitos === 2) {
                embed.addFields({ name: '📝 Vendidos', value: formatList(vendidos), inline: false });
            }
            if (reservados.length > 0) {
                embed.addFields({ name: '⚠️ Reservados', value: formatList(reservados), inline: false });
            }

            if (livresPagina.length > 0) {
                embed.addFields({ 
                    name: `✅ IDs Livres (Pág. ${paginaAtual}/${totalPaginas})`, 
                    value: formatList(livresPagina), 
                    inline: false 
                });
            } else {
                embed.addFields({ name: '✅ IDs Livres', value: 'Nenhum ID livre encontrado.', inline: false });
            }

            if (totalPaginas > 1) {
                embed.setFooter({ text: `Use /ids digitos:${digitos} pagina:${paginaAtual + 1} para ver mais IDs livres.` });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[ids] Erro:', error);
            return interaction.editReply({ content: `❌ Erro interno: ${error.message}` });
        }
    }
};
