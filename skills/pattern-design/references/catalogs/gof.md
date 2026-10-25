# GoF (Gang of Four) patterns

Classic in-process object-design patterns from *Design Patterns* (Gamma, Helm,
Johnson, Vlissides). They apply at the level of classes, objects, and module
boundaries within one process, not to distributed topology or enterprise
layering. The authors designed many of them around the limitations of
1994-era C++ and Smalltalk. Each entry's **Idiom note** says when a modern
language feature replaces the machinery and keeps the intent.

## Signal Index

| Force signal (as it appears in specs) | Candidate patterns |
|---|---|
| "supports multiple / pluggable / configurable X", per-tenant or per-region behavior | Strategy, Bridge, Abstract Factory |
| "algorithm has fixed steps but step details vary" | Template Method, Strategy |
| "family of related components that must be used together / stay consistent" | Abstract Factory |
| "creation requires many steps / optional parts / validation" | Builder, Factory Method |
| "which concrete type to create depends on context" | Factory Method, Abstract Factory |
| "create by copying a configured example" | Prototype |
| "exactly one shared instance / global access" | Singleton (see warnings) |
| "integrate third-party / legacy component with a different interface" | Adapter |
| "shield callers from a complicated subsystem" | Facade |
| "two dimensions vary independently (abstraction × implementation)" | Bridge |
| "tree / hierarchy / nested part-whole structure" | Composite (+ Iterator, Visitor) |
| "add/stack optional behavior without subclass explosion" | Decorator |
| "very many similar objects, memory pressure" | Flyweight |
| "control access: lazy, remote, cached, permission-checked" | Proxy |
| "request may be handled by one of several handlers in order" | Chain of Responsibility |
| "queue / schedule / log / undo / replay operations" | Command (+ Memento) |
| "snapshot and restore state" | Memento |
| "when X happens, Y (and others) must react" | Observer |
| "many components coordinate; interactions are getting pairwise" | Mediator |
| "behavior changes by mode / status / lifecycle stage" | State |
| "traverse a collection without exposing its structure" | Iterator |
| "many distinct operations over a stable object structure" | Visitor |
| "evaluate expressions in a small domain language" | Interpreter |

## Patterns

### Strategy: Behavioral

- **Intent**: Encapsulate interchangeable algorithms behind one interface so
  callers pick behavior without branching on type.
- **Select when**: The spec names multiple ways to do one thing (pricing
  rules, export formats, auth providers) and callers must not care which.
- **Do not use when**: There are exactly two variants with no growth signal,
  so an `if` is simpler. Variants differ in data, not behavior, so use
  configuration. Variants never vary at runtime, so a build-time choice may do.
- **Participants**: Strategy interface, concrete strategies, a context that
  holds one and delegates.
- **Works with**: Factory Method or a registry for choosing the strategy;
  Template Method as the alternative when only steps vary.
- **Idiom note**: In languages with first-class functions, a Strategy is
  often a function parameter or a record of functions. Use the interface
  form when strategies carry state or multiple methods.
- **Agent-rule seed**: "Every `<capability>` variant implements
  `<StrategyInterface>` in `<dir>` and is registered in `<registry>`.
  Forbidden: branching on `<variant-discriminator>` anywhere outside
  `<registry>`."

### Template Method: Behavioral

- **Intent**: Define an algorithm's skeleton in one place, deferring specific
  steps to subclasses or hooks.
- **Select when**: Several processes share an identical step sequence with
  small step-level differences, and the sequence itself must not drift.
- **Do not use when**: The sequence varies too, so use Strategy for the whole
  algorithm. Inheritance is unavailable or undesirable, so pass step functions
  instead (see the idiom note).
- **Participants**: Abstract class with the invariant skeleton, hook methods,
  concrete subclasses.
- **Works with**: Factory Method (a classic hook); Strategy as the
  composition-based alternative.
- **Idiom note**: A function that takes step callbacks serves the same intent
  without inheritance and is usually preferable in JS, TS, and Python.
- **Agent-rule seed**: "The `<process>` sequence is defined only in
  `<skeleton>`; variants override only the declared hooks. Forbidden:
  reimplementing or reordering the sequence in a subclass."

### Observer: Behavioral

- **Intent**: Let dependents subscribe to state changes so the subject
  doesn't know who reacts.
- **Select when**: The spec says "when X happens, Y (and possibly others)
  must update/react", and the set of reactors changes or grows.
- **Do not use when**: There is exactly one stable reactor, so a direct call
  is clearer. Ordering or transactional guarantees between reactions matter,
  so orchestrate them explicitly instead. Reactions cross a process boundary,
  which is messaging, not GoF Observer.
- **Participants**: Subject (subscribe/notify), observers, event payloads.
- **Works with**: Mediator when reactions need coordination; Command as the
  subscription payload.
- **Idiom note**: The platform usually provides it: EventTarget or
  EventEmitter, Rx, or framework reactivity (React state, signals). Prefer the
  platform mechanism, and don't hand-roll subjects.
- **Agent-rule seed**: "Components react to `<domain-event>` only by
  subscribing via `<mechanism>`. Forbidden: `<subject>` importing or calling
  a reactor directly."

### State: Behavioral

- **Intent**: Make an object's behavior change with its internal state by
  giving each state its own type.
- **Select when**: The spec has a mode/status/lifecycle whose value changes
  the behavior of several operations, and the transition rules are non-trivial.
- **Do not use when**: The status changes only one or two operations, so
  conditionals are fine. Transitions are the hard part but behavior isn't, so
  a plain state-machine table or library is simpler.
- **Participants**: Context, state interface, concrete states owning both
  behavior and transitions.
- **Works with**: Singleton-like sharing of stateless state objects; Flyweight.
- **Idiom note**: A discriminated union and a `switch` in one module is often
  the plainer form in TS and functional codebases. Use the class form when
  states carry distinct data and behavior.
- **Agent-rule seed**: "All behavior that depends on `<status>` lives on the
  state types in `<dir>`; transitions happen only inside state methods.
  Forbidden: `if/switch` on `<status>` outside `<dir>`."

### Command: Behavioral

- **Intent**: Represent an operation as an object so it can be queued,
  logged, undone, or scheduled.
- **Select when**: The spec asks for undo/redo, audit trails, operation
  queues, macros, or retryable/replayable actions.
- **Do not use when**: You only need to pass behavior, which is a function.
  No requirement inspects, stores, or reverses the operation.
- **Participants**: Command interface (execute, optionally undo), concrete
  commands, invoker (queue or history), receiver.
- **Works with**: Memento for undo state; Composite for macro-commands;
  Chain of Responsibility for dispatch.
- **Idiom note**: A closure is a command without undo or metadata. Use the
  object form only when you need undo, serialization, or a name for the
  audit trail.
- **Agent-rule seed**: "Every user-initiated mutation is a `<Command>` in
  `<dir>` executed through `<invoker>`. Forbidden: mutating `<domain>` state
  from UI/controllers directly."

### Chain of Responsibility: Behavioral

- **Intent**: Pass a request along a chain of handlers until one handles it,
  decoupling sender from handler.
- **Select when**: The spec describes ordered fallback or escalation ("try X,
  then Y"), or middleware-style processing where handlers are added over time.
- **Do not use when**: The handler is known statically, so dispatch directly.
  Every handler must handle every request, which makes it a pipeline or
  Observer, not a chain.
- **Participants**: Handler interface with next-link, concrete handlers,
  client that builds the chain.
- **Works with**: Command (the request object); Composite.
- **Idiom note**: Middleware arrays (Express, Redux) are this pattern with
  the chain flattened into a list. Prefer that shape.
- **Agent-rule seed**: "`<request>` processing steps are handlers in `<dir>`
  registered in `<chain-config>` in order. Forbidden: a handler invoking
  another handler directly."

### Mediator: Behavioral

- **Intent**: Centralize many-to-many component interactions into one
  coordinator so components stay ignorant of each other.
- **Select when**: The spec has several components whose interactions are
  described pairwise and the pair count is growing (dialog widgets, workflow
  steps).
- **Do not use when**: Interactions are few, so direct references are clearer.
  The mediator would only forward calls, which adds a layer without removing
  coupling. Watch for the god-object failure mode, where a mediator
  accumulates all business logic.
- **Participants**: Mediator interface, concrete mediator, colleagues that
  talk only to the mediator.
- **Works with**: Observer (colleagues notify the mediator via events).
- **Idiom note**: In UI frameworks, a parent component or store often *is*
  the mediator. Name it as the mediator rather than adding machinery.
- **Agent-rule seed**: "`<components>` never reference each other; all
  coordination goes through `<mediator>`. Forbidden: importing a sibling
  colleague."

### Memento: Behavioral

- **Intent**: Capture an object's state for later restore without exposing
  its internals.
- **Select when**: The spec asks for undo, snapshots, drafts, or
  crash-recovery of an object with non-trivial private state.
- **Do not use when**: State is small and serializable, so copy it. You need
  the full history, so consider event sourcing (a log of Commands) instead.
- **Participants**: Originator (creates and restores mementos), memento
  (opaque), caretaker (stores them).
- **Works with**: Command (an undo stack pairs each command with a memento).
- **Idiom note**: With immutable state (Redux style), every previous state is
  already a memento. Keep references instead of building machinery.
- **Agent-rule seed**: "Snapshots of `<entity>` are produced only by
  `<entity>.snapshot()` and restored only by `<entity>.restore()`.
  Forbidden: external code reaching into `<entity>` fields to save/load."

### Iterator: Behavioral

- **Intent**: Traverse a collection without exposing its representation.
- **Select when**: The spec involves custom structures (trees, paged/remote
  results) that several features must walk uniformly.
- **Do not use when**: The collection is built in, because the language's
  iterator protocol already exists. Never hand-roll one.
- **Participants**: Iterable, iterator with advance/current.
- **Works with**: Composite (uniform traversal of trees).
- **Idiom note**: Implement the language's native protocol (JS
  `Symbol.iterator` or generators, Python `__iter__`, C# `IEnumerable`).
  Today the pattern's value is in *conforming* to that protocol, not
  inventing one.
- **Agent-rule seed**: "`<structure>` exposes traversal only via the
  language's iterator protocol. Forbidden: callers touching
  `<structure>`'s internal storage."

### Visitor: Behavioral

- **Intent**: Represent operations over a stable object structure as
  separate objects, so new operations don't touch the structure's classes.
- **Select when**: A stable node hierarchy (AST, document tree) needs many
  and growing operations (render, validate, transform), especially with
  double dispatch on node type.
- **Do not use when**: The node set still changes often. Every new node
  breaks every visitor, so put behavior on the nodes instead. Only one or two
  operations exist.
- **Participants**: Visitor interface (one method per node type), concrete
  visitors, elements with `accept`.
- **Works with**: Composite (the structure visited); Interpreter.
- **Idiom note**: In languages with pattern matching or discriminated unions
  (TS, Rust, F#), an exhaustive `match` over the node union is a visitor
  with compiler-checked coverage. Prefer it.
- **Agent-rule seed**: "Operations over `<node-hierarchy>` are visitors in
  `<dir>` (or exhaustive matches over `<union>`). Forbidden: adding
  operation-specific methods to node classes."

### Interpreter: Behavioral

- **Intent**: Define a grammar for a small language and an evaluator over
  its syntax tree.
- **Select when**: The spec includes user-authored expressions (filters,
  rules, formulas) that must be parsed and evaluated repeatedly.
- **Do not use when**: The "language" is a handful of fixed options, so use
  configuration. The grammar is complex, so use a parser generator or embed an
  existing language. Hand-rolled interpreters grow without bound.
- **Participants**: Expression node types with `interpret`, context.
- **Works with**: Composite (the AST), Visitor (operations over it),
  Flyweight (shared terminals).
- **Agent-rule seed**: "`<dsl>` syntax is defined only in `<grammar
  module>`; evaluation only in `<interpreter module>`. Forbidden: ad-hoc
  string parsing of `<dsl>` elsewhere."

### Factory Method: Creational

- **Intent**: Let a class defer which concrete type it instantiates to a
  method that subclasses or configuration can override.
- **Select when**: Code must create objects whose concrete type depends on
  context the caller shouldn't know (per config, per input kind).
- **Do not use when**: There's one concrete type, so call the constructor.
  You are wrapping every `new` by reflex. A factory with one product and one
  consumer adds nothing.
- **Participants**: Creator with the factory method, concrete creators,
  product interface.
- **Works with**: Template Method (factory method as hook); Abstract Factory
  (a set of factory methods).
- **Idiom note**: A registry or map from discriminator to constructor
  function is the common modern form. DI containers cover many factory needs.
- **Agent-rule seed**: "Instances of `<Product>` are created only via
  `<factory>`. Forbidden: `new <ConcreteProduct>` outside `<factory dir>`."

### Abstract Factory: Creational

- **Intent**: Create families of related objects that must be used together,
  without naming concrete classes.
- **Select when**: The spec has coherent families (a theme's widget set, or a
  vendor's client, parser, and auth) where mixing members across families is
  a bug.
- **Do not use when**: The products don't correlate, so independent
  factories or plain constructors suffice. There's one family and only a
  vague hope of more (YAGNI).
- **Participants**: Abstract factory interface (one create method per
  product), concrete factory per family, product interfaces.
- **Works with**: Factory Method (per product); Singleton (factory instance);
  Strategy (choosing the family).
- **Idiom note**: Often an object literal or module per family that satisfies
  a shared interface.
- **Agent-rule seed**: "All `<family>` components are obtained from one
  `<AbstractFactory>` instance selected at `<selection point>`. Forbidden:
  constructing any `<family>` member directly or mixing members from two
  factories."

### Builder: Creational

- **Intent**: Separate the construction of a complex object from its
  representation so the same process can build variants step by step.
- **Select when**: Construction has many optional parts, ordering
  constraints, or validation that must complete before the object exists;
  or the same steps must produce different representations.
- **Do not use when**: The language has named or default parameters, or
  object literals, that cover it. The object is mutable anyway. A builder for
  a three-field object is ceremony.
- **Participants**: Builder interface (step methods and build), concrete
  builders, optional director owning the step sequence.
- **Works with**: Composite (building trees); Template Method (director).
- **Idiom note**: In TS and Python, an options object and a validating
  factory function usually beat a fluent builder. Reserve builders for
  construction that really happens in stages.
- **Agent-rule seed**: "`<ComplexObject>` is constructed only through
  `<Builder>`, which validates in `build()`. Forbidden: constructing or
  mutating a partially-built `<ComplexObject>` elsewhere."

### Prototype: Creational

- **Intent**: Create new objects by cloning a configured exemplar instead of
  building from scratch.
- **Select when**: New instances are near-copies of expensive-to-configure
  exemplars (document templates, pre-tuned game entities), or concrete types
  are unknown at compile time but instances are at hand.
- **Do not use when**: Construction is cheap, so construct directly.
  Deep-copy semantics would be subtle (shared references, resources), and the
  clone method would become a steady source of bugs.
- **Participants**: Prototype interface with `clone`, concrete prototypes,
  optional prototype registry.
- **Works with**: Abstract Factory (registry of prototypes as a factory).
- **Idiom note**: Structured cloning, or a spread with overrides
  (`{...template, ...overrides}`), is the everyday form for data objects.
- **Agent-rule seed**: "New `<entity>` instances derive from templates in
  `<registry>` via `<clone fn>`. Forbidden: hand-assembling `<entity>`
  duplicating template defaults."

### Singleton: Creational

- **Intent**: Ensure a class has one instance with a global access point.
- **Select when**: The spec requires exactly one instance *and* global reach,
  such as a process-wide hardware handle. This is rare.
- **Do not use when**: Almost always. Global access is the pattern's cost,
  not its benefit: it hides dependencies, couples everything to a concrete
  type, and breaks test isolation. The default alternative is to create one
  instance at the composition root and inject it. "There happens to be one"
  is not "there must be exactly one".
- **Participants**: The class, its private constructor, the accessor.
- **Works with**: Developers often make Abstract Factory and Facade instances
  singletons by mistake. Inject them instead.
- **Idiom note**: A module-level instance gives single-instance semantics
  without an enforced global. Still prefer injection for anything with
  behavior worth testing.
- **Agent-rule seed**: "`<Service>` is instantiated once in
  `<composition root>` and passed via `<DI mechanism>`. Forbidden: adding
  static `getInstance`-style accessors or importing the instance directly
  into domain code."

### Adapter: Structural

- **Intent**: Convert one interface into another that clients expect,
  letting incompatible components work together.
- **Select when**: Integrating third-party or legacy code whose interface
  doesn't match yours, especially to keep the foreign type from leaking
  through the codebase.
- **Do not use when**: You control both sides, so change the interface
  instead. The adapter would add behavior, which makes it a Decorator or a
  service. Mixing translation with logic hides both.
- **Participants**: Target interface (yours), adaptee (theirs), adapter.
- **Works with**: Facade (adapter for one class, facade for a subsystem);
  Bridge (designed up front rather than retrofitted).
- **Agent-rule seed**: "`<third-party lib>` is accessed only through
  `<adapter>` implementing `<target interface>` in `<dir>`. Forbidden:
  importing `<third-party lib>` outside `<dir>`."

### Bridge: Structural

- **Intent**: Split an abstraction from its implementation so the two vary
  independently.
- **Select when**: The spec has two independent axes of variation (shape ×
  renderer, notification kind × delivery channel) and a subclass for every
  combination would multiply classes.
- **Do not use when**: Only one axis varies, which makes it Strategy. The
  split is speculative. Bridge is the classic speculative pattern, so it
  needs *stated* variation on both axes.
- **Participants**: Abstraction hierarchy holding a reference to an
  implementor interface hierarchy.
- **Works with**: Abstract Factory (creating the implementor).
- **Agent-rule seed**: "`<abstraction>` types never know concrete
  `<implementor>` types; they hold `<ImplementorInterface>` assigned at
  `<composition point>`. Forbidden: a `<abstraction>` subclass per
  `<implementor>` combination."

### Composite: Structural

- **Intent**: Compose objects into tree structures and treat leaves and
  containers uniformly.
- **Select when**: The spec has part-whole hierarchies (menus, org charts,
  scene graphs, nested rules) and clients should not care whether they hold
  a leaf or a group.
- **Do not use when**: The structure is flat or one level deep, so use a
  list. Leaf and container operations really differ, and forcing uniformity
  yields no-op methods and type checks.
- **Participants**: Component interface, leaf, composite (holds children,
  delegates).
- **Works with**: Iterator (traversal), Visitor (operations), Decorator
  (shares the recursive shape), Builder (construction).
- **Agent-rule seed**: "Tree nodes of `<structure>` implement `<Component>`;
  operations recurse via the interface. Forbidden: client code
  type-checking leaf vs. group."

### Decorator: Structural

- **Intent**: Attach responsibilities to an object dynamically by wrapping
  it behind the same interface.
- **Select when**: Optional behaviors (caching, retry, logging, metrics)
  stack in varying combinations on a core component, and a subclass for each
  combination would multiply classes.
- **Do not use when**: There's one fixed addition, so put it in the class or
  compose plainly. The behavior is domain logic, not cross-cutting, and
  hiding it in a wrapper obscures it. Deep stacks make debugging harder. If
  every instance always gets every decorator, merge them.
- **Participants**: Component interface, concrete component, decorators
  wrapping a component and forwarding.
- **Works with**: Composite (same recursive shape); Proxy (structurally a
  decorator whose purpose is access control, not added behavior);
  Factory or Builder to assemble stacks.
- **Idiom note**: Function composition or middleware wrapping is the everyday
  form. Language decorators (TS, Python) express the same intent statically.
- **Agent-rule seed**: "Cross-cutting behavior on `<Component>` is added
  only via decorators in `<dir>`, assembled in `<composition point>`.
  Forbidden: adding caching/retry/logging inside `<ConcreteComponent>`."

### Facade: Structural

- **Intent**: Provide one simplified interface to a subsystem, reducing what
  clients must know.
- **Select when**: The spec exposes a workflow that internally touches many
  components (placing an order touches inventory, payment, and shipping) and
  callers should see one operation; or a subsystem boundary needs a stable
  public interface.
- **Do not use when**: The subsystem is one or two classes, so the facade
  would be a pass-through. The facade would accumulate logic of its own and
  become a god object. A facade *delegates* work and does none itself.
- **Participants**: Facade, subsystem classes (still usable directly when
  needed).
- **Works with**: Adapter (translation vs. simplification); Abstract Factory
  (behind the facade); Mediator (similar to a facade, but stateful).
- **Idiom note**: A module's public API (index.ts exports) is a facade, and
  often the right amount of structure.
- **Agent-rule seed**: "External callers use `<subsystem>` only through
  `<facade>`. Forbidden: importing `<subsystem>` internals from outside
  `<subsystem dir>`."

### Flyweight: Structural

- **Intent**: Share intrinsic state among many fine-grained objects to cut
  memory use.
- **Select when**: The spec implies very large numbers of similar objects
  (glyphs, map tiles, cells), profiling or arithmetic shows memory pressure,
  and state splits cleanly into shared intrinsic state and per-use extrinsic
  state.
- **Do not use when**: Object counts are in the thousands, not millions,
  which modern runtimes handle without help. State doesn't split cleanly, and
  passing extrinsic state everywhere costs more than it saves. This is an
  optimization, so measure first.
- **Participants**: Flyweight (intrinsic state), flyweight factory or cache,
  clients supplying extrinsic state.
- **Works with**: Composite (shared leaves), State/Strategy (stateless
  instances shared).
- **Agent-rule seed**: "`<HeavyObject>` instances are obtained from
  `<factory>`, which interns by `<key>`; per-use state is passed as
  arguments. Forbidden: constructing `<HeavyObject>` directly or storing
  per-use state on it."

### Proxy: Structural

- **Intent**: Provide a surrogate with the same interface that controls
  access to the real object.
- **Select when**: The spec needs lazy loading of expensive resources,
  access control in front of an object, local stand-ins for remote objects,
  or transparent caching, *without* callers knowing.
- **Do not use when**: Callers may know, so an explicit `load()` or
  permission check is clearer and easier to debug. The wrapper adds behavior
  rather than controlling access, which makes it a Decorator.
- **Participants**: Subject interface, real subject, proxy holding or
  creating the real subject.
- **Works with**: Decorator (same shape, different purpose); Adapter
  (changes the interface, proxy keeps it).
- **Idiom note**: JS `Proxy`, ORM lazy relations, and RPC client stubs are
  built-in forms. Prefer platform support.
- **Agent-rule seed**: "Access to `<resource>` goes through `<proxy>`
  implementing `<SubjectInterface>`; `<policy: laziness/authz/caching>`
  lives only there. Forbidden: importing `<RealSubject>` directly outside
  `<dir>`."
