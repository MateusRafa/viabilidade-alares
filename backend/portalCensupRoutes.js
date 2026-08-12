/**
 * API REST — Portal CENSUP (fila de chamados + tabulação IA)
 */
import {
  getChamadoById,
  listChamados,
  registerFeedback,
  upsertChamado
} from './lib/portalCensup/chamadosService.js';
import {
  getAgendaBotStatus,
  importAgendaSession,
  startAgendaBot,
  stopAgendaBot,
  syncAgendaBotOnce
} from './lib/portalCensup/agendaBot/index.js';

function getUsuarioFromRequest(req) {
  const headerKeys = Object.keys(req.headers || {});
  for (const key of headerKeys) {
    if (key.toLowerCase() === 'x-usuario') {
      return (req.headers[key] || '').trim();
    }
  }
  return (req.body?.usuario || req.query?.usuario || '').trim();
}

function sendError(res, err) {
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Erro interno'
  });
}

/**
 * @param {import('express').Express} app
 */
export function registerPortalCensupRoutes(app) {
  app.get('/api/portal-censup/chamados', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const result = await listChamados({
        q: req.query.q || '',
        page: req.query.page,
        limit: req.query.limit
      });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error('❌ [PortalCENSUP] GET chamados:', err);
      sendError(res, err);
    }
  });

  app.get('/api/portal-censup/chamados/:id', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const chamado = await getChamadoById(req.params.id);
      res.json({ success: true, chamado });
    } catch (err) {
      console.error('❌ [PortalCENSUP] GET chamado:', err);
      sendError(res, err);
    }
  });

  app.post('/api/portal-censup/chamados/:id/feedback', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const { correto, tabulacaoCorrigida } = req.body || {};
      if (typeof correto !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Campo correto é obrigatório (boolean)' });
      }

      if (correto === false && !(tabulacaoCorrigida || '').trim()) {
        return res.status(400).json({
          success: false,
          error: 'Informe tabulacaoCorrigida quando a sugestão estiver incorreta'
        });
      }

      const result = await registerFeedback(req.params.id, {
        usuario,
        correto,
        tabulacaoCorrigida: (tabulacaoCorrigida || '').trim() || null
      });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error('❌ [PortalCENSUP] POST feedback:', err);
      sendError(res, err);
    }
  });

  /** Endpoint interno para o bot da Agenda inserir/atualizar chamados */
  app.post('/api/portal-censup/chamados', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const chamado = await upsertChamado(req.body || {});
      res.json({ success: true, chamado });
    } catch (err) {
      console.error('❌ [PortalCENSUP] POST chamado:', err);
      sendError(res, err);
    }
  });

  app.get('/api/portal-censup/agenda-bot/status', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const status = await getAgendaBotStatus();
      res.json({ success: true, status });
    } catch (err) {
      console.error('❌ [PortalCENSUP] GET agenda-bot/status:', err);
      sendError(res, err);
    }
  });

  app.post('/api/portal-censup/agenda-bot/start', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const status = await startAgendaBot({ runImmediately: true });
      res.json({ success: true, status });
    } catch (err) {
      console.error('❌ [PortalCENSUP] POST agenda-bot/start:', err);
      sendError(res, err);
    }
  });

  app.post('/api/portal-censup/agenda-bot/stop', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const status = await stopAgendaBot();
      res.json({ success: true, status });
    } catch (err) {
      console.error('❌ [PortalCENSUP] POST agenda-bot/stop:', err);
      sendError(res, err);
    }
  });

  app.post('/api/portal-censup/agenda-bot/session', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const { session } = req.body || {};
      if (!session) {
        return res.status(400).json({ success: false, error: 'Campo session é obrigatório' });
      }

      const saved = await importAgendaSession(
        typeof session === 'string' ? session : JSON.stringify(session)
      );
      const status = await getAgendaBotStatus();
      res.json({ success: true, saved, status });
    } catch (err) {
      console.error('❌ [PortalCENSUP] POST agenda-bot/session:', err);
      sendError(res, err);
    }
  });

  app.post('/api/portal-censup/agenda-bot/sync', async (req, res) => {
    try {
      const usuario = getUsuarioFromRequest(req);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      const status = await syncAgendaBotOnce();
      res.json({ success: true, status });
    } catch (err) {
      console.error('❌ [PortalCENSUP] POST agenda-bot/sync:', err);
      sendError(res, err);
    }
  });
}
