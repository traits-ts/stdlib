/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

/*  import testing libraries  */
import * as chai from "chai"
import sinon     from "sinon"
import sinonChai from "sinon-chai"

/*  import primary API  */
import { derive } from "@rse/traits"

/*  import secondary API  */
import {
    Identifiable,
    Configurable,
    Subscribable,
    Bindable, bindable,
    Hookable,
    Disposable,
    Traceable,
    Serializable, serializable
} from "./traits-stdlib"

/*  configure testing libraries  */
const expect = chai.expect
chai.config.includeStack = true
chai.use(sinonChai)

/*  utility type: deep variant of Partial<T>  */
type DeepPartial<T> = T extends object ? { [ P in keyof T ]?: DeepPartial<T[P]> } : T

/*  describe test suite  */
describe("@rse/traits-stdlib", () => {
    /*  test aspect: trait Indentifiable  */
    it("trait Identifiable", async () => {
        expect(Identifiable).to.be.a("object")

        class App extends derive(Identifiable) {}
        const app1 = new App()
        const app2 = new App()

        expect(app1.$id).to.match(/^.............-....-....-............$/)
        expect(app2.$id).to.match(/^.............-....-....-............$/)
        expect(app1.$id).to.be.not.equal(app2.$id)
    })

    /*  test aspect: trait Configurable  */
    it("trait Configurable", async () => {
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
            }
            sample () {
                return this.$configuration.baz.quux
            }
        }
        const app = new App()

        expect(app.sample()).to.be.equal(true)
        expect(app.$configuration).to.be.deep
            .equal({ foo: 42, bar: "bar", baz: { quux: true } })

        app.$configure({ foo: 7, baz: { quux: false } })

        expect(app.sample()).to.be.equal(false)
        expect(app.$configuration).to.be.deep
            .equal({ foo: 7, bar: "bar", baz: { quux: false } })
    })

    /*  test aspect: trait Bindable  */
    it("trait Bindable", async () => {
        expect(Bindable).to.be.a("function")

        interface State {
            foo: number,
            bar: string
        }
        class App extends derive(Bindable<State>) implements State {
            @bindable accessor foo = 42
            @bindable accessor bar = "baz"
            raise () {
                this.foo += 1
            }
        }

        const app = new App()

        const spy = sinon.spy()
        app.$bind("foo", { limit: 1 }, (val, old) => {
            spy(`foo1:${val}:${old}`)
        })
        app.$bind("foo", { prepend: true }, (val, old) => {
            spy(`foo2:${val}:${old}`)
        })
        app.$bind("bar", (val, old) => {
            spy(`bar:${val}:${old}`)
        })
        app.raise()
        app.raise()
        app.bar += "x"
        app.bar += "y"
        app.bar += "z"
        expect(spy.getCalls().map((x) => x.args[0]))
            .to.be.deep.equal([
                "foo2:43:42", "foo1:43:42",
                "foo2:44:43",
                "bar:bazx:baz",
                "bar:bazxy:bazx",
                "bar:bazxyz:bazxy"
            ])
    })

    /*  test aspect: trait Subscribable  */
    it("trait Subscribable", async () => {
        expect(Subscribable).to.be.a("function")

        interface Events {
            "foo": number,
            "bar": string
        }
        class App extends derive(Subscribable<Events>) {
            raise () {
                this.$emit("foo", 42)
                this.$emit("bar", "quux")
            }
        }
        const app = new App()

        const spy = sinon.spy()
        app.$subscribe("foo", { limit: 1 }, (val) => {
            spy(`foo1:${val}`)
        })
        app.$subscribe("foo", { prepend: true }, (val) => {
            spy(`foo2:${val}`)
        })
        app.$subscribe("bar", (val) => {
            spy(`bar:${val}`)
        })
        app.raise()
        app.raise()
        app.raise()
        expect(spy.getCalls().map((x) => x.args[0]))
            .to.be.deep.equal([
                "foo2:42", "foo1:42",
                "bar:quux",
                "foo2:42",
                "bar:quux",
                "foo2:42",
                "bar:quux"
            ])
    })

    it("Hookable", async () => {
        expect(Hookable).to.be.a("function")
        interface Hooks {
            "foo":  { foo2: string },
            "bar":  { bar2: number },
            "quux": undefined
        }
        class App extends derive(Hookable<Hooks>) {}
        const app = new App()
        app.$latch("foo", { limit: 2 }, async (data) => {
            console.log("foo", data)
            return Hookable.CONTINUE
        })
        app.$latch("bar", { pos: "late" }, (data) => {
            console.log("bar start", data)
            return new Promise((resolve) => {
                console.log("bar end", data)
                resolve(Hookable.FINISH)
            })
        })
        app.$hook("foo", { foo2: "aha" })
        app.$hook("foo", { foo2: "soso" })
        app.$hook("foo", { foo2: "hmm" })
        app.$hook("bar", { bar2: 42 })
    })

    it("Disposable", async () => {
        expect(Disposable).to.be.a("object")
        class App extends derive(Disposable) {
            constructor () {
                super()
                console.log("CREATE")
            }
            $dispose () {
                console.log("DISPOSE")
            }
        }
        const app = new App()
    })

    it("Traceable", async () => {
        expect(Traceable).to.be.a("function")
        type  LogLevelsType   = "ERROR" | "WARNING" | "INFO"
        const LogLevelsDefine = [ "ERROR", "WARNING", "INFO" ] satisfies LogLevelsType[]
        interface LogEvents { "log": string }
        class Sample extends derive(Traceable<LogLevelsType>, Subscribable<LogEvents>) {
            $logLevels = LogLevelsDefine
            $logLevel  = "INFO" as LogLevelsType
            $logOutput = (line: string) => { this.$emit("log", line) }
            action () {
                this.$log("INFO", "test", { foo: "bar" })
            }
        }
        const sample = new Sample()
        sample.$subscribe("log", (line) => {
            console.log("LOG", line)
        })
        sample.action()
    })

    it("Serializable", async () => {
        expect(Serializable).to.be.a("object")
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
        console.log(obj)
    })
})

