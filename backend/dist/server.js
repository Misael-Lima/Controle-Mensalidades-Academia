var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import cors from "cors";
import { Pool } from "pg";
const app = express();
app.use(cors());
app.use(express.json());
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'academia',
    password: '19182400Lm##',
    port: 5432,
});
// CLIENTES - CRUD
app.post("/clientes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nome, email, telefone, mensalidade_valor } = req.body;
    const result = yield pool.query("INSERT INTO clientes (nome, email, telefone, mensalidade_valor) VALUES ($1,$2,$3,$4) RETURNING *", [nome, email, telefone, mensalidade_valor || 0]);
    res.status(201).json(result.rows[0]);
}));
app.get("/clientes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield pool.query("SELECT * FROM clientes ORDER BY id");
    res.json(result.rows);
}));
app.put("/clientes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const { nome, email, telefone, mensalidade_valor } = req.body;
    const result = yield pool.query("UPDATE clientes SET nome=$1,email=$2,telefone=$3,mensalidade_valor=$4 WHERE id=$5 RETURNING *", [nome, email, telefone, mensalidade_valor || 0, id]);
    res.json(result.rows[0]);
}));
app.delete("/clientes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    yield pool.query("DELETE FROM pagamentos WHERE cliente_id=$1", [id]);
    yield pool.query("DELETE FROM mensalidades WHERE cliente_id=$1", [id]);
    yield pool.query("DELETE FROM clientes WHERE id=$1", [id]);
    res.sendStatus(204);
}));
// MENSALIDADES - CRUD
app.post("/mensalidades", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cliente_id, valor, vencimento } = req.body;
    const result = yield pool.query("INSERT INTO mensalidades (cliente_id, valor, vencimento) VALUES ($1,$2,$3) RETURNING *", [cliente_id, valor, vencimento]);
    res.status(201).json(result.rows[0]);
}));
app.get("/mensalidades", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield pool.query("SELECT * FROM mensalidades ORDER BY vencimento DESC, id");
    res.json(result.rows);
}));
app.put("/mensalidades/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const { valor, vencimento, paga } = req.body;
    const result = yield pool.query("UPDATE mensalidades SET valor=$1,vencimento=$2,paga=$3 WHERE id=$4 RETURNING *", [valor, vencimento, paga, id]);
    res.json(result.rows[0]);
}));
app.delete("/mensalidades/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    yield pool.query("DELETE FROM pagamentos WHERE mensalidade_id=$1", [id]);
    yield pool.query("DELETE FROM mensalidades WHERE id=$1", [id]);
    res.sendStatus(204);
}));
// PAGAMENTOS
app.post("/pagamentos", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mensalidade_id, cliente_id, valor } = req.body;
    // If mensalidade_id provided, associate payment with mensalidade and mark mensalidade paid
    const result = yield pool.query("INSERT INTO pagamentos (mensalidade_id, cliente_id, valor) VALUES ($1,$2,$3) RETURNING *", [mensalidade_id || null, cliente_id || null, valor]);
    // If payment linked to mensalidade, update mensalidade.paga
    if (mensalidade_id) {
        yield pool.query("UPDATE mensalidades SET paga = true WHERE id = $1", [
            mensalidade_id,
        ]);
    }
    // Update cliente status to in-day if any payment exists for them today (simple logic)
    if (cliente_id) {
        yield pool.query("UPDATE clientes SET status_pagamento = true WHERE id = $1", [cliente_id]);
    }
    else if (mensalidade_id) {
        const r = yield pool.query("SELECT cliente_id FROM mensalidades WHERE id=$1", [mensalidade_id]);
        if (r.rows[0]) {
            yield pool.query("UPDATE clientes SET status_pagamento = true WHERE id = $1", [r.rows[0].cliente_id]);
        }
    }
    res.status(201).json(result.rows[0]);
}));
app.get("/pagamentos", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield pool.query("SELECT * FROM pagamentos ORDER BY data_pagamento DESC, id");
    res.json(result.rows);
}));
// INADIMPLENTES
app.get("/inadimplentes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield pool.query("SELECT * FROM clientes WHERE status_pagamento = FALSE ORDER BY id");
    res.json(result.rows);
}));
// PROCEDURES & FUNCTIONS endpoints
app.post("/procedures/gerar_mensalidades", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mes, ano } = req.body;
    yield pool.query("CALL gerar_mensalidades($1,$2)", [mes, ano]);
    res.json({ message: `Mensalidades geradas para ${mes}/${ano}` });
}));
app.get("/functions/media_pagamentos", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const r = yield pool.query("SELECT media_pagamentos() as media");
    res.json({ media: r.rows[0].media });
}));
// RELATÓRIO: total por cliente (JOIN + GROUP BY)
app.get("/relatorios/total_por_cliente", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const r = yield pool.query(`
        SELECT c.id, c.nome, COUNT(p.id) AS total_pagamentos, COALESCE(SUM(p.valor),0) AS total_pago
        FROM clientes c
        LEFT JOIN pagamentos p ON c.id = p.cliente_id OR c.id = (SELECT cliente_id FROM mensalidades WHERE id = p.mensalidade_id)
        GROUP BY c.id, c.nome
        ORDER BY total_pago DESC
    `);
    res.send(JSON.stringify(r.rows, null, 2));
}));
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
//# sourceMappingURL=server.js.map