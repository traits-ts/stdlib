/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@rse/traits"

/*  the API decorator @serializable for auto-accessors  */
export function serializable<This, Value extends any> (
    target:  ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext<This, Value>
) {
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

/*  the API trait "Serializable<T>"  */
export const Serializable = trait((base) => class Serializable extends base {
    /*  trait construction  */
    constructor (params: { [key: string]: unknown } | undefined) {
        super(params)
    }

    /*  serialize all properties  */
    $serialize (): string {
        return ""
    }

    /*  unserialize all properties  */
    $unserialize (json: string) {
    }
})

