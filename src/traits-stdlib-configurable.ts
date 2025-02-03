/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@rse/traits"

/*  the type for the API  */
type ConfigurationKey = symbol | string
type ConfigurationVal = any
type Configuration    = {
    [ key: ConfigurationKey ]: ConfigurationVal | Configuration
}

/*  internal utility type for making everything optional  */
type DeepPartial<T> =
    T extends object ? {
        [ P in keyof T ]?: DeepPartial<T[P]>
    } : T

/*  internal utility function for checking for a plain object  */
const isObject = (item: any): item is object =>
    item && typeof item === "object" && !Array.isArray(item)

/*  internal utility function for deep merging  */
const mergeDeep = <T>(target: T, source: DeepPartial<T>): T => {
    if (Array.isArray(source) && Array.isArray(target)) {
        const maxLength = Math.max(target.length, source.length)
        for (let i = 0; i < maxLength; i++) {
            if (i in source) {
                if (i in target)
                    target[i] = mergeDeep(target[i], source[i] as any)
                else
                    target[i] = source[i] as any
            }
        }
        return target
    }
    else if (isObject(source) && isObject(target)) {
        const keys = [
            ...Object.keys(source),
            ...Object.getOwnPropertySymbols(source) as (string | symbol)[]
        ]
        for (const key of keys) {
            const sourceValue = (source as any)[key]
            const targetValue = (target as any)[key]
            if (Array.isArray(sourceValue) && Array.isArray(targetValue))
                (target as any)[key] = mergeDeep(targetValue, sourceValue)
            else if (isObject(sourceValue) && isObject(targetValue))
                (target as any)[key] = mergeDeep(targetValue, sourceValue)
            else
                (target as any)[key] = sourceValue
        }
        return target
    }
    else
        return source as T
}

/*  the API trait "Configurable<T>"  */
export const Configurable = <T extends Configuration>() =>
    trait((base) => class Configurable extends base {

    /*  configuration store  */
    $configuration: undefined | T = undefined

    /*  (re)-configure state  */
    $configure (configuration: DeepPartial<T>) {
        if (this.$configuration === undefined)
            throw new Error("$configuration has to be initialized")
        mergeDeep(this.$configuration, configuration)
    }
})

