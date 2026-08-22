-- =========================================================================
-- Barber House — schema do banco MySQL
-- Rode este arquivo uma vez para criar o banco e as tabelas:
--   mysql -u root -p < schema.sql
-- =========================================================================

CREATE DATABASE IF NOT EXISTS barber_house
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE barber_house;

-- Dono(s) do salão que podem logar no painel
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  duracao_min INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS profissionais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  especialidade VARCHAR(120),
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

-- Quais serviços cada profissional realiza (muitos-para-muitos)
CREATE TABLE IF NOT EXISTS profissional_servicos (
  profissional_id INT NOT NULL,
  servico_id INT NOT NULL,
  PRIMARY KEY (profissional_id, servico_id),
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  profissional_id INT NOT NULL,
  servico_id INT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  duracao_min INT NOT NULL,
  valor_cobrado DECIMAL(10,2) NOT NULL,
  forma_pagamento VARCHAR(20) DEFAULT 'pix',
  status ENUM('agendado','confirmado','concluido','cancelado') NOT NULL DEFAULT 'confirmado',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id),
  FOREIGN KEY (servico_id) REFERENCES servicos(id),
  INDEX idx_prof_data (profissional_id, data)
);
