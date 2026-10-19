import {
    ESTATUS_OPCIONES,
    TIPO_USUARIO_OPCIONES,
    type Usuario,
    type UsuarioEstatus,
    type UsuarioTipo,
} from '../db/usersRepository';

export interface UsuarioPayload {
    usuario?: unknown;
    password?: unknown;
    tipoUsuario?: unknown;
    vigenciaFini?: unknown;
    vigenciaFechafin?: unknown;
    estatus?: unknown;
}

export type UsuarioValidado = Omit<Usuario, 'id'> & { password: string | null };

export type ResultadoValidacion =
    | { ok: true; value: UsuarioValidado }
    | { ok: false; errores: string[] };

const PASSWORD_MINIMA = 6;
const USUARIO_MINIMO = 3;
const USUARIO_MAXIMO = 30;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function soloTexto(valor: unknown): string {
    return typeof valor === 'string' ? valor.trim() : '';
}

function fechaValida(valor: string): boolean {
    if (!FECHA_ISO.test(valor)) return false;
    const [anio, mes, dia] = valor.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    return (
        fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia
    );
}

/** Normaliza y valida la carga de un usuario (alta o modificación). */
export function validarUsuario(
    payload: UsuarioPayload,
    { requierePassword }: { requierePassword: boolean },
): ResultadoValidacion {
    const errores: string[] = [];

    const usuario = soloTexto(payload.usuario).toUpperCase();
    if (!usuario) {
        errores.push('EL USUARIO ES OBLIGATORIO');
    } else if (usuario.length < USUARIO_MINIMO || usuario.length > USUARIO_MAXIMO) {
        errores.push(`EL USUARIO DEBE TENER ENTRE ${USUARIO_MINIMO} Y ${USUARIO_MAXIMO} CARACTERES`);
    }

    // En una modificación sin contraseña (null) se conserva la actual.
    const password = soloTexto(payload.password) || null;
    if (!password) {
        if (requierePassword) errores.push('LA CONTRASEÑA ES OBLIGATORIA');
    } else if (password.length < PASSWORD_MINIMA) {
        errores.push(`LA CONTRASEÑA DEBE TENER AL MENOS ${PASSWORD_MINIMA} CARACTERES`);
    }

    const tipoUsuario = soloTexto(payload.tipoUsuario) as UsuarioTipo;
    if (!TIPO_USUARIO_OPCIONES.includes(tipoUsuario)) {
        errores.push('EL TIPO DE USUARIO NO ES VÁLIDO');
    }

    const estatus = soloTexto(payload.estatus) as UsuarioEstatus;
    if (!ESTATUS_OPCIONES.includes(estatus)) {
        errores.push('EL ESTATUS NO ES VÁLIDO');
    }

    const vigenciaFini = soloTexto(payload.vigenciaFini) || null;
    if (vigenciaFini && !fechaValida(vigenciaFini)) {
        errores.push('LA VIGENCIA INICIAL NO ES UNA FECHA VÁLIDA');
    }

    const vigenciaFechafin = soloTexto(payload.vigenciaFechafin) || null;
    if (vigenciaFechafin && !fechaValida(vigenciaFechafin)) {
        errores.push('LA VIGENCIA FINAL NO ES UNA FECHA VÁLIDA');
    }

    if (vigenciaFini && vigenciaFechafin && vigenciaFini > vigenciaFechafin) {
        errores.push('LA VIGENCIA FINAL DEBE SER MAYOR O IGUAL A LA INICIAL');
    }

    if (errores.length > 0) return { ok: false, errores };

    return {
        ok: true,
        value: { usuario, password, tipoUsuario, vigenciaFini, vigenciaFechafin, estatus },
    };
}
