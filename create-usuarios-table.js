import { pool } from "./src/config/database.js";
import fs from "fs";

async function createTable() {
    try {
        const sql = fs.readFileSync("./src/db/usuarios.sql", "utf8");
        await pool.query(sql);
        console.log("Tabla usuarios creada exitosamente.");
    } catch (err) {
        console.error("Error creando tabla:", err);
    } finally {
        pool.end();
    }
}

createTable();
