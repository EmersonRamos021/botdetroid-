const config = require('../config');
const { getPool } = require('../utils/database');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState, client) {
        // Ignorar se o usuário for um bot
        if (newState.member.user.bot) return;

        // Verificar se o usuário ENTROU em um canal de voz
        // Se oldState.channelId for nulo e newState.channelId existir (Entrou)
        // Ou se oldState.channelId for diferente de newState.channelId (Mudou de sala)
        if (!oldState.channelId && newState.channelId || (oldState.channelId !== newState.channelId && newState.channelId)) {
            
            const supportVoiceChannelId = config.supportVoiceChannelId;

            // Se o canal que ele entrou for a Call de Suporte
            if (supportVoiceChannelId && newState.channelId === supportVoiceChannelId) {
                try {
                    const pool = getPool();
                    // Buscar staffs que atendem suporte
                    const [staffRows] = await pool.query('SELECT discord_id, categories FROM ticket_staff');
                    
                    if (!staffRows || staffRows.length === 0) return;

                    // Filtrar apenas staffs que têm 'suporte' nas categorias
                    const staffsParaAvisar = staffRows.filter(row => {
                        try {
                            const cats = Array.isArray(row.categories) ? row.categories : JSON.parse(row.categories || '[]');
                            return cats.includes('suporte');
                        } catch (e) {
                            return false;
                        }
                    });

                    // Mensagem a ser enviada no privado dos staffs
                    const mensagem = `⚠️ **Atenção Staff!**\nO usuário **${newState.member.user.username}** (\`${newState.member.user.id}\`) acabou de entrar na Call **Aguardando Suporte**!\nPor favor, atenda-o assim que possível.`;

                    // Enviar DM para cada staff filtrado
                    for (const staff of staffsParaAvisar) {
                        try {
                            // Buscar o objeto do usuário na API do Discord
                            const staffUser = await client.users.fetch(staff.discord_id);
                            if (staffUser) {
                                await staffUser.send(mensagem);
                            }
                        } catch (err) {
                            // O staff pode estar com a DM fechada
                            console.error(`Não foi possível enviar DM para o staff ${staff.discord_id} - DM Fechada ou Usuário Inválido.`);
                        }
                    }

                } catch (error) {
                    console.error('Erro ao processar notificação de voz de suporte:', error);
                }
            }
        }
    }
};
