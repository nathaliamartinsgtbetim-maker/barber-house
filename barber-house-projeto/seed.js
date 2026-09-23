require('dotenv').config();
const bcrypt=require('bcryptjs'); const pool=require('./db');
(async()=>{try{
const senha=await bcrypt.hash('123456',10);
await pool.query('INSERT INTO usuarios(nome,email,senha_hash) VALUES (?,?,?) ON DUPLICATE KEY UPDATE senha_hash=VALUES(senha_hash)', ['Dono do salão','dono@salao.com',senha]);
const serv=[['Corte de Cabelo',30,40],['Barba',20,30],['Corte + Barba',20,60],['Sobrancelha',15,60],['Limpeza de Pele',15,20],['Hidratação Capilar',30,50]];
for(const s of serv) await pool.query('INSERT INTO servicos(nome,duracao_min,valor) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM servicos WHERE nome=?)',[...s,s[0]]);
const profs=[['Profissional 1','Barbeiro'],['Profissional 2','Barbeiro']]; for(const p of profs) await pool.query('INSERT INTO profissionais(nome,especialidade) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM profissionais WHERE nome=?)',[p[0],p[1],p[0]]);
console.log('Seed concluído. Login: dono@salao.com / 123456');
}catch(e){console.error(e)}finally{await pool.end()}})();
