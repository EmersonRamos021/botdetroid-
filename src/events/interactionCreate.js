const { handleAtendimentoSelect, handleAtendimentoModal } = require('../handlers/atendimento');
const { handleDenunciaButton, handleDenunciaModal, handleRevisaoModal, handleConsultaModal, handleAceitarNegar, handleAceitarNegarModal } = require('../handlers/denuncias');
const { handleCloseTicket, handleConfirmClose, handleCancelClose, handleManageTicket, handleTicketCreateCall, handleTicketAddUserModalOpen, handleTicketAddUserIdSubmit, handleTicketRemUserModalOpen, handleTicketRemUserIdSubmit, handleTicketPermanent } = require('../handlers/ticket');
const { handleConfigButton, handleConfigSelect } = require('../handlers/config');

module.exports = async (client, interaction) => {
    try {
        // ═══════════════════════════════════════
        // SLASH COMMANDS
        // ═══════════════════════════════════════
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
            return;
        }

        // ═══════════════════════════════════════
        // STRING SELECT MENUS
        // ═══════════════════════════════════════
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'atendimento_select') {
                await handleAtendimentoSelect(interaction);
                return;
            }
        }

        // ═══════════════════════════════════════
        // CHANNEL SELECT MENUS (Config)
        // ═══════════════════════════════════════
        if (interaction.isChannelSelectMenu()) {
            if (interaction.customId.startsWith('cfg_select_')) {
                await handleConfigSelect(interaction);
                return;
            }
        }

        // ═══════════════════════════════════════
        // ROLE SELECT MENUS (Config)
        // ═══════════════════════════════════════
        if (interaction.isRoleSelectMenu()) {
            if (interaction.customId.startsWith('cfg_select_')) {
                await handleConfigSelect(interaction);
                return;
            }
        }

        // ═══════════════════════════════════════
        // USER SELECT MENUS (Ticket Manage) - Removido
        // ═══════════════════════════════════════

        // ═══════════════════════════════════════
        // BUTTONS
        // ═══════════════════════════════════════
        if (interaction.isButton()) {
            // Botões de configuração
            if (interaction.customId.startsWith('cfg_')) {
                await handleConfigButton(interaction);
                return;
            }

            // Botões de denúncias (painel)
            if (['btn_denuncia', 'btn_revisao', 'btn_consultar'].includes(interaction.customId)) {
                await handleDenunciaButton(interaction);
                return;
            }

            // Botões de aceitar/negar denúncia (staff)
            if (interaction.customId.startsWith('btn_aceitar_') || interaction.customId.startsWith('btn_negar_')) {
                await handleAceitarNegar(interaction);
                return;
            }

            // Botão fechar ticket
            if (interaction.customId === 'btn_fechar_ticket') {
                await handleCloseTicket(interaction);
                return;
            }

            // Confirmar fechamento
            if (interaction.customId === 'btn_confirmar_fechar') {
                await handleConfirmClose(interaction, client);
                return;
            }

            // Botão Adicionar por ID
            if (interaction.customId === 'btn_ticket_add_id') {
                await handleTicketAddUserModalOpen(interaction);
                return;
            }

            // Botão Remover por ID
            if (interaction.customId === 'btn_ticket_rem_id') {
                await handleTicketRemUserModalOpen(interaction);
                return;
            }

            // Botão Tornar Ticket Permanente
            if (interaction.customId === 'btn_ticket_permanent') {
                await handleTicketPermanent(interaction);
                return;
            }

            // Botão Cancelar Fechar
            if (interaction.customId === 'btn_cancelar_fechar') {
                await handleCancelClose(interaction);
                return;
            }

            // Botão Gerenciar Ticket
            if (interaction.customId === 'btn_gerenciar_ticket') {
                await handleManageTicket(interaction);
                return;
            }

            // Botão Criar Call Temporária
            if (interaction.customId === 'btn_ticket_call') {
                await handleTicketCreateCall(interaction);
                return;
            }
        }

        // ═══════════════════════════════════════
        // MODALS
        // ═══════════════════════════════════════
        if (interaction.isModalSubmit()) {
            // Modais de atendimento (abrir ticket com descrição)
            if (interaction.customId.startsWith('modal_atendimento_')) {
                await handleAtendimentoModal(interaction);
                return;
            }

            if (interaction.customId === 'modal_denuncia') {
                await handleDenunciaModal(interaction);
                return;
            }

            if (interaction.customId === 'modal_revisao') {
                await handleRevisaoModal(interaction);
                return;
            }

            if (interaction.customId === 'modal_consultar') {
                await handleConsultaModal(interaction);
                return;
            }

            // Modais de aceitar/negar denúncia (staff)
            if (interaction.customId.startsWith('modal_aceitar_') || interaction.customId.startsWith('modal_negar_')) {
                await handleAceitarNegarModal(interaction);
                return;
            }

            // Modal de Adicionar por ID
            if (interaction.customId === 'modal_add_user_id') {
                await handleTicketAddUserIdSubmit(interaction);
                return;
            }

            // Modal de Remover por ID
            if (interaction.customId === 'modal_rem_user_id') {
                await handleTicketRemUserIdSubmit(interaction);
                return;
            }
        }

    } catch (error) {
        console.error('❌ Erro ao processar interação:', error);

        const reply = {
            content: '❌ Ocorreu um erro ao processar sua solicitação. Tente novamente.',
            ephemeral: true,
        };

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        } catch (e) {
            // Ignora erro caso a interação já tenha sido processada
        }
    }
};
