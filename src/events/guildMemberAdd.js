const config = require('../config');

module.exports = async (client, member) => {
    // Ignorar bots se necessário (opcional, por padrão bots também podem receber cargo de membro, mas se não quiser, descomente a linha abaixo)
    // if (member.user.bot) return;

    const autoRoleId = config.autoRoleId;
    
    // Se não tiver cargo configurado, não faz nada
    if (!autoRoleId) return;

    try {
        const role = member.guild.roles.cache.get(autoRoleId);
        
        if (role) {
            await member.roles.add(role, 'Auto Role - Adicionado automaticamente ao entrar');
            console.log(`✅ [Auto Role] Cargo '${role.name}' adicionado a ${member.user.tag}.`);
        } else {
            console.warn(`⚠️ [Auto Role] Cargo com ID ${autoRoleId} configurado não foi encontrado no servidor.`);
        }
    } catch (error) {
        console.error(`❌ [Auto Role] Erro ao adicionar cargo a ${member.user.tag}:`, error.message);
    }
};
