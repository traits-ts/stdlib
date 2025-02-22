---
lang: en
---

<img src="https://raw.githubusercontent.com/rse/traits/refs/heads/master/etc/logo.svg" width="200" style="float: right" align="right" alt=""/>

Traits Standard Library
=======================

**Traits for TypeScript Classes: Standard Library**

<p/>
<img src="https://nodei.co/npm/@rse/traits-stdlib.png?downloads=true&stars=true" alt=""/>

[![github (author stars)](https://img.shields.io/github/stars/rse?logo=github&label=author%20stars&color=%233377aa)](https://github.com/rse)
[![github (author followers)](https://img.shields.io/github/followers/rse?label=author%20followers&logo=github&color=%234477aa)](https://github.com/rse)
<br/>
[![npm (project release)](https://img.shields.io/npm/v/@rse/traits-stdlib?logo=npm&label=npm%20release&color=%23cc3333)](https://npmjs.com/@rse/traits)
[![npm (project downloads)](https://img.shields.io/npm/dm/@rse/traits-stdlib?logo=npm&label=npm%20downloads&color=%23cc3333)](https://npmjs.com/@rse/traits)

About
-----

This is a small TypeScript library providing a standard library
of reusable, generic, typed traits (aka mixins), based on the
[@rse/traits](https://npmjs.org/@rse/traits) base library. Currently,
this standard library consists of the reusable traits *Identifiable*,
*Configurable*,*Bindable*, *Subscribable*, *Hookable*, *Disposable*,
*Traceable*, and *Serializable*. All traits try to avoid any namespace
conflicts with application code by prefixing their exposed functionality
with the name prefix `$`.

Installation
------------

```sh
$ npm install --save @rse/traits @rse/traits-stdlib
```

Trait: *Identifiable*
---------------------

The reusable generic trait *Identifiable* allows you to attach a
Universally Unique Identifier (UUID, version 1) to the ojects of a
target class. You can then retrieve the UUID with the (read-only) `$id`
property. Apply an *Identifiable* for unique identification.

```ts
import { derive }       from "@rse/traits"
import { Identifiable } from "@rse/traits-stdlib"

class Sample extends derive(Identifiable) {}

const sample = new Sample()

sample.$id // -> e.g. "cbd8f4a0-f115-11ef-8f81-38f9d30d57c1"
```

Trait: *Configurable*
---------------------

The reusable generic trait *Configurable* allows you to attach a
fully typed and mergable configuration `T` of `Configurable<T>` to the objects
of a target class. You have to initialize the configuration through
property `$configuration` and later you can retrieve the current
configuration with it again. You can change the configuration with the
method `$configure` by passing any subset (aka a "deep partial") of `T`
and this way "merge" your changes into the configuration.
Apply a *Configurable* for incrementally changing a configuration.

```ts
import { derive }       from "@rse/traits"
import { Configurable } from "@rse/traits-stdlib"

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
    } satisfies Config
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
class. One can then bind to those properties with method `$bind` and
observe all changes to the property. Apply a *Bindable* for externally
observing and reacting to property changes.

```ts
import { derive }             from "@rse/traits"
import { Bindable, bindable } from "@rse/traits-stdlib"

interface Props { foo: number, bar: string }

class Sample extends derive(Bindable<Props>) implements Props {
    @bindable accessor foo = 42
    @bindable accessor bar = "bar"
}

const sample = new Sample()
const b1 = sample.$bind("foo", (val, old) => { console.log("foo:", val, old) })
const b2 = sample.$bind("bar", (val, old) => { console.log("bar:", val, old) })

sample.foo += 1            // -> "foo: 43 42"
sample.bar = "baz"         // -> "bar: baz bar"

b1.unbind()
b2.unbind()
```

Trait: *Subscribable*
---------------------

The reusable generic trait *Subscribable* allows you to subscribe to
typed events emitted on a target class. The events have to be defined
in an interface `T` of `Subscribable<T>`. One can then subscribe to
those events with method `$subscribe` and emit those events with method
`$emit`. Apply a *Subscribable* for externally observing and reacting to
logical events.

```ts
import { derive }       from "@rse/traits"
import { Subscribable } from "@rse/traits-stdlib"

interface Events { foo: number, bar: string }

class Sample extends derive(Subscribable<Events>) {}

const sample = new Sample()
const s1 = sample.$subscribe("foo", (val) => { console.log("foo:", val) } }, { limit: 1 })
const s2 = sample.$subscribe("bar", (val) => { console.log("bar:", val) } })

sample.$emit("foo", 42)      // -> "foo: 42"
sample.$emit("foo", 7)       // -> (none)
sample.$emit("bar", "quux")  // -> "bar: quux"
sample.$emit("bar", "baz")   // -> "bar: baz"

s1.unsubscribe()
s2.unsubscribe()
```

Trait: *Hookable*
-----------------

The reusable generic trait *Hookable* allows you to attach hooks to
a target class. The hooks have to be defined in an interface `T` of
`Hookable<T>`. One can then latch into those hooks with method `$latch`
and call those hooks with method `$hook`. Apply a *Hookable* for
externally extending functionality.

```ts
import { derive }   from "@rse/traits"
import { Hookable } from "@rse/traits-stdlib"

interface Hooks {
    "foo":  { foo2: string },
    "bar":  { bar2: number },
    "quux": undefined
}
class Sample extends derive(Hookable<Hooks>) {}

const sample = new Sample()
const l1 = sample.$latch("foo", { limit: 2 }, async (h, data) => {
    console.log("foo:", data)
    return h.CONTINUE
})
const l2 = sample.$latch("bar", { pos: "late" }, async (h, data) => {
    console.log("bar: start:", data)
    return new Promise((resolve) => {
        console.log("bar: end:", data)
        resolve(h.FINISH)
    })
})
const l3 = sample.$latch("quux", async (h) => {
    console.log("quux")
    return h.CONTINUE
})

sample.$hook("foo",  { foo2: "foo1" }) // -> "foo: foo1"
sample.$hook("foo",  { foo2: "foo2" }) // -> "foo: foo2"
sample.$hook("foo",  { foo2: "foo3" }) // -> (none)
sample.$hook("bar",  { bar2: 42 })     // -> "bar: start: 42", "bar: end: 42"
sample.$hook("quux")                   // -> "quux"

l1.unlatch()
l2.unlatch()
l3.unlatch()
```

Trait: *Disposable*
-------------------

Trait: *Traceable*
------------------

Trait: *Serializable*
---------------------

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

