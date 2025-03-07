
<img src="https://raw.githubusercontent.com/traits-ts/core/refs/heads/master/etc/logo.svg" width="200" style="float: right" align="right" alt=""/>

@traits-ts/stdlib
=================

**Traits for TypeScript Classes (Standard Library)**

<p/>
<a href="https://traits-ts.org">Project Home</a> |
<a href="https://github.com/traits-ts/stdlib">Github Repository</a> |
<a href="https://npmjs.com/@traits-ts/stdlib">NPM Distribution</a>

<p/>
<img src="https://nodei.co/npm/@traits-ts/stdlib.png?downloads=true&stars=true" alt=""/>

[![github (author stars)](https://img.shields.io/github/stars/rse?logo=github&label=author%20stars&color=%233377aa)](https://github.com/rse)
[![github (author followers)](https://img.shields.io/github/followers/rse?label=author%20followers&logo=github&color=%234477aa)](https://github.com/rse)
<br/>
[![npm (project release)](https://img.shields.io/npm/v/@traits-ts/stdlib?logo=npm&label=npm%20release&color=%23cc3333)](https://npmjs.com/@traits-ts/core)
[![npm (project downloads)](https://img.shields.io/npm/dm/@traits-ts/stdlib?logo=npm&label=npm%20downloads&color=%23cc3333)](https://npmjs.com/@traits-ts/core)

About
-----

This is a TypeScript library providing a set of standard,
reusable, generic, typed *traits* (aka *mixins*), based on the
[@traits-ts/core](https://github.com/traits-ts/core) library. 

Currently,
this standard library consists of the reusable traits *Identifiable*,
*Configurable*, *Bindable*, *Subscribable*, *Hookable*, *Finalizable*,
*Traceable*, and *Serializable*. All traits try to avoid any namespace
conflicts with application code by prefixing their exposed functionality
with the name prefix `$`.

See also [@traits-ts/core](https://github.com/traits-ts/core) for
more details on the underlying core **traits** mechanism.

Installation
------------

```sh
$ npm install --save @traits-ts/core @traits-ts/stdlib
```

Trait: *Identifiable*
---------------------

The reusable generic trait *Identifiable* allows you to attach a
Universally Unique Identifier (UUID, version 1) to the objects of a
target class. You can then retrieve the UUID with the (read-only) `$id`
property. Apply an *Identifiable* for unique identification.

```ts
import { derive }       from "@traits-ts/core"
import { Identifiable } from "@traits-ts/stdlib"

class Sample extends derive(Identifiable) {}

const sample = new Sample()

sample.$id // -> e.g. cbd8f4a0-f115-11ef-8f81-38f9d30d57c1
```

Trait: *Configurable*
---------------------

The reusable generic trait *Configurable* allows you to attach a fully
typed and mergable configuration `T` of `Configurable<T>` to the objects
of a target class. You have to initialize the configuration through
property `$configuration` and later you can retrieve the current
configuration through it again. You can change the configuration with
the method `$configure` by passing any subset (aka a "deep partial") of
`T` and this way "merge" your changes into the configuration. Apply a
*Configurable* for incrementally changing a configuration.

```ts
import { derive }       from "@traits-ts/core"
import { Configurable } from "@traits-ts/stdlib"

type Config = {
    foo: number,
    bar: string
    baz: {
        quux: boolean
    }
}
class Sample extends derive(Configurable<Config>) {
    $configuration = {
        foo: 42,
        bar: "bar",
        baz: {
            quux: true
        }
    }
}

const sample = new Sample()

sample.$configuration // -> { foo: 42, bar: "bar", baz: { quux: true } }

sample.$configure({ bar: "baz", baz: { quux: false } })
sample.$configuration // -> { foo: 42, bar: "baz", baz: { quux: false } }
```

Trait: *Bindable*
-----------------

The reusable generic trait *Bindable* allows you to bind to properties
of a target class. The properties have to be defined in an interface
`T` of `Bindable<T>` and defined as `@bindable accessor` on the target
class. You can then bind to those properties with method `$bind` and
observe all changes to the property. Apply a *Bindable* for allowing
the external observing and reacting to property changes.

```ts
import { derive }             from "@traits-ts/core"
import { Bindable, bindable } from "@traits-ts/stdlib"

interface Props { foo: number, bar: string }

class Sample extends derive(Bindable<Props>) implements Props {
    @bindable accessor foo = 42
    @bindable accessor bar = "bar"
}

const sample = new Sample()
const b1 = sample.$bind("foo", (val, old) => { console.log("foo:", val, old) })
const b2 = sample.$bind("bar", (val, old) => { console.log("bar:", val, old) })

sample.foo += 1    // -> foo: 43 42
sample.bar = "baz" // -> bar: baz bar

b1.unbind()
b2.unbind()
```

Trait: *Subscribable*
---------------------

The reusable generic trait *Subscribable* allows you to subscribe to
typed events emitted on a target class. The events have to be defined
in an interface `T` of `Subscribable<T>`. You can then subscribe to
those events with method `$subscribe` and emit those events with method
`$emit`. Apply a *Subscribable* for allowing the external observing and
reacting to logical events.

```ts
import { derive }       from "@traits-ts/core"
import { Subscribable } from "@traits-ts/stdlib"

interface Events { "foo": number, "bar": string }

class Sample extends derive(Subscribable<Events>) {}

const sample = new Sample()
const s1 = sample.$subscribe("foo", { limit: 1 }, (val) => {
    console.log("foo:", val)
})
const s2 = sample.$subscribe("bar", (val) => {
    console.log("bar:", val)
})

sample.$emit("foo", 42)      // -> foo: 42
sample.$emit("foo", 7)       // -> (none)
sample.$emit("bar", "quux")  // -> bar: quux
sample.$emit("bar", "baz")   // -> bar: baz

s1.unsubscribe()
s2.unsubscribe()
```

Trait: *Hookable*
-----------------

The reusable generic trait *Hookable* allows you to attach hooks to
a target class. The hooks have to be defined in an interface `T` of
`Hookable<T>`. You can then latch into those hooks with method `$latch`
and call those hooks with method `$hook`. Apply a *Hookable* for
allowing the external extension of functionality.

```ts
import { derive }   from "@traits-ts/core"
import { Hookable } from "@traits-ts/stdlib"

interface Hooks {
    "foo":  { arg: string },
    "bar":  { arg: number },
    "quux": undefined
}
class Sample extends derive(Hookable<Hooks>) {}

const sample = new Sample()
const l1 = sample.$latch("foo", { limit: 2 }, async (h, data) => {
    console.log("foo:", data)
    return Hookable.CONTINUE
})
const l2 = sample.$latch("bar", { pos: "late" }, async (h, data) => {
    console.log("bar: start:", data)
    return new Promise((resolve) => {
        console.log("bar: end:", data)
        resolve(Hookable.FINISH)
    })
})

sample.$hook("foo", { arg: "foo1" }) // -> foo: { arg: foo1 }
sample.$hook("foo", { arg: "foo2" }) // -> foo: { arg: foo2 }
sample.$hook("foo", { arg: "foo3" }) // -> (none)
sample.$hook("bar", { arg: 42 })     // -> bar: start: { arg: 42 }, bar: end: { arg: 42 }

l1.unlatch()
l2.unlatch()
l3.unlatch()
```

Trait: *Finalizable*
-------------------

The reusable generic trait *Finalizable* allows you to potentially react when a
target class is finalized (disposed by garbage collection). You can observe the
finalization event by overriding method `$finalize`. Apply a *Finalizable*
for allowing you to take optional action before garbage collection.

NOTICE: internally, the standard mechanism `FinalizationRegistry` is
used and there is no guarantee that the `$finalize` method is called soon
after garbage collection of the target class or even called at all. Hence,
use the `$finalize` method just for fully optional memory deallocation
tasks only, please.

```ts
import { derive }      from "@traits-ts/core"
import { Finalizable } from "@traits-ts/stdlib"

class Sample extends derive(Finalizable) {
    $finalize () {
        console.log("finalized")
    }
}

const sample = new Sample()
```

Trait: *Traceable*
------------------

The reusable generic trait *Traceable* allows you to perform
simple log-level based logging from within a target class. The
available log-levels have to be defined in a string-union type `T` of
`Traceable<T>` and the corresponding string-array property `$logLevels`
on the target class. The current log-level has to be defined with
the string property `$logLevel`. The generated output is by default
suppressed, but can be output by defining the function property
`$logOutput`. The log entries can be generated by the method `$log`.
Apply a *Traceable* for allowing a target class to perform simple
logging.

```ts
import { derive }    from "@traits-ts/core"
import { Traceable } from "@traits-ts/stdlib"

type  LogLevelsType   = "ERROR" | "WARNING" | "INFO"
const LogLevelsDefine = [ "ERROR", "WARNING", "INFO" ] satisfies LogLevelsType[]

class Sample extends derive(Traceable<LogLevelsType>) {
    $logLevels = LogLevelsDefine
    $logLevel  = "INFO" as LogLevelsType
    $logOutput = (line: string) => { console.log(line) }
    action () {
        this.$log("INFO", "sample", { foo: "bar", baz: 42 })
    }
}

const sample = new Sample()

sample.action() // -> <timestamp> [INFO] sample (foo: "bar", baz: 42)
```

Trait: *Serializable*
---------------------

The reusable generic trait *Serializable* allows you to export and
import the state of a target class. For this, the target class and its
state properties have to be decorated with `@serializable`. The class
and the graph of its dependencies then can be serialized/exported
with method `$serialize`. The serialized/exported state can be
deserialized/imported again with the static function `$unserialize`.
Apply a *Serializable* for allowing a target class and its dependencies
to be exported and imported.

```ts
import { derive }                     from "@traits-ts/core"
import { Serializable, serializable } from "@traits-ts/stdlib"

@serializable
class Sample extends derive(Serializable) {
    @serializable foo  = true
    @serializable bar  = 42
    @serializable baz  = new Set<Sample>()
    @serializable sub?: Sample = undefined
    constructor (sub?: Sample)  {
        super()
        if (sub) {
            this.sub = sub
            this.baz.add(sub)
        }
    }
}
const sample1 = new Sample()
const sample2 = new Sample(sample1)

const state = sample2.serialize() // -> { ... }

const sample1New = Sample.$unserialize(state)
const sample2New = sample1New.sub
```

License
-------

Copyright &copy; 2025 Dr. Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

