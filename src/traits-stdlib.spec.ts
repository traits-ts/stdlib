/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import * as chai from "chai"
import sinon     from "sinon"
import sinonChai from "sinon-chai"

import { derive } from "@rse/traits"

import {
    Identifiable,
    Configurable,
    Subscribable,
    Bindable, bindable,
    Hookable,
    Serializable, serializable
}  from "./traits-stdlib"

const expect = chai.expect
chai.config.includeStack = true
chai.use(sinonChai)

type DeepPartial<T> = T extends object ? { [ P in keyof T ]?: DeepPartial<T[P]> } : T

describe("@rse/traits-stdlib", () => {

    it("Identifiable", async () => {
        expect(Identifiable).to.be.a("object")
        class App extends derive(Identifiable) {}
        const app1 = new App()
        const app2 = new App()
        expect(app1.$id).to.match(/^.............-....-....-............$/)
        expect(app2.$id).to.match(/^.............-....-....-............$/)
        expect(app1.$id).to.be.not.equal(app2.$id)
    })

    it("Configurable", async () => {
        expect(Configurable).to.be.a("function")
        type Config = {
            foo: number,
            bar: string
            baz: {
                quux: boolean
            }
        }
        class App extends derive(Configurable<Config>) {
            $configuration = {
                foo: 42,
                bar: "bar",
                baz: {
                    quux: true
                }
            } satisfies Config
            sample () {
                return this.$configuration.baz.quux
            }
        }
        const app = new App()
        expect(app.$configuration).to.be.deep.equal({ foo: 42, bar: "bar", baz: { quux: true } })
        app.$configure({ foo: 7, baz: { quux: false } })
        expect(app.$configuration).to.be.deep.equal({ foo: 7, bar: "bar", baz: { quux: false } })
    })

    it("Bindable", async () => {
        expect(Bindable).to.be.a("function")
        interface State { foo: number, bar: string }
        class App extends derive(Bindable<State>) implements State {
            @bindable accessor foo = 42
            @bindable accessor bar = "barx"
            constructor () {
                super()
                console.log("App")
            }
            raise () {
                this.foo += 1
            }
        }
        const app = new App()
        app.$bind("foo", (val, old) => {
            console.log("foo-bind", val, old)
        })
        app.$bind("bar", (val, old) => {
            console.log("bar-bind", val, old)
        })
        app.foo = 7
        console.log("foo=", app.$get("foo"))
        app.bar = "barrrrr"
        console.log("bar=", app.$get("bar"))
        app.raise()
        console.log("foo=", app.foo)
        console.log("bar=", app.bar)
        app.foo += 1
        app.bar += "y"
        console.log("foo=", app.foo)
        console.log("bar=", app.bar)
    })

    it("Subscribable", async () => {
        expect(Subscribable).to.be.a("function")
        interface Events {
            foo: number,
            bar: string
        }
        class App extends derive(Subscribable<Events>) {
            constructor () { super({}) }
            raise () {
                this.$emit("foo", 42)
                this.$emit("bar", "quux")
            }
        }
        const app = new App()
        app.$subscribe("foo", (val) => {
            expect(val).to.be.equal(42)
        }, { limit: 1 })
        app.$subscribe("bar", (val) => {
            expect(val).to.be.equal("quux")
        })
        app.raise()
    })

    it("Hookable", async () => {
        expect(Hookable).to.be.a("function")
        interface Hooks {
            "foo":  { foo2: string },
            "bar":  { bar2: number },
            "quux": undefined
        }
        class App extends derive(Hookable<Hooks>) {
            constructor () {
                super({})
            }
        }
        const app = new App()
        app.$latch("foo", { limit: 2 }, async (h, data) => {
            console.log("foo", h, data)
            return h.CONTINUE
        })
        app.$latch("bar", { pos: "late" }, async (h, data) => {
            console.log("bar start", data)
            return new Promise((resolve) => {
                console.log("bar end", data)
                resolve(h.FINISH)
            })
        })
        app.$latch("quux", async (h) => {
            return h.CONTINUE
        })
        app.$hook("foo", { foo2: "aha" })
        app.$hook("foo", { foo2: "soso" })
        app.$hook("foo", { foo2: "hmm" })
        app.$hook("bar", { bar2: 42 })
    })

    it("Serializable", async () => {
        expect(Serializable).to.be.a("object")
        interface Serializables {
            foo:  boolean
            bar:  number
            quux: string
        }
        /* eslint no-use-before-define: off */
        @serializable
        class App extends derive(Serializable) {
            @serializable foo  = true
            @serializable bar  = 42
            @serializable baz  = new Set<App>()
            @serializable baz2 = new Map<string, App>()
            @serializable quux = "quux"
            @serializable sub?: App = undefined
            constructor (sub?: App)  {
                console.log("App create")
                super()
                if (sub) {
                    this.sub = sub
                    this.baz.add(sub)
                    this.baz2.set("foo", sub)
                }
            }
        }
        const app1 = new App()
        const app2 = new App(app1)
        const x = app2.$serialize()
        console.log(x)
        const obj = App.$unserialize(x)
    })
})

