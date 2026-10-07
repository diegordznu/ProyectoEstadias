export function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value?.trim()) {
        throw new Error(`Falta configurar la variable ${name} en el archivo .env`);
    }
    return value;
}
