const express = require('express');
const mysql = require('mysql2/promise');
const { SSHConnection } = require('ssh2-promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// CONFIGURACIÓN DE CONEXIÓN
// ==========================================

// 1. Datos del Servidor SSH (La "Puerta de Entrada" de la empresa)
const sshConfig = {
    host: '200.xxx.xxx.xxx',       // IP pública del servidor SSH de la empresa
    port: 22,                       // Puerto SSH (por defecto 22)
    username: 'usuario_ssh',        // Usuario SSH que te asigne la empresa
    password: 'password_ssh',       // Contraseña SSH (o puedes usar privateKey si usan clave RSA)
};

// 2. Datos de la Base de Datos MySQL (Como se ve DESDE el servidor SSH)
const dbConfig = {
    host: '127.0.0.1',             // Si MySQL está en el mismo servidor SSH
    // host: '192.168.1.50',       // Si MySQL está en otra IP dentro de la red local
    port: 3306,                     // Puerto de MySQL
    user: 'usuario_mysql',          // Usuario de la base de datos
    password: 'password_mysql',      // Contraseña de la base de datos
    database: 'armas_durango_db'    // Nombre de la BD
};

let dbPool; // Variable global para guardar la piscina de conexiones

// ==========================================
// FUNCIÓN PARA CREAR EL PUENTE SSH Y CONECTAR A MYSQL
// ==========================================
async function conectarConPuenteSSH() {
    try {
        console.log('1. Iniciando túnel SSH...');
        const ssh = new SSHConnection(sshConfig);

        // Crear un reenvío de puerto (Port Forwarding) local automático
        const tunnel = await ssh.forwardOut(
            '127.0.0.1',
            12345, // Puerto local temporal
            dbConfig.host,
            dbConfig.port
        );

        console.log('2. Túnel SSH establecido. Conectando a MySQL...');

        // Creamos el Pool de conexiones redirigiendo el flujo al Stream del túnel SSH
        dbPool = mysql.createPool({
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
            stream: tunnel // <--- Aquí ocurre la magia: MySQL viaja dentro del túnel SSH
        });

        console.log('3. ¡Conexión a MySQL exitosa a través del Puente SSH!');
    } catch (error) {
        console.error('Error al establecer el puente SSH o conectar a MySQL:', error);
    }
}

// ==========================================
// RUTAS DE LA API REST (Consumen la BD protegida)
// ==========================================

// Obtener Vista General Unificada
app.get('/api/inventario-general', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.codigo,
                p.nombre AS pieza,
                p.categoria,
                SUM(i.cantidad) AS cantidad_total,
                SUM(CASE WHEN pl.nombre = 'Planta Norte' THEN i.cantidad ELSE 0 END) AS planta_norte,
                SUM(CASE WHEN pl.nombre = 'Planta Sur' THEN i.cantidad ELSE 0 END) AS planta_sur,
                SUM(CASE WHEN pl.nombre = 'Planta Central' THEN i.cantidad ELSE 0 END) AS planta_central
            FROM piezas p
            LEFT JOIN inventario i ON p.id = i.pieza_id
            LEFT JOIN plantas pl ON i.planta_id = pl.id
            GROUP BY p.id;
        `;
        const [filas] = await dbPool.query(query);
        res.json(filas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Registrar Traspaso entre plantas
app.post('/api/traspasos', async (req, res) => {
    const { pieza_id, planta_origen_id, planta_destino_id, cantidad, lote, fecha } = req.body;

    try {
        await dbPool.query(
            'UPDATE inventario SET cantidad = cantidad - ? WHERE pieza_id = ? AND planta_id = ?',
            [cantidad, pieza_id, planta_origen_id]
        );

        await dbPool.query(
            'UPDATE inventario SET cantidad = cantidad + ? WHERE pieza_id = ? AND planta_id = ?',
            [cantidad, pieza_id, planta_destino_id]
        );

        await dbPool.query(
            'INSERT INTO traspasos (pieza_id, planta_origen_id, planta_destino_id, cantidad, lote, fecha) VALUES (?, ?, ?, ?, ?, ?)',
            [pieza_id, planta_origen_id, planta_destino_id, cantidad, lote, fecha]
        );

        res.json({ status: 'ok', mensaje: 'Traspaso registrado de forma segura' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// INICIALIZACIÓN DEL SERVIDOR
// ==========================================
const PUERTO = 3000;
app.listen(PUERTO, async () => {
    console.log(`Servidor API escuchando en http://localhost:${PUERTO}`);
    // Conectamos el túnel al arrancar el servidor
    await conectarConPuenteSSH();
});