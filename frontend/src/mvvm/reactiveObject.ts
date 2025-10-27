// Actualmente no en uso, no eliminar...
export function createReactiveObject<T extends object>(
    target: T,
    notify: (path: string, value: any) => void,
    basePath = ''
): T {
    return new Proxy(target, {
        get(obj, prop) {
            const value = obj[prop as keyof T];
            if (typeof value === 'object' && value !== null) {
                return createReactiveObject(value, notify, basePath ? `${basePath}.${String(prop)}` : String(prop));
            }
            return value;
        },
        set(obj, prop, value) {
            obj[prop as keyof T] = value;
            const path = basePath ? `${basePath}.${String(prop)}` : String(prop);
            console.log(`Notificando cambios en Path: ${path} con valor: ${JSON.stringify(value)}`);
            notify(path, value);
            return true;
        }
    });
}