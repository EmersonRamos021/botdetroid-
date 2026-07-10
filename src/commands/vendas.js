const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const ADMIN_API_URL = 'https://detroitadministracao.squareweb.app';
const ADMIN_TOKEN = 'detroit_mta_token_999';
const ORDERS_ENDPOINT = `${ADMIN_API_URL}/api/bot/orders`;

// Ícones por tipo de VIP
const VIP_EMOJIS = {
    'basic':   '🟢',
    'eclipse': '🔵',
    'diamond': '💎',
    'royal':   '👑',
    'aura':    '🔥',
};

function getVipEmoji(title) {
    const lower = (title || '').toLowerCase();
    for (const [key, emoji] of Object.entries(VIP_EMOJIS)) {
        if (lower.includes(key)) return emoji;
    }
    return '⭐';
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vendas')
        .setDescription('Mostra os VIPs e produtos vendidos na loja.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('filtro')
                .setDescription('Filtrar por status do pedido')
                .setRequired(false)
                .addChoices(
                    { name: '✅ Entregue', value: 'entregue' },
                    { name: '💰 Pago', value: 'pago' },
                    { name: '⏳ Pendente', value: 'pendente' },
                    { name: '❌ Cancelado', value: 'cancelado' },
                    { name: '📋 Todos', value: 'todos' },
                ))
        .addIntegerOption(option =>
            option.setName('pagina')
                .setDescription('Número da página (padrão: 1)')
                .setRequired(false)
                .setMinValue(1)),

    async execute(interaction) {
        // Torna a resposta pública (visível para todos no chat)
        await interaction.deferReply({ ephemeral: false });

        const filtro = interaction.options.getString('filtro') || 'todos';
        const pagina = interaction.options.getInteger('pagina') || 1;
        const porPagina = 10;

        try {
            // Buscar os pedidos do Admin API
            const url = new URL(ORDERS_ENDPOINT);
            url.searchParams.set('page', pagina);
            url.searchParams.set('limit', porPagina);
            if (filtro !== 'todos') url.searchParams.set('status', filtro);

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                return interaction.editReply({ content: `❌ Erro ao buscar pedidos: HTTP ${response.status}` });
            }

            const result = await response.json();
            const orders = result.orders || result || [];
            const total = result.total || orders.length;
            const totalPages = result.totalPages || Math.ceil(total / porPagina);

            if (!orders || orders.length === 0) {
                return interaction.editReply({ content: `📭 Nenhum pedido encontrado com o filtro **${filtro}**.` });
            }

            const statusEmoji = {
                'entregue': '✅',
                'pago': '💰',
                'pendente': '⏳',
                'cancelado': '❌',
            };

            // Montar linhas do embed
            const linhas = orders.map(o => {
                const emoji = getVipEmoji(o.product_title);
                const sEmoji = statusEmoji[o.status] || '❓';
                const tag = o.user_tag || o.user_discord_id || '?';
                const titulo = o.product_title || 'Produto';
                const preco = `R$ ${Number(o.price).toFixed(2).replace('.', ',')}`;
                const data = formatDate(o.created_at);
                const gameId = o.game_id ? `\`ID: ${o.game_id}\`` : '`—`';
                return `${sEmoji} ${emoji} **${titulo}** — ${preco}\n> 👤 ${tag} ${gameId} • 📅 ${data} • \`${o.code}\``;
            });

            const embed = new EmbedBuilder()
                .setTitle('🛒 Vendas da Loja Detroit')
                .setColor(0xE80000)
                .setDescription(linhas.join('\n\n'))
                .setFooter({ text: `Página ${pagina}/${totalPages} • Total: ${total} pedidos • Filtro: ${filtro}` })
                .setTimestamp();

            // Adicionar campo de resumo
            const totalPago = orders.filter(o => o.status === 'pago' || o.status === 'entregue')
                .reduce((sum, o) => sum + Number(o.price), 0);
            
            if (filtro === 'todos' || filtro === 'entregue' || filtro === 'pago') {
                embed.addFields({
                    name: '💵 Receita nesta página',
                    value: `R$ ${totalPago.toFixed(2).replace('.', ',')}`,
                    inline: true,
                });
            }

            embed.addFields({
                name: '📄 Navegação',
                value: filtro !== 'todos'
                    ? `Use \`/vendas filtro:${filtro} pagina:${pagina + 1}\` para ver a próxima página`
                    : `Use \`/vendas pagina:${pagina + 1}\` para ver a próxima página`,
                inline: true,
            });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[vendas] Erro:', error);
            return interaction.editReply({ content: `❌ Erro interno: ${error.message}` });
        }
    }
};
