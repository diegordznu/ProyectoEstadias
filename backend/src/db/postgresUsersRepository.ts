import type { Pool } from 'pg';
import type {
    Usuario,
    UsuarioAltaInput,
    UsuarioConPassword,
    UsuarioInput,
    UsersRepository,
} from './usersRepository';

const COLUMNAS = `id,
           usuario,
           tipo_usuario AS "tipoUsuario",
           vigencia_fini::text AS "vigenciaFini",
           vigencia_fechafin::text AS "vigenciaFechafin",
           estatus`;

/** Implementación sobre la BD propia (PostgreSQL). Requiere el esquema de sql/01_usuarios.sql. */
export class PostgresUsersRepository implements UsersRepository {
    constructor(private readonly pool: Pool) {}

    async listar(): Promise<Usuario[]> {
        const { rows } = await this.pool.query<Usuario>(`SELECT ${COLUMNAS} FROM usuarios ORDER BY id`);
        return rows;
    }

    async buscarPorId(id: number): Promise<Usuario | null> {
        const { rows } = await this.pool.query<Usuario>(`SELECT ${COLUMNAS} FROM usuarios WHERE id = $1`, [id]);
        return rows[0] ?? null;
    }

    async buscarPorUsuario(usuario: string): Promise<UsuarioConPassword | null> {
        const { rows } = await this.pool.query<UsuarioConPassword>(
            `SELECT ${COLUMNAS}, password_hash AS "passwordHash" FROM usuarios WHERE usuario = $1`,
            [usuario],
        );
        return rows[0] ?? null;
    }

    async crear(input: UsuarioAltaInput): Promise<Usuario> {
        const { rows } = await this.pool.query<Usuario>(
            `INSERT INTO usuarios (usuario, password_hash, tipo_usuario, vigencia_fini, vigencia_fechafin, estatus)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING ${COLUMNAS}`,
            [
                input.usuario,
                input.passwordHash,
                input.tipoUsuario,
                input.vigenciaFini,
                input.vigenciaFechafin,
                input.estatus,
            ],
        );
        return rows[0];
    }

    async modificar(id: number, input: UsuarioInput): Promise<Usuario | null> {
        const { rows } = await this.pool.query<Usuario>(
            `UPDATE usuarios
                SET usuario = $1,
                    tipo_usuario = $2,
                    vigencia_fini = $3,
                    vigencia_fechafin = $4,
                    estatus = $5,
                    password_hash = COALESCE($6, password_hash)
              WHERE id = $7
             RETURNING ${COLUMNAS}`,
            [
                input.usuario,
                input.tipoUsuario,
                input.vigenciaFini,
                input.vigenciaFechafin,
                input.estatus,
                input.passwordHash ?? null,
                id,
            ],
        );
        return rows[0] ?? null;
    }

    async eliminar(id: number): Promise<boolean> {
        const { rowCount } = await this.pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        return (rowCount ?? 0) > 0;
    }

    async existeUsuario(usuario: string, excluirId?: number): Promise<boolean> {
        const { rows } = await this.pool.query<{ exists: boolean }>(
            `SELECT EXISTS (
                SELECT 1 FROM usuarios WHERE usuario = $1 AND id <> COALESCE($2, -1)
             ) AS exists`,
            [usuario, excluirId ?? null],
        );
        return rows[0]?.exists === true;
    }
}
