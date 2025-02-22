/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait }        from "@rse/traits"

/*  utility types  */
type Cons  = { new (...args: any[]): {} }
type Value = any

/*  internal global metainfo of class to constructor mappings  */
const classMap = new Map<string, Cons>()

/*  internal global unique symbol  */
const metainfoKey = Symbol("serializable")

/*  utility type for metainfo  */
type Metainfo = { name: string, fields: Set<string> }

/*  utility function: check for metainfo existance  */
const hasMetainfo = (target: Cons) => {
    return Object.prototype.hasOwnProperty.call(target, metainfoKey)
}

/*  utility function: retrieve metainfo (and ad-hoc create it)  */
const getMetainfo = (target: Cons) => {
    let metainfo: Metainfo
    if (hasMetainfo(target))
        metainfo = (target as any)[metainfoKey]
    else {
        metainfo = { name: "", fields: new Set<string>() }
        Object.defineProperty(target, metainfoKey, {
            value:        metainfo,
            writable:     false,
            enumerable:   false,
            configurable: false
        })
    }
    return metainfo
}

/*  the API decorator @serializable for class and class fields  */
export function serializable<This = unknown, T extends Cons = Cons> (
    value: T, context: ClassDecoratorContext<T>
): T
export function serializable<This = unknown, T extends Value = Value> (
    value: T, context: ClassFieldDecoratorContext<This, T>
): (v: Value) => Value
export function serializable<This = unknown, T extends (Cons | Value) = Cons | Value> (
    value: T, context: ClassDecoratorContext<any> | ClassFieldDecoratorContext<This, T>
): any {
    /*  determine name of target  */
    const name = String(context.name)
    if (context.kind === "class") {
        const ctor = value as Cons
        context.addInitializer(function () {
            const metainfo = getMetainfo(ctor)
            metainfo.name = name
            classMap.set(name, ctor)
        })
        return value
    }
    else if (context.kind === "field") {
        /*  store meta-information  */
        context.addInitializer(function () {
            const ctor = (this as any).constructor
            const metainfo = getMetainfo(ctor)
            metainfo.fields.add(name)
        })
        return (initialValue: any): any => {
            return initialValue
        }
    }
    else
        throw new Error("@serializable must be used on class or class field")
}

/*  utility function: reference an object  */
const objRef = (obj: object, refs: Map<object, number>) => {
    if (refs.has(obj))
        return { id: refs.get(obj), made: false }
    else {
        const id = refs.size
        refs.set(obj, id)
        return { id, made: true }
    }
}

/*  utility type: node of serialized data  */
type SerializeNode = { t: string, i?: number, r?: number, v?: any }

/*  utility function: dereference or make an object  */
const objDerefOrMake = (node: SerializeNode, derefs: Map<number, object>, maker: (v: any) => any) => {
    if (node.i === undefined && node.r !== undefined && derefs.has(node.r))
        return derefs.get(node.r)
    else if (node.i !== undefined && node.r === undefined) {
        const obj = maker(node.v)
        derefs.set(node.i, obj)
        return obj
    }
    else
        throw new Error("invalid SerializeNode object")
}

/*  utility function: serialize data  */
const serialize = (obj: any, refs = new Map<object, number>()): SerializeNode => {
    if (obj && typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        if (obj instanceof Date) {
            /*  special object  */
            const { id, made } = objRef(obj, refs)
            if (made)
                return { t: "Date", i: id, v: obj.getTime() }
            else
                return { t: "Date", r: id }
        }
        else if (obj instanceof RegExp) {
            /*  special object  */
            const { id, made } = objRef(obj, refs)
            if (made)
                return { t: "RegExp", i: id, v: { s: obj.source, f: obj.flags } }
            else
                return { t: "RegExp", r: id }
        }
        else if (obj instanceof Set) {
            /*  special object  */
            const { id, made } = objRef(obj, refs)
            if (made)
                return {
                    t: "Set", i: id,
                    v: Array.from(obj).map((x) =>
                        serialize(x, refs) /* RECURSION */
                    )
                }
            else
                return { t: "Set", r: id }
        }
        else if (obj instanceof Map) {
            /*  special object  */
            const { id, made } = objRef(obj, refs)
            if (made)
                return {
                    t: "Map", i: id,
                    v: Array.from(obj.entries()).map(([ k, v ]) =>
                        [ k, serialize(v, refs) /* RECURSION */ ]
                    )
                }
            else
                return { t: "Map", r: id }
        }
        else if (hasMetainfo(obj.constructor)) {
            /*  custom object  */
            const metainfo = getMetainfo(obj.constructor)
            const { id, made } = objRef(obj, refs)
            if (made)
                return {
                    t: `user:${metainfo.name}`, i: id,
                    v: Array.from(metainfo.fields).map((field) =>
                        [ String(field), serialize(obj[field], refs) /* RECURSION */ ]
                    )
                }
            else
                return { t: `user:${metainfo.name}`, r: id }
        }
        else {
            /*  regular non-deep object  */
            const { id, made } = objRef(obj, refs)
            if (made)
                return {
                    t: "Object", i: id,
                    v: Object.keys(obj).map((field) =>
                        [ field, serialize(obj[field], refs) /* RECURSION */ ]
                    )
                }
            else
                return { t: "Object", r: id }
        }
    }
    else if (obj && typeof obj === "object" && obj !== null && Array.isArray(obj)) {
        const { id, made } = objRef(obj, refs)
        if (made)
            return {
                t: "Array", i: id,
                v: obj.map((el) => serialize(el, refs) /* RECURSION */)
            }
        else
            return { t: "Array", r: id }
    }
    else if (typeof obj === "symbol")
        return { t: "symbol", v: obj.description ?? "" }
    else if (typeof obj === "boolean")
        return { t: "boolean", v: obj }
    else if (typeof obj === "number")
        return { t: "number", v: obj }
    else if (typeof obj === "bigint")
        return { t: "bigint", v: obj.toString() }
    else if (typeof obj === "string")
        return { t: "string", v: obj }
    else if (Number.isNaN(obj))
        return { t: "NaN" }
    else if (obj === null)
        return { t: "null" }
    else if (obj === undefined)
        return { t: "undefined" }
    else
        throw new Error("invalid type of @serializable property")
}

/*  utility type: extract type of node  */
type ExtractNodeType<T extends { t: string }> =
    T["t"] extends infer U ? U : never

/*  utility function: serialize data  */
const unserialize = <T extends SerializeNode> (obj: T, derefs = new Map<number, object>()):
    ExtractNodeType<T> => {
    let val: any
    let m: RegExpMatchArray | null
    if (typeof obj === "object") {
        if (obj.t === "Date")
            val = objDerefOrMake(obj, derefs, (v) => new Date(v))
        else if (obj.t === "RegExp")
            val = objDerefOrMake(obj, derefs, (v) => new RegExp(v.s, v.f))
        else if (obj.t === "Set")
            val = objDerefOrMake(obj, derefs, (v) => {
                return new Set(v.map((v: any) => unserialize(v, derefs) /* RECURSION */))
            })
        else if (obj.t === "Map")
            val = objDerefOrMake(obj, derefs, (v) => {
                return new Map(v.map((v: any[2]) => [ v[0], unserialize(v[1], derefs) /* RECURSION */ ]))
            })
        else if ((m = obj.t.match(/^user:(.+)$/)) !== null) {
            const clz = m[1]
            val = objDerefOrMake(obj, derefs, (v: Array<[ string, SerializeNode ]>) => {
                const Ctor = classMap.get(clz)
                if (Ctor === undefined)
                    throw new Error(`invalid user-defined class ${clz}`)
                const obj = new Ctor()
                for (const [ key, val ] of v) {
                    const x: any = unserialize(val, derefs) /* RECURSION */
                    void ((obj as any)[key] = x)
                }
                return obj
            })
        }
        else if (obj.t === "Object") {
            val = objDerefOrMake(obj, derefs, (v: Array<[ string, SerializeNode ]>) => {
                const obj = {}
                for (const [ key, val ] of v) {
                    const x: any = unserialize(val, derefs) /* RECURSION */
                    void ((obj as any)[key] = x)
                }
                return obj
            })
        }
        else if (obj.t === "Array") {
            val = objDerefOrMake(obj, derefs, (v: SerializeNode[]) =>
                v.map((el) => unserialize(el, derefs) /* RECURSION */)
            )
        }
        else if (obj.t === "symbol")
            val = Symbol.for(obj.v)
        else if (obj.t === "boolean")
            val = Boolean(obj.v)
        else if (obj.t === "number")
            val = Number(obj.v)
        else if (obj.t === "bigint")
            val = BigInt(obj.v)
        else if (obj.t === "string")
            val = obj.v
        else if (obj.t === "NaN")
            val = NaN
        else if (obj.t === "null")
            val = null
        else if (obj.t === "undefined")
            val = undefined
        else
            throw new Error("invalid type of SerializeNode object")
    }
    else
        throw new Error("invalid SerializeNode object")
    return val as ExtractNodeType<T>
}

/*  the API trait "Serializable<T>"  */
export const Serializable = trait((base) => class Serializable extends base {
    /*  serialize all serializable fields into a graph  */
    $serialize (): string {
        return JSON.stringify(serialize(this))
    }

    /*  unserialize a graph   */
    static $unserialize (json: string) {
        let spec
        try {
            spec = JSON.parse(json)
        }
        catch (ex: any) {
            throw new Error(`failed to parse serialization specification: ${String(ex)}`)
        }
        return unserialize(spec)
    }
})

