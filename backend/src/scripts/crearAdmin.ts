/**
 * Crea un usuario ADMINISTRADOR (o recupera el acceso de uno existente) directamente en la BD.
 * Uso: npm run crear-admin -- USUARIO CONTRASEÑA
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { closePool, getPool, isDatabaseConfigured } from '../db/pool';
import { PostgresUsersRepository } from '../db/postgresUsersRepository';
import { validarUsuario } from '../validation/users';

async function main(): Promise<void> {
    const [usuarioArg, passwordArg] = process.argv.slice(2);

    if (!usuarioArg || !passwordArg) {
        throw new Error('Uso: npm run crear-admin -- USUARIO CONTRASEÑA');
    }
    if (!isDatabaseConfigured()) {
        throw new Error('Configure DATABASE_URL en el .env: el admin debe guardarse en la BD, no en memoria.');
    }

    const resultado = validarUsuario(
        {
            usuario: usuarioArg,
            password: passwordArg,
            tipoUsuario: 'ADMINISTRADOR',
            estatus: 'ACTIVO',
        },
        { requierePassword: true },
    );
    if (!resultado.ok) throw new Error(resultado.errores.join('\n'));

    const { password, ...valores } = resultado.value;
    const passwordHash = await bcrypt.hash(password!, 10);
    const repository = new PostgresUsersRepository(getPool());

    const existente = await repository.buscarPorUsuario(valores.usuario);
    if (existente) {
        // Se vuelve admin activo y sin vigencia, con la contraseña nueva.
        await repository.modificar(existente.id, { ...valores, passwordHash });
        console.log(`Usuario ${valores.usuario} actualizado como ADMINISTRADOR activo.`);
    } else {
        await repository.crear({ ...valores, passwordHash });
        console.log(`Usuario ${valores.usuario} creado como ADMINISTRADOR.`);
    }
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => closePool());
