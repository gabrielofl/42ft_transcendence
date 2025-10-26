type Listener = (path: string, value: any) => void;

/**
 * Un ViewModel reactivo que almacena datos y notifica a los listeners cuando estos cambian.
 * Permite acceder y modificar datos anidados usando una ruta de cadena (ej. "user.profile.name").
 */
export class ReactiveViewModel<TData extends Record<string, any> = Record<string, any>> {
    public data: TData = {} as TData;
    private listeners: Set<Listener> = new Set();

    /**
     * Obtiene un valor del modelo de datos usando una ruta de cadena.
     * Soporta acceso a propiedades de objetos y elementos de arrays.
     * Ej: "user.score" o "user.inventory[0].path".
     * @param path La ruta al valor deseado. Si es '*', devuelve todo el objeto de datos.
     * @returns El valor encontrado en la ruta, o `undefined` si no existe.
     */
    public Get(path: string): any {
        if (path === '*') {
            return this.data;
        }

        return path.split('.').reduce((acc, key) => {
            const match = key.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const [, arrKey, index] = match;
                return acc?.[arrKey]?.[Number(index)];
            }
            return acc?.[key];
        }, this.data);
    }

    /**
     * Establece un valor en una ruta específica del modelo de datos y notifica a los listeners.
     * Si la ruta no existe, la crea.
     * @param path La ruta donde se establecerá el valor.
     * @param value El valor a establecer.
     */
    public Set(path: string, value: any): void {
        const keys = path.split('.');
        let target: Record<string, any> = this.data;

        // Detectar si es una propiedad de primer nivel nueva
        const isNewRoot = path != '*' && !(keys[0] in this.data);
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const match = key.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const [, arrKey, index] = match;
                target[arrKey] = target[arrKey] || [];
                target = target[arrKey][Number(index)] = target[arrKey][Number(index)] || {};
            } else {
                target[key] = target[key] || {};
                target = target[key];
            }
        }

        const lastKey = keys[keys.length - 1];
        const match = lastKey.match(/(\w+)\[(\d+)\]/);
        if (match) {
            const [, arrKey, index] = match;
            target[arrKey] = target[arrKey] || [];
            target[arrKey][Number(index)] = value;
        } else {
            target[lastKey] = value;
        }

        if (isNewRoot) {
            this.Notify('*', this.data); // Notificar si se creó un nuevo objeto raíz
        }
        this.Notify(path, value);
    }

    /**
     * Actualiza el modelo de datos de forma masiva a partir de un objeto.
     * Recorre el objeto y llama a `Set` para cada propiedad.
     * @param obj El objeto con los datos a actualizar.
     * @param prefix Un prefijo opcional para las rutas, usado en la recursión.
     */
    public UpdateFromObject(obj: Partial<TData>, prefix = ''): void {
        for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && !Array.isArray(value)) {
                this.UpdateFromObject(value, path);
            } else {
                this.Set(path, value);
            }
        }
    }

    /**
     * Registra una función que será llamada cada vez que un valor cambie.
     * @param listener La función a ejecutar, que recibe la ruta y el nuevo valor.
     */
    public OnChange(listener: Listener): void {
        this.listeners.add(listener);
    }

    /**
     * Notifica a todos los listeners registrados sobre un cambio.
     * @param path La ruta del dato que cambió.
     * @param value El nuevo valor.
     */
    private Notify(path: string, value: any): void {
        console.log(`Notificando cambios en Path: ${path} con valor: ${JSON.stringify(value)}`);
        this.listeners.forEach(fn => fn(path, value));
    }

    /**
     * Crea un objeto Proxy que se puede usar para interactuar con el ViewModel
     * de una manera más natural (ej. `proxy.user.score = 10`).
     * @param basePath La ruta base para este proxy.
     * @returns Un Proxy que intercepta las operaciones get, set y has.
     */
    public CreateProxy(basePath: string): any {
        const vm = this;
        const handler: ProxyHandler<any> = {
            get(_, prop: string) {
                const path = basePath ? `${basePath}.${prop}` : prop;
                const val = vm.Get(path);

                return (val && typeof val === "object") ? vm.CreateProxy(path) : val;
            },
            set(_, prop: string, value) {
                const path = basePath ? `${basePath}.${prop}` : prop;
                vm.Set(path, value);
                return true;
            },
            has(_, prop: string) {
                const path = basePath ? `${basePath}.${prop}` : prop;
                return vm.Get(path) !== undefined;
            }
        };
        return new Proxy({}, handler);
    }
}
