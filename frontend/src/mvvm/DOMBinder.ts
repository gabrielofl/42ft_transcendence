import { ReactiveViewModel } from "./ReactiveViewModel";

/**
 * Representa un enlace de datos entre una propiedad del ViewModel y un elemento del DOM.
 *
 * ### Tipos de Enlace (Atributos HTML):
 * - `data-bind-text="path.to.value"`: Muestra el valor de la propiedad como texto en el elemento.
 *   Ej: `<span data-bind-text="player.name"></span>`
 *
 * - `data-bind-image="path.to.url"`: Usa el valor de la propiedad como URL para un `background-image`.
 *   Ej: `<div data-bind-image="player.avatar"></div>`
 *
 * - `data-bind-list="path.to.collection"`: Renderiza una lista de elementos a partir de un array u objeto.
 *   Requiere un atributo `data-template="#templateId"` para especificar la plantilla de cada ítem.
 *   Ej: `<div data-bind-list="players" data-template="#player-card-template"></div>`
 *
 * ### Variables reservadas en plantillas para `data-bind-list`:
 * Dentro de un `<template>`, puedes usar las siguientes variables:
 * - `\${key}`: Se reemplaza por la ruta completa a la propiedad del ítem actual en el ViewModel.
 *   Por ejemplo, para un ítem en `players[0]`, `key` sería `players[0]`. Esto permite anidar bindings.
 *   Ej: `<span data-bind-text="\${key}.score"></span>`
 * - `\${item}`: Se reemplaza por el valor del ítem actual. Si el ítem es un objeto, no es directamente útil para mostrar,
 *   pero si es un valor primitivo (ej. un array de strings), se puede mostrar.
 *
 * ### Ruta especial `*`:
 * - `data-bind-list="*"`: Un caso especial que itera sobre todas las propiedades de primer nivel del objeto `data` del ViewModel.
 *   Es útil para renderizar un conjunto de datos cuya estructura se conoce en tiempo de ejecución.
 */
interface Binding {
    element: HTMLElement;
    attr: string;
    path: string;
    templateId?: string;
}

/**
 * Se encarga de enlazar el `ReactiveViewModel` con el DOM.
 * Escucha los cambios en el ViewModel y actualiza los elementos HTML
 * que tienen atributos de enlace de datos (ej. `data-bind-text`).
 */
export class DOMBinder {
    private bindings: Binding[] = [];

    /**
     * @param viewModel La instancia de `ReactiveViewModel` a observar.
     */
    constructor(private viewModel: ReactiveViewModel) {
        this.viewModel.OnChange((changedPath, value) => {
            for (const b of this.bindings) {
                if (changedPath === b.path) {
                    this.ApplyBinding(b, value);
                }
            }
        });
    }

    /**
     * Registra los enlaces de datos dentro de un elemento HTML y sus descendientes.
     * Busca atributos como `data-bind-text`, `data-bind-image`, etc., y aplica el valor inicial.
     * @param element El elemento raíz desde el cual buscar los enlaces.
     */
    public RegisterBindings(element: HTMLElement): void {
        const bindableAttrs = ["data-bind-text", "data-bind-image", "data-bind-list"];

        bindableAttrs.forEach(attr => {
            const elements = element.querySelectorAll<HTMLElement>(`[${attr}]`);
            elements.forEach(el => {
                const path = el.getAttribute(attr)!;
                const templateId = el.getAttribute("data-template") ?? undefined;
                let binding: Binding = { element: el, attr, path, templateId };
                this.bindings.push(binding);

                this.ApplyBinding(binding, this.viewModel.Get(path)); // Insertar valor inicial
            });
        });
    }

    /**
     * Aplica un enlace de datos a un elemento HTML, actualizando su contenido o estilo.
     * @param binding El objeto de enlace que contiene el elemento, atributo y ruta.
     * @param value El nuevo valor a aplicar.
     */
    private ApplyBinding(binding: Binding, value: any) {
        console.log(`Aplicando binding: ${JSON.stringify(binding)} con valor: ${JSON.stringify(value)}`);
        switch (binding.attr) {
            case "data-bind-text":
                binding.element.textContent = String(value ?? '');
                break;

            case "data-bind-image":
                if (value) {
                    binding.element.style.backgroundImage = `url(${value})`;
                    binding.element.style.backgroundSize = "cover";
                    binding.element.style.backgroundPosition = "center";
                } else {
                    binding.element.style.backgroundImage = "";
                }
                break;

            case "data-bind-list":
                this.RenderListBinding(binding, value, binding.templateId);
                break;
        }
    }

    /**
     * Reemplaza los marcadores de posición en una cadena de plantilla con datos de un objeto.
     * Los marcadores tienen el formato `${key}`.
     * @param template La cadena de la plantilla HTML.
     * @param data Un objeto con los valores a reemplazar.
     * @returns La cadena de plantilla con los valores reemplazados.
     */
    private ReplaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
        if (!template)
            return '';
	    return template.replace(/\$\{(\w+)\}/g, (_, key) => data[key] ?? '');
    }

    /**
     * Renderiza una lista de elementos en el DOM utilizando una plantilla.
     * @param binding El enlace de tipo `data-bind-list`.
     * @param value El array u objeto que contiene los datos de la lista.
     * @param templateId El ID del elemento `<template>` a utilizar para cada ítem.
     */
    private RenderListBinding(binding: Binding, value: any, templateId?: string) {
        const template = templateId ? document.querySelector<HTMLTemplateElement>(templateId) : null;
        if (!template) {
            console.warn(`Template no encontrado: ${templateId}`);
            return;
        }

        binding.element.innerHTML = "";

        if (!value)
            return;

        const isArray = Array.isArray(value);
        const entries = isArray
            ? value.map((v, i) => [i.toString(), v])
            : Object.entries(value);

        for (const [key, item] of entries) {
            const isThis: boolean = binding.path === '*';
            const basePath = isThis ? '' : binding.path;
            const newKey = isArray ? basePath + "[" + key + "]" : (isThis ? basePath : basePath + ".") + key;
            
            const html = this.ReplaceTemplatePlaceholders(template.innerHTML, { key: newKey, item });
            const fragment = document.createRange().createContextualFragment(html);
            this.RegisterBindings(fragment as unknown as HTMLElement);
            binding.element.appendChild(fragment);
        }
    }
}
