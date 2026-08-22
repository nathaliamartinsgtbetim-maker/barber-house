const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "barber_house",
  port: 3306,
});

app.get("/", (req, res) => {
  res.json({
    message: "Barber House API rodando 💈",
  });
});

app.get("/teste-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS conectado");

    res.json({
      sucesso: true,
      banco: "barber_house",
      resultado: rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      sucesso: false,
      erro: "Não foi possível conectar ao MySQL",
    });
  }
});

app.listen(3000, () => {
  console.log("Barber House API rodando na porta 3000 💈");
});