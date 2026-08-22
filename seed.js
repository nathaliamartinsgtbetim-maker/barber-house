/**
 * Popula o banco com os mesmos dados de exemplo que o front-end usava
 * como fallback (serviços, profissionais, clientes e um dono para login).
 *
 * Rode com: npm run seed
 * Pode rodar de novo sem problema — ele limpa as tabelas antes de inserir.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

const SERVICOS = [
  { nome: 'Corte de cabelo', duracao_min: 40, valor: 40 },
  { nome: 'Barba', duracao_min: 25, valor: 25 },
  { nome: 'Sobrancelha', duracao_min: 15, valor: 15 },
  { nome: 'Corte kids', duracao_min: 30, valor: 30 },
  { nome: 'Tintura', duracao_min: 60, valor: 25 },
  { nome: 'Luzes', duracao_min: 90, valor: 50 },
  { nome: 'Nevou', duracao_min: 120, valor: 100 },
  { nome: 'Combo: Corte, Barba e Sobrancelha', duracao_min: 75, valor: 65 },
];

// índices (1-based, na mesma ordem de SERVICOS acima) que cada profissional realiza
const PROFISSIONAIS = [
  { nome: 'Ana Costa', especialidade: 'Cabeleireira', servicos: [1, 3, 4, 5, 6, 7] },
  { nome: 'Bruno Alves', especialidade: 'Barbeiro', servicos: [1, 2, 3, 4, 8] },
  { nome: 'Carla Souza', especialidade: 'Esteticista', servicos: [3, 4] },
  { nome: 'Diego Ferreira', especialidade: 'Barbeiro', servicos: [1, 2, 3, 4, 5, 6, 7, 8] },
  { nome: 'Eduardo Lima', especialidade: 'Barbeiro', servicos: [1, 2, 3, 4, 5, 6, 7, 8] },
  { nome: 'Rodrigo Almeida', especialidade: 'Cabeleireiro especialista em coloração', servicos: [4, 5, 6, 7] },
  { nome: 'Felipe Cardoso', especialidade: 'Cabeleireiro especialista em coloração', servicos: [4, 5, 6, 7] },
];

const CLIENTES = [
  { nome: 'Marcos Pereira', telefone: '(11) 91234-5678' },
  { nome: 'Juliana Martins', telefone: '(11) 92345-6789' },
  { nome: 'Rafael Santos', telefone: '(11) 93456-7890' },
  { nome: 'Fernanda Lima', telefone: '(11) 94567-8901' },
  { nome: 'Thiago Rocha', telefone: '(11) 95678-9012' },
  { nome: 'Camila Duarte', telefone: '(11) 96789-0123' },
  { nome: 'Lucas Oliveira', telefone: '(11) 97890-1234' },
  { nome: 'Patrícia Nunes', telefone: '(11) 98901-2345' },
];

// { profissionalIdx (1-based), servicoIdx (1-based), clienteIdx (1-based), diasAtras, hora, status }
const AGENDAMENTOS_BASE = [
  { p: 1, s: 1, c: 1, dias: 12, hora: '09:00', status: 'concluido' },
  { p: 1, s: 5, c: 2, dias: 9, hora: '14:00', status: 'concluido' },
  { p: 1, s: 6, c: 3, dias: 6, hora: '10:00', status: 'concluido' },
  { p: 1, s: 7, c: 4, dias: 2, hora: '11:00', status: 'concluido' },
  { p: 2, s: 1, c: 5, dias: 11, hora: '10:00', status: 'concluido' },
  { p: 2, s: 2, c: 6, dias: 8, hora: '13:00', status: 'concluido' },
  { p: 2, s: 8, c: 7, dias: 5, hora: '15:00', status: 'concluido' },
  { p: 2, s: 2, c: 8, dias: 0, hora: '11:00', status: 'confirmado' },
  { p: 3, s: 3, c: 1, dias: 10, hora: '15:00', status: 'concluido' },
  { p: 3, s: 4, c: 2, dias: 4, hora: '16:00', status: 'concluido' },
  { p: 4, s: 1, c: 3, dias: 7, hora: '09:00', status: 'concluido' },
  { p: 4, s: 7, c: 4, dias: 3, hora: '13:00', status: 'concluido' },
  { p: 4, s: 8, c: 5, dias: 0, hora: '14:00', status: 'agendado' },
  { p: 5, s: 2, c: 6, dias: 6, hora: '17:00', status: 'concluido' },
  { p: 5, s: 7, c: 7, dias: 1, hora: '10:00', status: 'concluido' },
];

const DONO = { nome: 'Dono do salão', email: 'dono@salao.com', senha: '12345678' };

function dataOffset(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('Limpando tabelas...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE agendamentos');
    await conn.query('TRUNCATE TABLE profissional_servicos');
    await conn.query('TRUNCATE TABLE clientes');
    await conn.query('TRUNCATE TABLE profissionais');
    await conn.query('TRUNCATE TABLE servicos');
    await conn.query('TRUNCATE TABLE usuarios');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Criando usuário dono...');
    const senhaHash = await bcrypt.hash(DONO.senha, 10);
    await conn.query('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?,?,?)', [DONO.nome, DONO.email, senhaHash]);

    console.log('Inserindo serviços...');
    const servicoIds = [];
    for (const s of SERVICOS) {
      const [r] = await conn.query('INSERT INTO servicos (nome, duracao_min, valor, ativo) VALUES (?,?,?,1)', [s.nome, s.duracao_min, s.valor]);
      servicoIds.push(r.insertId);
    }

    console.log('Inserindo profissionais e vínculos com serviços...');
    const profIds = [];
    for (const p of PROFISSIONAIS) {
      const [r] = await conn.query('INSERT INTO profissionais (nome, especialidade, ativo) VALUES (?,?,1)', [p.nome, p.especialidade]);
      profIds.push(r.insertId);
      for (const sIdx of p.servicos) {
        await conn.query('INSERT INTO profissional_servicos (profissional_id, servico_id) VALUES (?,?)', [r.insertId, servicoIds[sIdx - 1]]);
      }
    }

    console.log('Inserindo clientes...');
    const clienteIds = [];
    for (const c of CLIENTES) {
      const [r] = await conn.query('INSERT INTO clientes (nome, telefone) VALUES (?,?)', [c.nome, c.telefone]);
      clienteIds.push(r.insertId);
    }

    console.log('Inserindo agendamentos de histórico...');
    for (const a of AGENDAMENTOS_BASE) {
      const servico = SERVICOS[a.s - 1];
      await conn.query(
        `INSERT INTO agendamentos
          (cliente_id, profissional_id, servico_id, data, hora_inicio, duracao_min, valor_cobrado, forma_pagamento, status)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          clienteIds[a.c - 1],
          profIds[a.p - 1],
          servicoIds[a.s - 1],
          dataOffset(a.dias),
          a.hora,
          servico.duracao_min,
          servico.valor,
          'pix',
          a.status,
        ]
      );
    }

    console.log('\nPronto! Login do dono:');
    console.log(`  email: ${DONO.email}`);
    console.log(`  senha: ${DONO.senha}`);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Erro ao popular o banco:', err);
  process.exit(1);
});
