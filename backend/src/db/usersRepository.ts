export type UsuarioTipo = 'ADMINISTRADOR' | 'CAPTURISTA' | 'CONSULTA';

export type UsuarioEstatus = 'ACTIVO' | 'INACTIVO';

export const TIPO_USUARIO_OPCIONES: readonly UsuarioTipo[] = ['ADMINISTRADOR', 'CAPTURISTA', 'CONSULTA'];

export const ESTATUS_OPCIONES: readonly UsuarioEstatus[] = ['ACTIVO', 'INACTIVO'];

export interface Usuario {
    id: number;
    usuario: string;
    tipoUsuario: UsuarioTipo;
    /** Fecha en formato ISO 'YYYY-MM-DD' o null cuando no está definida. */
    vigenciaFini: string | null;
    /** Fecha en formato ISO 'YYYY-MM-DD' o null cuando no está definida. */
    vigenciaFechafin: string | null;
    estatus: UsuarioEstatus;
}

export interface UsuarioInput {
    usuario: string;
    tipoUsuario: UsuarioTipo;
    vigenciaFini: string | null;
    vigenciaFechafin: string | null;
    estatus: UsuarioEstatus;
    /**
     * Hash bcrypt de la contraseña.
     * En un alta es obligatorio; en una modificación, null/undefined conserva la actual.
     */
    passwordHash?: string | null;
}

export interface UsuarioAltaInput extends UsuarioInput {
    passwordHash: string;
}

/**
 * Capa de acceso a los usuarios del sistema.
 * Hoy existen dos implementaciones (memoria y PostgreSQL) para poder
 * trabajar mientras se define la conexión definitiva a la base de datos.
 */
export interface UsersRepository {
    listar(): Promise<Usuario[]>;
    crear(input: UsuarioAltaInput): Promise<Usuario>;
    /** Devuelve null cuando el id no existe. */
    modificar(id: number, input: UsuarioInput): Promise<Usuario | null>;
    /** Devuelve false cuando el id no existe. */
    eliminar(id: number): Promise<boolean>;
    /** true si ya existe otro usuario con ese nombre (se excluye el id indicado). */
    existeUsuario(usuario: string, excluirId?: number): Promise<boolean>;
}
