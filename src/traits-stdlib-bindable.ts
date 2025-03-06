/*
**  @traits-ts/stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@rse/traits"

/*  types for the property handling  */
type PropMap                    = Record<string, any>
type PropKey<T extends PropMap> = string & keyof T
type PropReceiver<T>            = (valNew: T, valOld: T) => void

/*  types for the binding position  */
type  BindPosition      = "early" | "main" | "late"
const BindPositionNames = [ "early", "main", "late" ] satisfies Array<BindPosition>

/*  type for options of "bind"  */
type BindOptions = {
    pos?:    BindPosition
    limit?:  number
    async?:  boolean
}

/*  types and interface for internal binding store  */
type BindCallbackInfo<T extends any = any> = {
    fn:      PropReceiver<T>,
    limit:   number,
    async:   boolean
}
interface BindCallbacks {
    "early": Array<BindCallbackInfo>
    "main":  Array<BindCallbackInfo>
    "late":  Array<BindCallbackInfo>
}

/*  interface of type returned by "bind" for unbinding  */
interface Unbinder {
    unbind (): void
}

/*  the API decorator @bindable for auto-accessors  */
export function bindable<This, Value extends any> (
    target:  ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext<This, Value>
) {
    /*  sanity check context use  */
    if (context.kind !== "accessor")
        throw new Error("@bindable must be used on a class auto-accessor")

    /*  determine name of property  */
    const name = String(context.name)

    /*  return accessor decorator functions  */
    return {
        init (initialValue: Value) {
            /*  just pass-through value  */
            return initialValue
        },
        get (this: This) {
            /*  just pass-through "get" operation to standard auto-accessor function  */
            return target.get?.call(this)
        },
        set (this: This, newValue: Value) {
            /*  retrieve old value  */
            const oldValue = target.get?.call(this)

            /*  just pass-through "set" operation to standard auto-accessor function  */
            target.set?.call(this, newValue)

            /*  use the emitter bridge to raise the change event  */
            const __emit = (this as any).__emit as
                (prop: string, oldValue: unknown, newValue: unknown) => void
            __emit.call(this, name, newValue, oldValue)
        }
    }
}

/*  the API trait "Bindable<T>"  */
export const Bindable = <T extends PropMap>() => trait((base) => class Bindable extends base {
    /*  internal state  */
    #bindings = new Map<PropKey<T>, BindCallbacks>()

    /*  trait construction  */
    constructor (...args: any[]) {
        super(...args)

        /*  provide bridge from auto-accessor decorator to class instance  */
        Object.defineProperty(this, "__emit", {
            value: <K extends PropKey<T>>(prop: K, newValue: T[K], oldValue: T[K]): void => {
                const callbacks = this.#bindings.get(prop)
                if (callbacks !== undefined) {
                    /*  remember cleanups  */
                    const cleanups: Array<() => void> = []

                    for (const group of [ "early", "main", "late" ] as Array<BindPosition>) {
                        /*  iterate over all registered hooks  */
                        for (let i = 0; i < callbacks[group].length; i++) {
                            const info = callbacks[group][i]

                            /*  support limit  */
                            if (info.limit === 0) {
                                cleanups.push(() => {
                                    callbacks[group].splice(i, 1)
                                    if (   callbacks["early"].length === 0
                                        && callbacks["main"].length  === 0
                                        && callbacks["late"].length  === 0)
                                        this.#bindings.delete(prop)
                                })
                                continue
                            }
                            else if (info.limit > 0)
                                info.limit--

                            /*  call registered hook  */
                            if (info.async)
                                setTimeout(() => { info.fn(newValue, oldValue) }, 0)
                            else
                                info.fn(newValue, oldValue)
                        }
                    }

                    /*  execute cleanup  */
                    cleanups.forEach((cb) => { cb() })
                }
            },
            writable:     false,
            enumerable:   false,
            configurable: false
        })
    }

    /*  bind to a property change  */
    $bind<K extends PropKey<T>>(
        prop:        K,
        fn:          PropReceiver<T[K]>
    ): Unbinder
    $bind<K extends PropKey<T>>(
        prop:        K,
        options:     BindOptions,
        fn:          PropReceiver<T[K]>
    ): Unbinder
    $bind<K extends PropKey<T>>(
        prop:        K,
        optionsOrFn: BindOptions | PropReceiver<T[K]>,
        fn?:         PropReceiver<T[K]>
    ) {
        /*  determine options despite signature overloading  */
        const options = (fn ? optionsOrFn : {}) as BindOptions
        fn ??= optionsOrFn as PropReceiver<T[K]>

        /*  ensure that the bindings store has slots  */
        if (!this.#bindings.has(prop)) {
            this.#bindings.set(prop, {
                "early": [] as Array<BindCallbackInfo>,
                "main":  [] as Array<BindCallbackInfo>,
                "late":  [] as Array<BindCallbackInfo>
            } satisfies BindCallbacks)
        }

        /*  register the callback  */
        this.#bindings.get(prop)![options.pos ?? "main"].push({
            fn,
            limit: options.limit ?? -1,
            async: options.async ?? false
        })

        /*  provide unbinding  */
        const self = this
        return {
            unbind () {
                self.$unbind(prop, fn)
            }
        } satisfies Unbinder
    }

    /*  unbind from a property change  */
    $unbind<K extends PropKey<T>>(
        prop: K,
        fn:   PropReceiver<T[K]>
    ) {
        const callbacks = this.#bindings.get(prop)
        if (callbacks !== undefined) {
            /*  iterate over all groups  */
            for (const group of BindPositionNames) {
                /*  iterate over all registered callbacks  */
                for (let i = 0; i < callbacks[group].length; i++) {
                    const info = callbacks[group][i]
                    if (info.fn === fn) {
                        /*  delete registered callback  */
                        /* eslint @typescript-eslint/no-dynamic-delete: off */
                        callbacks[group].splice(i, 1)
                        if (   callbacks["early"].length === 0
                            && callbacks["main"].length  === 0
                            && callbacks["late"].length  === 0)
                            this.#bindings.delete(prop)
                        return
                    }
                }
            }
        }
        throw new Error("no such binding found")
    }
})

