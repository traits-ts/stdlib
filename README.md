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
*Traceable*, and *Serializable*.

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
property.

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
observe all changes to the property.

```ts
import { derive }             from "@rse/traits"
import { Bindable, bindable } from "@rse/traits-stdlib"

interface Props { foo: number, bar: string }

class Sample extends derive(Bindable<Props>) implements Props {
    @bindable accessor foo = 42
    @bindable accessor bar = "bar"
    constructor () { super({}) }
}

const sample = new Sample()
sample.$bind("foo", (val, old) => { console.log("foo:", val, old) })
sample.$bind("bar", (val, old) => { console.log("bar:", val, old) })

sample.foo += 1            // -> "foo: 43 42"
sample.bar = "baz"         // -> "bar: baz bar"
```

Trait: *Subscribable*
---------------------

Trait: *Hookable*
-----------------

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

