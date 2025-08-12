-- DROP existing (careful in production)
DROP TABLE IF EXISTS pagamentos, mensalidades, clientes;

-- Clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    telefone VARCHAR(30),
    mensalidade_valor NUMERIC(10,2) DEFAULT 0,
    status_pagamento BOOLEAN DEFAULT FALSE
);

-- Mensalidades (um registro por mês por cliente)
CREATE TABLE mensalidades (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    valor NUMERIC(10,2) NOT NULL,
    vencimento DATE NOT NULL,
    paga BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT now()
);

-- Pagamentos (podem referenciar mensalidade ou ser pagamento direto avulso)
CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,
    mensalidade_id INTEGER REFERENCES mensalidades(id) ON DELETE SET NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    valor NUMERIC(10,2) NOT NULL,
    data_pagamento DATE DEFAULT CURRENT_DATE
);

-- Trigger function: quando um pagamento é inserido, atualiza mensalidade e status do cliente
CREATE OR REPLACE FUNCTION fn_trigger_pos_pagamento()
RETURNS TRIGGER AS $$
DECLARE
    cid INTEGER;
BEGIN
    IF NEW.mensalidade_id IS NOT NULL THEN
        -- marca mensalidade como paga
        UPDATE mensalidades SET paga = TRUE WHERE id = NEW.mensalidade_id;
        SELECT cliente_id INTO cid FROM mensalidades WHERE id = NEW.mensalidade_id;
        UPDATE clientes SET status_pagamento = TRUE WHERE id = cid;
    ELSIF NEW.cliente_id IS NOT NULL THEN
        UPDATE clientes SET status_pagamento = TRUE WHERE id = NEW.cliente_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_pos_pagamento
AFTER INSERT ON pagamentos
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_pos_pagamento();

-- Function example: média de pagamentos
CREATE OR REPLACE FUNCTION media_pagamentos() RETURNS NUMERIC AS $$
    SELECT ROUND(AVG(valor)::numeric,2) FROM pagamentos;
$$ LANGUAGE SQL;

-- Procedure: gera mensalidades para todos os clientes para o mês/ano informado,
-- usando o valor de 'mensalidade_valor' em clientes
CREATE OR REPLACE PROCEDURE gerar_mensalidades(mes INTEGER, ano INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    venc DATE;
BEGIN
    -- Primeiro, calcula a data de vencimento com base em mes/ano (1º dia do mês)
    venc := make_date(ano, mes, 1);
    FOR rec IN SELECT id, mensalidade_valor FROM clientes LOOP
        -- Insere apenas se não existir mensalidade para o cliente no mesmo mês/ano
        IF NOT EXISTS (
            SELECT 1 FROM mensalidades
            WHERE cliente_id = rec.id AND date_part('month', vencimento)=mes AND date_part('year', vencimento)=ano
        ) THEN
            INSERT INTO mensalidades (cliente_id, valor, vencimento) VALUES (rec.id, rec.mensalidade_valor, venc);
        END IF;
    END LOOP;
END;
$$;

-- Exemplo de agregação / join / group by: (uso em relatórios)
-- SELECT c.nome, COUNT(m.id) AS qtd_mensalidades, SUM(m.valor) AS total_devido
-- FROM clientes c
-- LEFT JOIN mensalidades m ON c.id = m.cliente_id
-- GROUP BY c.nome;
