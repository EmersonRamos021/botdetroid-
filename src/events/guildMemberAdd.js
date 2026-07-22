const config = require('../config');
const { handleMemberJoin } = require('../utils/antiNuke');

module.exports = async (client, member) => {
    // 1. Verificação Anti-Raid Preventiva
    await handleMemberJoin(member, client);

    // 2. Auto Role (Cargos Automáticos)
    const autoRoleId = config.autoRoleId;
    if (!autoRoleId) return;

    try {
        const role = member.guild.roles.cache.get(autoRoleId);
        if (role) {
            await member.roles.add(role, 'Auto Role - Adicionado automaticamente ao entrar');
        }
    } catch (error) {
        console.error(`❌ [Auto Role] Erro ao adicionar cargo a ${member.user.tag}:`, error.message);
    }
};
