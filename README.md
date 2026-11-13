# HEIMDALL

Portal web da HEIMDALL para atendimento, tickets, projetos, apontamentos e notificações. O projeto possui um frontend estático em HTML/CSS/JavaScript e uma API Node.js com SQLite.

## Estrutura

```text
HEINDALL/
├── frontend/                 # Site institucional e portal do usuário
└── backend/
    ├── heimdall.db           # Fonte única de dados SQLite
    ├── server.js             # Inicialização do backend
    └── src/
        ├── app.js            # Express, CORS e tratamento de erros
        ├── config/           # Conexão com SQLite
        ├── models/           # Descoberta automática do schema e modelos ORM
        ├── repositories/     # Consultas e transações Sequelize
        ├── controllers/      # Regras das rotas HTTP
        └── routes/           # Endpoints da API
```

## Tecnologias

- Node.js com ECMAScript Modules
- Express 5
- Sequelize 6
- SQLite 3
- HTML, CSS e JavaScript puro no frontend

## Banco de dados e ORM

O banco `backend/heimdall.db` é a fonte de dados do sistema. Não há dependência de Excel/XLSX.

Ao iniciar, a aplicação lê o schema real do SQLite e cria os modelos Sequelize automaticamente, usando `showAllTables()` e `describeTable()`. Portanto, adicionar tabelas ou colunas diretamente no banco não exige edição de catálogo ou arquivo de models: reinicie a API para ela descobrir o schema atualizado.

As tabelas atuais são: `parameters`, `companies`, `projects`, `project_tasks`, `users`, `tickets`, `ticket_details`, `records` e `notifications`.

As rotas legadas também aceitam os identificadores `company`, `projects_tasks` e `tickets_details`.

## Como executar

### Pré-requisitos

- Node.js 20 ou superior
- npm

### API

```powershell
cd backend
npm install
node server.js
```

A API inicia, por padrão, em `http://localhost:3001`. Para outra porta, defina a variável de ambiente `PORT` antes de executar:

```powershell
$env:PORT = 3002
node server.js
```

### Frontend

O frontend é estático. Sirva a pasta `frontend` por um servidor HTTP local, por exemplo:

```powershell
npx http-server frontend -p 8080
```

Depois, abra `http://localhost:8080`.

## API

Todas as rotas atuais usam `POST` e recebem JSON.

### Consultar registros

`POST /find`

```json
{
  "tableid": "tickets",
  "query": {
    "ticket_status": "2",
    "Recid": ">=1"
  }
}
```

`query` é opcional. Os operadores suportados são `=`, `!=`, `>`, `>=`, `<` e `<=`. Somente colunas existentes na tabela podem ser consultadas.

### Criar, alterar ou excluir

`POST /table_States`

Inserção:

```json
{
  "tableid": "tickets",
  "type": "insert",
  "data": {
    "ticketId": "HDL-TKT00004",
    "ticket_title": "Novo chamado",
    "ticket_status": "1"
  }
}
```

Atualização:

```json
{
  "tableid": "tickets",
  "type": "update",
  "query": { "ticketId": "HDL-TKT00004" },
  "data": { "ticket_status": "2" }
}
```

Exclusão:

```json
{
  "tableid": "tickets",
  "type": "delete",
  "query": { "ticketId": "HDL-TKT00004" }
}
```

As operações de escrita são executadas dentro de uma transação Sequelize/SQLite. Em caso de erro, a operação inteira sofre rollback. `update` e `delete` exigem `query`, evitando alteração ou remoção acidental de todos os registros.

### Próximos identificadores

- `POST /get_nextRecid` com `{ "tableid": "tickets" }`
- `POST /get_nextnum` com `{ "tableid": "tickets" }`

O segundo endpoint usa a tabela de parâmetros para construir o próximo código de usuário ou ticket.

### Autenticação atual

`POST /get_existlogin`

```json
{
  "email": "usuario@empresa.com",
  "senha": "senha",
  "currentUser": "cliente"
}
```

`currentUser` igual a `cliente` busca usuários do tipo `company`; os demais valores buscam `employee`.

## Segurança e operação

- Os nomes de tabelas são aceitos apenas quando existem no schema descoberto pelo SQLite.
- Filtros e dados são validados contra as colunas do modelo antes de chegar ao ORM.
- O identificador interno `id` não é exposto pelas respostas genéricas.
- Faça backup do arquivo `backend/heimdall.db` antes de atualizações estruturais ou implantações.
- A autenticação atual compara `acess_key` diretamente para manter compatibilidade com os dados existentes. Antes de publicar em ambiente exposto, migre senhas para hash com `bcrypt`/`argon2` e implemente sessão ou token de acesso.

## Acessibilidade do frontend

O site, o login e o portal compartilham uma camada de acessibilidade que também trata os formulários e janelas criados dinamicamente.

- Navegação completa por teclado, link para pular ao conteúdo e foco visível.
- Labels, campos obrigatórios, mensagens de erro e regiões de aviso para leitores de tela.
- Alto contraste, fonte ampliada, fonte legível, redução de movimento e régua de leitura.
- Paleta segura para daltonismo e indicadores de status que combinam cor, texto, forma e símbolo.
- Leitura da página por síntese de voz quando suportada pelo navegador.
- Preferências armazenadas localmente no navegador.
- Layout responsivo para desktop, tablet e celular.
- Gráficos com dados reais e resumos textuais equivalentes.

O painel pode ser aberto pelo botão **Acessibilidade**, fixado no canto inferior direito das telas.

## Validação rápida

Com a API em execução:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/find `
  -ContentType 'application/json' `
  -Body '{"tableid":"tickets"}'
```
