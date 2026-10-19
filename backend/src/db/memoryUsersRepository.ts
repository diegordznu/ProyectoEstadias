import bcrypt from 'bcryptjs';
import type {
    Usuario,
    UsuarioAltaInput,
    UsuarioConPassword,
    UsuarioInput,
    UsersRepository,
} from './usersRepository';

type UsuarioGuardado = UsuarioConPassword;

/** Contraseña inicial de los usuarios de ejemplo (solo mientras se usa la BD en memoria). */
const SEED_PASSWORD = '123456';

const SEED_USUARIOS: Array<Omit<UsuarioGuardado, 'id' | 'passwordHash'>> = [
    { usuario: 'PRODUCCION', tipoUsuario: 'CAPTURISTA', vigenciaFini: null, vigenciaFechafin: null, estatus: 'ACTIVO' },
    { usuario: 'GROSAS', tipoUsuario: 'CAPTURISTA', vigenciaFini: null, vigenciaFechafin: null, estatus: 'ACTIVO' },
    { usuario: 'LNAVA', tipoUsuario: 'CAPTURISTA', vigenciaFini: null, vigenciaFechafin: null, estatus: 'ACTIVO' },
    { usuario: 'JONATHAN SARABIA', tipoUsuario: 'ADMINISTRADOR', vigenciaFini: null, vigenciaFechafin: null, estatus: 'ACTIVO' },
    { usuario: 'FHERNANDEZ', tipoUsuario: 'CAPTURISTA', vigenciaFini: null, vigenciaFechafin: null, estatus: 'ACTIVO' },
    { usuario: 'EVILLANUEVA', tipoUsuario: 'CONSULTA', vigenciaFini: null, vigenciaFechafin: null, estatus: 'ACTIVO' },
    { usuario: 'AMENDEZ', tipoUsuario: 'CAPTURISTA', vigenciaFini: null, vigenciaFechafin: null, estatus: 'ACTIVO' },
    { usuario: 'ACONTRERAS', tipoUsuario: 'CONSULTA', vigenciaFini: null, vigenciaFechafin: null, estatus: 'INACTIVO' },
];

const sinPassword = ({ passwordHash: _passwordHash, ...usuario }: UsuarioGuardado): Usuario => usuario;

/**
 * Repositorio en memoria: se usa mientras no hay conexión a PostgreSQL.
 * Los datos no sobreviven a un reinicio del servidor.
 */
export class MemoryUsersRepository implements UsersRepository {
    private readonly store: UsuarioGuardado[] = [];
    private nextId = 1;

    constructor() {
        const seedHash = bcrypt.hashSync(SEED_PASSWORD, 10);
        for (const usuario of SEED_USUARIOS) {
            this.store.push({ ...usuario, id: this.nextId++, passwordHash: seedHash });
        }
    }

    listar(): Promise<Usuario[]> {
        return Promise.resolve(this.store.map(sinPassword));
    }

    buscarPorId(id: number): Promise<Usuario | null> {
        const guardado = this.store.find((usuario) => usuario.id === id);
        return Promise.resolve(guardado ? sinPassword(guardado) : null);
    }

    buscarPorUsuario(usuario: string): Promise<UsuarioConPassword | null> {
        const guardado = this.store.find((item) => item.usuario === usuario);
        return Promise.resolve(guardado ? { ...guardado } : null);
    }

    crear(input: UsuarioAltaInput): Promise<Usuario> {
        const guardado: UsuarioGuardado = { ...input, id: this.nextId++ };
        this.store.push(guardado);
        return Promise.resolve(sinPassword(guardado));
    }

    modificar(id: number, input: UsuarioInput): Promise<Usuario | null> {
        const guardado = this.store.find((usuario) => usuario.id === id);
        if (!guardado) return Promise.resolve(null);

        const { passwordHash, ...datos } = input;
        Object.assign(guardado, datos, passwordHash ? { passwordHash } : {});

        return Promise.resolve(sinPassword(guardado));
    }

    eliminar(id: number): Promise<boolean> {
        const index = this.store.findIndex((usuario) => usuario.id === id);
        if (index === -1) return Promise.resolve(false);
        this.store.splice(index, 1);
        return Promise.resolve(true);
    }

    existeUsuario(usuario: string, excluirId?: number): Promise<boolean> {
        const encontrado = this.store.some(
            (item) => item.usuario === usuario && item.id !== excluirId,
        );
        return Promise.resolve(encontrado);
    }
}
