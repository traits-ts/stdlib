/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait }        from "@rse/traits"
import EventEmitter     from "eventemitter2"

/*  types for the property handling  */
type PropMap                    = Record<string, any>
type PropKey<T extends PropMap> = string & keyof T
type PropReceiver<T>            = (valNew: T, valOld: T) => void

/*  interface of type returned by "bind" for unbinding  */
interface Unbinder {
    unbind (): void
}

/*  type for options of "bind"  */
type BindOptions = {
    prepend?: boolean
    limit?:   number
    async?:   boolean
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
    #emitter = new EventEmitter()

    /*  trait construction  */
    constructor (...args: any[]) {
        super(...args)

        /*  configure emitter  */
        this.#emitter.setMaxListeners(100)

        /*  provide bridge from auto-accessor decorator to class instance  */
        Object.defineProperty(this, "__emit", {
            value: <K extends PropKey<T>>(prop: K, oldValue: T[K], newValue: T[K]): void => {
                this.#emitter.emit(prop, oldValue, newValue)
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

        /*  pass-through functionality to internal EventEmitter  */
        if (options?.limit !== undefined) {
            if (options?.prepend)
                this.#emitter.prependMany(prop, options.limit, fn,
                    { ...(options?.async ? { async: true } : {}) })
            else
                this.#emitter.many(prop, options.limit, fn,
                    { ...(options?.async ? { async: true } : {}) })
        }
        else {
            if (options?.prepend)
                this.#emitter.prependListener(prop, fn,
                    { ...(options?.async ? { async: true } : {}) })
            else
                this.#emitter.on(prop, fn,
                    { ...(options?.async ? { async: true } : {}) })
        }
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
        this.#emitter.off(prop, fn)
    }
})

