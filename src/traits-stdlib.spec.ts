/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import * as chai from "chai"
import sinon     from "sinon"
import sinonChai from "sinon-chai"

import { derive } from "@rse/traits"
import { Subscribable, Bindable, bindable, Hookable }  from "./traits-stdlib"

const expect = chai.expect
chai.config.includeStack = true
chai.use(sinonChai)

describe("@rse/traits-stdlib", () => {
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

    it("Bindable", async () => {
        expect(Bindable).to.be.a("function")
        interface State { foo: number, bar: string }
        class App extends derive(Bindable<State>) implements State {
            @bindable accessor foo = 42
            @bindable accessor bar = "barx"
            constructor () {
                super({})
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
        app.$set("foo", 7)
        console.log("foo=", app.$get("foo"))
        app.$set("bar", "barrrrr")
        console.log("bar=", app.$get("bar"))
        app.raise()
        console.log("foo=", app.foo)
        console.log("bar=", app.bar)
        app.foo += 1
        app.bar += "y"
        console.log("foo=", app.foo)
        console.log("bar=", app.bar)
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
})

