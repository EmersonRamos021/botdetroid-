const { REST, Routes } = require('discord.js');
const config = require('./config');

// Carregar comandos
const setupAtendimento = require('./commands/setup-atendimento');
const setupDenuncias = require('./commands/setup-denuncias');
const configCommand = require('./commands/config');
const limparCommand = require('./commands/limpar');
const trancarCommand = require('./commands/trancar');
const destrancarCommand = require('./commands/destrancar');
const falarCommand = require('./commands/falar');
const enqueteCommand = require('./commands/enquete');

const commands = [
    setupAtendimento.data.toJSON(),
    setupDenuncias.data.toJSON(),
    configCommand.data.toJSON(),
    limparCommand.data.toJSON(),
    trancarCommand.data.toJSON(),
    destrancarCommand.data.toJSON(),
    falarCommand.data.toJSON(),
    enqueteCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log('🔄 Registrando slash commands...');

        if (config.guildId) {
            // Registrar no servidor específico (instantâneo)
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );
            console.log(`✅ Comandos registrados no servidor: ${config.guildId}`);
        } else {
            // Registrar globalmente (pode demorar até 1h)
            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands },
            );
            console.log('✅ Comandos registrados globalmente (pode levar até 1h para aparecer).');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Comandos disponíveis:');
        commands.forEach((cmd) => {
            console.log(`  /${cmd.name} - ${cmd.description}`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();
