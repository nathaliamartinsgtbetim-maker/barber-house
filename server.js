require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'troque-esse-segredo';

app.use(cors());
app.use(express.json());

// horário de funcionamento considerado para calcular horários livres
const HORARIOS_BASE = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const FIM_EXPEDIENTE_MIN = 18 * 60;

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// -------------------------------------------------------------------------
// Autenticação (JWT). Usado só para proteger criação/exclusão de
// serviços e profissionais — a leitura (GET) fica pública, pois a tela
// de agendamento do cliente também precisa dela sem estar logada.
// -------------------------------------------------------------------------
function exigirLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'É preciso estar logado.' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

// =========================================================================
// AUTH
// =========================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Informe email e senha.' });

    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
    const usuario = rows[0];
    if (!usuario) return res.status(401).json({ erro: 'Email ou senha incorretos.' });

    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) return res.status(401).json({ erro: 'Email ou senha incorretos.' });

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, usuario: { nome: usuario.nome, email: usuario.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao tentar fazer login.' });
  }
});

// =========================================================================
// SERVIÇOS
// =========================================================================
app.get('/api/servicos', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM servicos ORDER BY id');
  res.json(rows);
});

app.post('/api/servicos', exigirLogin, async (req, res) => {
  try {
    const { nome, duracao_min, valor } = req.body;
    if (!nome || !duracao_min || valor === undefined) {
      return res.status(400).json({ erro: 'Preencha nome, duração e valor.' });
    }
    const [r] = await pool.query('INSERT INTO servicos (nome, duracao_min, valor, ativo) VALUES (?,?,?,1)', [nome, duracao_min, valor]);
    const [rows] = await pool.query('SELECT * FROM servicos WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar serviço.' });
  }
});

app.delete('/api/servicos/:id', exigirLogin, async (req, res) => {
  try {
    await pool.query('DELETE FROM servicos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir serviço.' });
  }
});

// =========================================================================
// PROFISSIONAIS
// =========================================================================
app.get('/api/profissionais', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM profissionais ORDER BY id');
  res.json(rows);
});

app.get('/api/profissionais/:id/servicos', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.* FROM servicos s
     JOIN profissional_servicos ps ON ps.servico_id = s.id
     WHERE ps.profissional_id = ?`,
    [req.params.id]
  );
  res.json(rows);
});

app.post('/api/profissionais', exigirLogin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { nome, especialidade, servicos } = req.body;
    if (!nome || !especialidade || !Array.isArray(servicos) || servicos.length === 0) {
      conn.release();
      return res.status(400).json({ erro: 'Preencha nome, especialidade e ao menos um serviço.' });
    }
    await conn.beginTransaction();
    const [r] = await conn.query('INSERT INTO profissionais (nome, especialidade, ativo) VALUES (?,?,1)', [nome, especialidade]);
    for (const servicoId of servicos) {
      await conn.query('INSERT INTO profissional_servicos (profissional_id, servico_id) VALUES (?,?)', [r.insertId, servicoId]);
    }
    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM profissionais WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar profissional.' });
  } finally {
    conn.release();
  }
});

app.delete('/api/profissionais/:id', exigirLogin, async (req, res) => {
  try {
    await pool.query('DELETE FROM profissionais WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir profissional.' });
  }
});

// CLIENTES
app.get('/api/clientes', async (req, res) => {
  try {
    const [clientes] = await pool.query(
      'SELECT * FROM clientes ORDER BY id DESC'
    );

    res.json(clientes);
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);

    res.status(500).json({
      erro: 'Erro ao buscar clientes.',
      detalhe: err.message
    });
  }
});
app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, telefone, lgpd } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        erro: 'Nome e telefone são obrigatórios.'
      });
    }

    // Verifica se o cliente já existe pelo telefone
    const [existentes] = await pool.query(
      'SELECT * FROM clientes WHERE telefone = ?',
      [telefone]
    );

    if (existentes.length > 0) {
      await pool.query(
        'UPDATE clientes SET nome = ?, lgpd = ? WHERE id = ?',
        [nome, lgpd ? 1 : 0, existentes[0].id]
      );

      return res.json({
        id: existentes[0].id,
        nome,
        telefone,
        lgpd: lgpd ? 1 : 0,
        mensagem: 'Cliente atualizado com sucesso.'
      });
    }

    // Cria novo cliente
    const [r] = await pool.query(
      'INSERT INTO clientes (nome, telefone, lgpd) VALUES (?, ?, ?)',
      [nome, telefone, lgpd ? 1 : 0]
    );

    res.status(201).json({
      id: r.insertId,
      nome,
      telefone,
      lgpd: lgpd ? 1 : 0,
      mensagem: 'Cliente criado com sucesso.'
    });

  } catch (err) {
    console.error('Erro ao salvar cliente:', err);

    res.status(500).json({
      erro: 'Erro ao salvar cliente.',
      detalhe: err.message
    });
  }
});

// =========================================================================
// AGENDAMENTOS
// =========================================================================

async function calcularHorariosLivres(profissionalId, servicoId, data) {
  const [servicoRows] = await pool.query('SELECT * FROM servicos WHERE id = ?', [servicoId]);
  const servico = servicoRows[0];
  if (!servico) return [];

  const [ocupados] = await pool.query(
    `SELECT hora_inicio, duracao_min FROM agendamentos
     WHERE profissional_id = ? AND data = ? AND status != 'cancelado'`,
    [profissionalId, data]
  );

  const duracao = servico.duracao_min;
  return HORARIOS_BASE.filter((horaBase) => {
    const inicio = paraMinutos(horaBase);
    const fim = inicio + duracao;
    if (fim > FIM_EXPEDIENTE_MIN) return false;
    return !ocupados.some((o) => {
      const inicioOcupado = paraMinutos(o.hora_inicio.slice(0, 5));
      const fimOcupado = inicioOcupado + Number(o.duracao_min);
      return inicio < fimOcupado && fim > inicioOcupado;
    });
  });
}

app.get('/api/agendamentos/horarios-livres', async (req, res) => {
  try {
    const { profissional_id, servico_id, data } = req.query;
    if (!profissional_id || !servico_id || !data) {
      return res.status(400).json({ erro: 'Informe profissional_id, servico_id e data.' });
    }
    const horarios = await calcularHorariosLivres(profissional_id, servico_id, data);
    res.json(horarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao calcular horários livres.' });
  }
});

app.get('/api/agendamentos', async (req, res) => {
  try {
    const { profissional_id, data } = req.query;
    const condicoes = [];
    const params = [];
    if (profissional_id) { condicoes.push('a.profissional_id = ?'); params.push(profissional_id); }
    if (data) { condicoes.push('a.data = ?'); params.push(data); }
    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT a.*, s.nome AS servico_nome, c.nome AS cliente_nome, p.nome AS profissional_nome
       FROM agendamentos a
       JOIN servicos s ON s.id = a.servico_id
       JOIN clientes c ON c.id = a.cliente_id
       JOIN profissionais p ON p.id = a.profissional_id
       ${where}
       ORDER BY a.data DESC, a.hora_inicio DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
  }
});

app.post('/api/agendamentos', async (req, res) => {
  try {
    const { cliente_id, profissional_id, servico_id, data, hora_inicio, forma_pagamento } = req.body;
    if (!cliente_id || !profissional_id || !servico_id || !data || !hora_inicio) {
      return res.status(400).json({ erro: 'Dados incompletos para o agendamento.' });
    }

    const [servicoRows] = await pool.query('SELECT * FROM servicos WHERE id = ?', [servico_id]);
    const servico = servicoRows[0];
    if (!servico) return res.status(400).json({ erro: 'Serviço não encontrado.' });

    // revalida o horário no servidor pra evitar choque de horários entre dois clientes
    const livres = await calcularHorariosLivres(profissional_id, servico_id, data);
    if (!livres.includes(hora_inicio)) {
      return res.status(409).json({ erro: 'Esse horário acabou de ser ocupado. Escolha outro.' });
    }

    const [r] = await pool.query(
      `INSERT INTO agendamentos
        (cliente_id, profissional_id, servico_id, data, hora_inicio, duracao_min, valor_cobrado, forma_pagamento, status)
       VALUES (?,?,?,?,?,?,?,?, 'confirmado')`,
      [cliente_id, profissional_id, servico_id, data, hora_inicio, servico.duracao_min, servico.valor, forma_pagamento || 'pix']
    );

    const [rows] = await pool.query('SELECT * FROM agendamentos WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar agendamento.' });
  }
});

app.get('/', (req, res) => res.send('Barber House API rodando 💈'));

app.listen(PORT, () => {
  console.log(`Barber House API rodando em http://localhost:${PORT}`);
});
