# Pattern Recognition: Evidence-Based Catalog

This catalog is for **recognizing** patterns that already exist in code. It is
not for choosing patterns in a new design. Recognition fails in two ways:

- **False positives from names.** A class called `OrderFactory` whose single
  static method calls one constructor is not a Factory pattern in any useful
  sense. `ReportManager`, `DataHelper`, and `XService` say nothing at all.
- **False negatives from idioms.** A dictionary of functions keyed by payment
  type *is* a Strategy registry. An `EventEmitter` subscription *is*
  Observer. A chain of `.where().orderBy().take()` *is* a fluent interface.
  None of them carry the pattern's name.

## Evidence standard

A pattern claim needs **structural evidence**: the roles (participants) the
pattern defines, found in the code, doing what the pattern says they do.
Name each participant with a citation. When the only evidence is a name, the
claim goes under "Considered, not found".

### Pattern claim record

```markdown
### P-###-n — <Pattern> (<catalog>) — <form: classic | idiomatic | partial>
- **Where:** <component/module, `path:line` span>
- **Participants:** <role → concrete code element, each with citation>
  e.g., Strategy interface → `DayCountConvention` (`daycount.py:8`);
  concrete strategies → `Thirty360` (`:15`), `Actual365` (`:29`);
  context → `accrue_interest()` (`interest.py:12`) receives one and delegates.
- **Intent served here:** <what variation or force it handles in THIS system, in
  one sentence>
- **Conformance:** <consistent | partial | violated> — <evidence: e.g., "two
  callers bypass the registry and branch on `convention_code`"
  (`report.py:44`)>
- **Evidence tag:** [stated|inferred]
```

**Form** values:
- `classic`: textbook structure (interfaces and classes).
- `idiomatic`: the same intent through a language feature (functions,
  closures, decorators, modules, platform APIs).
- `partial`: some roles are present and others are missing or collapsed.
  State which ones.

**Conformance** values:
- `consistent`: used everywhere its intent applies.
- `partial`: used in some places, with the same concern handled ad hoc
  elsewhere.
- `violated`: the pattern exists, but code routinely goes around it. This is
  the most useful signal for architects.

## Architectural and layering styles

Identify layers from **dependency direction** (who imports whom), not only
from folder names. For each candidate layer, record what it contains, what it
may import, and what it actually imports. A layer violation is an import
against the intended direction. Cite it.

| Style | Structural evidence required | Traps |
|---|---|---|
| Layered (n-tier) | Presentation → business → data; imports flow one way | Folders named `services/` that import controllers |
| Hexagonal (ports & adapters) | Core defines interfaces (ports) for outside needs; adapters in outer modules implement them; core imports no framework/DB/HTTP code | Interfaces with a single implementation in the *same* module are not ports |
| Clean / Onion | Concentric: entities ← use cases ← interface adapters ← frameworks; inner rings import nothing outer | Directory named `clean/` with ORM annotations on entities → partial at best |
| MVC / MVP / MVVM | Distinct model, view, controller/presenter/view-model roles, with the view free of business logic | Framework "controllers" doing all the work = Transaction Script, not MVC separation |
| Vertical slice / feature-sliced | Each feature folder holds its own handler, model, and data access; little sharing across slices | Shared "common" folder holding most logic |
| Modular monolith | Modules with explicit public APIs; other modules import only those | Modules reaching into each other's internals |
| Microservices | Separately deployable services (own build/deploy units), communicating over network | Multiple folders in one deployable ≠ microservices |
| Event-driven | Producers publish events; consumers subscribe; producer doesn't know consumers | Direct method calls named `onX` |
| CQRS | Separate write model/commands from read model/queries, often with separate stores or projections | Just having methods named `get*` and `update*` |
| Pipes and filters | A chain of independent processing stages with a uniform interface | Plain sequential code |

## Application-level patterns

| Pattern | Structural evidence required | Idiomatic forms | Traps |
|---|---|---|---|
| Use Case / Interactor | One class/function per application operation (`CreateLoan`, `PostPayment`) with a single entry (`execute`/`handle`/`__call__`), orchestrating domain + ports; controllers delegate to it | Command handlers, MediatR `IRequestHandler`, function per use case | "Service" classes with 30 unrelated methods (Transaction Script / Service Layer, not use cases) |
| Command/Query handlers | Request objects + a handler per request, often dispatched by a mediator | MediatR, Axon, custom bus | — |
| Mediator pipeline | Central dispatcher + behaviors wrapping every request (validation, logging, transactions) | MediatR behaviors, middleware | — |
| Service Layer | A layer of application services defining the operation boundary, coordinating transactions | — | Anemic pass-throughs that add nothing |
| Transaction Script | Each operation is one procedure doing validation, logic, and persistence inline | Fat controllers, stored procedures | Not a defect by itself. It's a style; report it as one |
| Dependency Injection | Dependencies passed in (constructor/params) and wired at a composition root or by a container | Spring, .NET DI, NestJS, FastAPI `Depends`, manual composition root | Service locator (`container.get()` inside business code), which is a different pattern with different trade-offs |
| Result / Either | Operations return success/failure values instead of throwing, and callers branch on them | `Result<T,E>`, `Either`, `(value, err)` in Go | — |
| Options / Settings objects | Typed config objects bound once and injected | .NET Options, pydantic Settings | Global dict reads scattered everywhere = config-as-globals |

## Enterprise / data patterns (PoEAA)

| Pattern | Structural evidence required | Traps |
|---|---|---|
| Repository | Collection-like interface over aggregates (`get`, `add`, `find_by_*`), hiding the persistence technology from callers, and usually an interface in the domain/application with the implementation in infrastructure | A class named `*Repository` that exposes SQL strings or ORM query objects to callers is a DAO / Table Data Gateway |
| Unit of Work | Tracks changes across objects and commits them atomically | ORM session used directly (still UoW via the platform — say so) |
| Data Mapper | Separate mapper moves data between objects and DB; domain objects are persistence-ignorant | — |
| Active Record | Domain objects carry their own `save()`/`find()` | Rails/Django/Eloquent models: say "Active Record via <framework>" |
| Table/Row Data Gateway, DAO | Object per table/row wrapping SQL, returning records rather than domain objects | — |
| DTO | Behavior-less objects crossing a boundary (API, service) | Domain entities returned straight from the API = no DTO boundary (note it as a convention) |
| Specification | Composable predicate objects (`and`/`or`/`not`) for business criteria | A single filter function |
| Identity Map, Lazy Load | Per-session cache of loaded objects, deferred loading proxies | Usually provided by the ORM. Attribute it to the ORM |
| Gateway | Object wrapping access to an external system behind a domain-friendly interface | HTTP client used directly in business code (note as coupling) |

## DDD tactical patterns

| Pattern | Structural evidence required | Traps |
|---|---|---|
| Entity | Identity-based equality; lifecycle; behavior on the object | ORM row classes with only getters/setters (anemic — report as such) |
| Value Object | Immutable; equality by value; validates on construction; often has behavior (`Money.add`) | Tuples/dicts passed around (primitive obsession — note it) |
| Aggregate | Root entity guards invariants for a cluster of objects; outside code modifies children only through the root | Folder named `aggregates/` |
| Domain Service | Stateless domain operation that doesn't belong on one entity | Application services misnamed as domain services |
| Domain Event | Past-tense event objects raised by the domain (`PaymentPosted`) | Integration messages built in controllers |
| Anti-Corruption Layer | Translation layer isolating the domain from an external model | Direct use of an external SDK's types in the domain |
| Bounded Context | Separate models, possibly with different meanings for the same term, with explicit translation | — |

## Fluent and DSL patterns

| Pattern | Structural evidence required | Traps |
|---|---|---|
| Fluent interface | Methods return `this`/`self` (or a new immutable instance) so calls chain into a readable sentence | Chaining on a framework API you *consume* (e.g., an ORM query builder) is usage, not a pattern you *implement*. Record it under conventions |
| Fluent builder | Fluent interface that accumulates configuration and ends in `build()`/`create()` returning the product | Constructors with many optional parameters |
| Internal DSL | A vocabulary of chained/nested calls designed to read as domain language | — |
| Step builder | Builder whose return types force a call order | — |

## GoF patterns

For each pattern: the roles you must find, how it shows up idiomatically, and the usual false positive.

| Pattern | Required structure | Idiomatic forms | Traps |
|---|---|---|---|
| **Strategy** | An interface/abstract behavior with ≥2 interchangeable implementations; a context that holds or receives one and delegates without branching on type | Function parameter; dict/map of functions keyed by type; enum with behavior | One implementation only; a type-switch at the call site (the *absence* of Strategy) |
| **Template Method** | Base class fixes a step sequence; subclasses override hooks | Function taking step callbacks | Base class with shared helpers but no fixed sequence |
| **Observer** | Subject maintains subscribers and notifies them; subject doesn't know concrete observers | EventEmitter, signals, Rx, framework events, pub/sub bus | A method named `notify()` that calls one hard-coded object |
| **State** | Context delegates behavior to a state object, and state objects own transitions | Discriminated union + exhaustive match; transition table | Status enum + `if`s in many places (a state *machine* at most — check for a transition table) |
| **Command** | Requests reified as objects with `execute` (often `undo`), passed to an invoker/queue | Serializable job payloads + handlers; function objects queued | Any class with an `execute` method |
| **Chain of Responsibility** | Handlers linked in order; each handles or passes on | Middleware pipelines, ordered validator lists | A fixed sequence of calls with no pass/stop semantics |
| **Mediator** | Colleagues talk through a central mediator, not directly | Message bus in-process, MediatR | — |
| **Memento** | Opaque snapshots created and restored by the originator | Immutable state history, undo stacks | Plain persistence |
| **Iterator** | Traversal abstraction separate from the collection | Language iterators/generators (`yield`) — usually just idiomatic, rarely worth claiming | — |
| **Visitor** | Double dispatch: elements `accept(visitor)`, visitors have one method per element type | Exhaustive pattern match over a sealed hierarchy | — |
| **Interpreter** | Grammar represented as a class hierarchy/AST with `evaluate` | Parser + AST evaluator for a rule language | Regex use |
| **Factory Method** | Creator defers *which class* to instantiate to subclasses or an overridable method | Function returning different concrete types by input | Static method that always constructs one type (**"name-only factory" trap**) |
| **Abstract Factory** | Interface creating a *family* of related products; multiple concrete factories | DI modules providing matched sets | — |
| **Builder** | Step-wise construction separated from the product; `build()` | Fluent builder; kwargs + validation | Class named Builder that's a setter bag |
| **Prototype** | New objects made by cloning a configured instance | `copy.deepcopy`, spread/clone of a template | Incidental copying |
| **Singleton** | Single instance enforced + global access point | Module-level instance; DI container singleton lifetime (say which — they differ in testability) | — |
| **Adapter** | Wraps an incompatible interface to fit a target interface the client expects | Wrapper functions around third-party SDKs | Thin pass-through with identical interface |
| **Facade** | Simplified entry point over a multi-part subsystem | Module `__init__`/index exporting a simple API | Any class that calls two others |
| **Decorator** | Wrapper with the *same interface* as the wrappee, adding behavior, stackable | Language decorators/annotations, middleware, HOFs | Python `@decorator` used for registration only |
| **Proxy** | Same interface as subject; controls access (lazy, remote, cache, auth) | ORM lazy proxies, HTTP client stubs | — |
| **Composite** | Leaf and container share one interface; containers hold children of that interface | Recursive tree types | Any list of objects |
| **Bridge** | Two independent hierarchies (abstraction × implementor) joined by composition | — (rare; claim only with both hierarchies evidenced) | Single interface + implementations (that's Strategy or plain polymorphism) |
| **Flyweight** | Shared intrinsic state across many objects via a cache/factory | Interning, memoized instances | — |

## "Considered, not found" format

```markdown
- `OrderFactory` (`orders/factory.py:5`) — name suggests Factory Method, but
  its only method always constructs `Order`; no variation in created type.
```

Also record **notable absences** when the forces are clearly present but no
pattern handles them. For example: "type-switch on `payment_method` in four
places (`a.py:10`, `b.py:22`, …) — a Strategy-shaped force handled ad hoc".
Architects need this for the Engineering Patterns report.
