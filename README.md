# Barber House — Sistema do Salão

Projeto completo: front-end (HTML) + back-end (Node.js/Express) conectado ao MySQL.

## Estrutura

```
barber-house/
├── backend/
│   ├── server.js         → API Express (rotas de login, serviços, profissionais, clientes, agendamentos)
│   ├── db.js              → conexão com o MySQL
│   ├── schema.sql         → cria o banco e as tabelas (rodar 1x, do zero)
│   ├── migration_lgpd.sql → só necessário se você criou o banco ANTES da coluna lgpd existir
│   ├── seed.js            → popula o banco com dados de exemplo + cria o login do dono
│   ├── package.json
│   ├── package-lock.json
│   └── .env               → suas credenciais do MySQL (já preenchido com o que você mandou)
└── frontend/
    ├── index.html          → a página do sistema (painel do dono + agendamento do cliente)
    └── img/
        └── fundo-barbearia-certa.jpg
```

## Como rodar o backend

1. Entre na pasta `backend`:
   ```
   cd backend
   ```
2. Instale as dependências:
   ```
   npm install
   ```
3. Crie o banco e as tabelas (só na primeira vez):
   ```
   mysql -u root -p < schema.sql
   ```
   Se você já tinha criado o banco antes (sem a coluna `lgpd`), rode em vez disso:
   ```
   mysql -u root -p barber_house < migration_lgpd.sql
   ```
4. Popule com dados de exemplo (serviços, profissionais, clientes e o login do dono):
   ```
   npm run seed
   ```
5. Suba o servidor:
   ```
   npm start
   ```
   A API vai responder em `http://localhost:3000/api`.

## Como abrir o front-end

Abra `frontend/index.html` — de preferência com a extensão **Live Server** do VS Code, em vez de abrir clicando duas vezes no arquivo. Isso evita problemas de caminho relativo (como o da imagem de fundo).

O `index.html` já está configurado para chamar a API em `http://localhost:3000/api` (veja a constante `API_BASE_URL` no topo do `<script>` do arquivo, caso precise apontar pra outro endereço).

## Login do dono

```
email: dono@salao.com
senha: 12345678
```

## Observação de segurança

O arquivo `.env` incluído aqui tem as credenciais que você mandou (senha do MySQL e chave JWT). Não suba esse arquivo pra um repositório público — ele já vem no `.gitignore` de projetos Node por padrão, mas confirme antes de fazer `git push`.
