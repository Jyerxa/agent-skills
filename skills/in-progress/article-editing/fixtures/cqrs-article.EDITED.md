# CQRS

Checkout keeps orders normalized: an order, its line items, and its totals, guarded by a state machine that refuses to ship an unpaid order or cancel one already in transit. Ops wants a different thing from the same data: today's board, one flat row per order with the customer's name, the SKUs, the payment status, the warehouse region, and the last change time, sorted and filtered without joining five tables on every refresh. One model cannot do both jobs well.

8 min read · Updated 2026-10-29

Forcing one model to do both either slows the write path with read-shaped indexes and joins, or ships a board that cannot express the rules. CQRS, Command Query Responsibility Segregation, splits the two. Commands change the write model, which keeps enforcing its rules. A projector copies each change into a read model shaped for the board. The board can be a moment behind the orders, and the article treats that lag as a decision to make rather than a bug to hide. You will see why one model fails, the five parts that make the split work, a working sketch in C#, and the costs that should make you keep a single store whenever you can.

## Intent

Split the write model (commands, invariants) from one or more read models optimized for queries, accepting that they may lag or differ in shape.

## The Problem

A single normalized store is the right default for most domains. One schema, one transaction boundary, and every read sees its own writes with no extra work. It stops being right when the reads and the writes genuinely need different shapes, because the structure that protects writes then fights the structure that answers reads. The orders board shows this in three ways.

**Different shapes.** The write model is normalized around its rules: an order cannot ship unpaid, line totals must equal the header total, cancel is illegal after ship. The board wants a flat card with the customer's name already looked up and the SKUs already joined into one string. Serving that card from the write schema means expensive joins on every poll. Copying the name and the SKU string into the write tables avoids the joins, but then every customer rename must be repeated in every order row, and the rows it misses go stale: an update anomaly.

**Independent scale.** Command traffic is bursty and has to be correct. Board traffic is steady, caches well, and is often an order of magnitude higher. One store has to be provisioned for both loads at once, and the writes take locks, or contend for rows, on the same pages the board is scanning.

**Different ownership.** A billing team owns the payment state transitions. A fulfillment team owns the regional board. With one schema, the two teams share release trains and failure modes: adding a filter column for the board is a migration on the write path.

If none of the three applies, one model will do, and the trade-offs below say why that is the better choice. The rest of this article assumes at least one does.

## Structure

The split has five parts. Each has one job, and the pattern holds only while each part stays inside its job. The table names them in the order a change flows through them; the paragraphs that follow explain each one.

| Part | Job |
| --- | --- |
| Write model | Accepts commands, enforces the rules, stores orders in a write-friendly shape |
| Fact emission | Turns each committed change into a fact the projector can consume |
| Projector | Applies facts to the read model, safely under redelivery and reordering |
| Read model | Holds rows in the shape each query needs |
| Consistency boundary | States how stale a read may be, and which reads may not be stale |

**The write model** accepts the commands: PlaceOrder, MarkPaid, Ship, Cancel. It enforces every rule, and it stores orders in whatever shape suits writing: normalized rows here, or an event stream if you event-source, which is a separate decision covered in the trade-offs. It never serves the board's denormalized queries. When two commands reach the same order at once, each save checks that the order's version is still the one the command read. The second writer fails and must reload, so two writers can never both commit against the same snapshot.

**Fact emission** is how a commit becomes input for the projector. Each successful command produces a fact: a past-tense record such as OrderPlaced or OrderPaid, carrying enough data to rebuild the board row. Other writers call these domain events or change records; this article says facts. Write the fact in the same local transaction as the order, using a Transactional Outbox, or use the event store's own subscription feed. Saving the order and then publishing to a broker in a second step is a dual write: a crash between the two loses the fact the board depends on.

**The projector** consumes facts and upserts board rows. Brokers deliver at least once, so the projector must tolerate duplicates and facts that arrive out of order. Two guards do that. An inbox records every fact already processed, keyed by subscriber and fact, so a redelivered fact is a no-op; this is the Idempotent Consumer pattern. A version check on the row refuses to apply a fact older than what the row already shows. Claiming the fact in the inbox and applying it to the row share one transaction on the read store, so a failed apply rolls the claim back and the fact is retried.

**The read model** is one or more stores, each shaped for a particular query: an ops board row, a customer's order history card, a search document. It can use a different technology from the write side, such as a document store or a search index. Only the projector writes to it; command handlers never write "through" to it.

**The consistency boundary** is the written contract for lag: how stale a read may be, which paths wait after a command until the read model reaches the command's version, and which rare paths read the write model directly because they must see the write immediately. Without that contract, every screen assumes the board is current, and every delay looks like lost data.

Commands never write the read model. Queries never change the write model. The projector is the only bridge, and it runs asynchronously unless you deliberately choose an in-process synchronous update and accept that it couples the two models again.

## Implementation

The sketch below is the five parts in C#, with no framework between them, so the split stays visible. It is self-contained: no MediatR, Marten, or KurrentDB (formerly EventStoreDB) subscription client. Production stacks add brokers, competing consumers, and rebuild tooling; the sketch is the contract those features hang on. The write model here is ordinary mutable state that emits facts on save, so this is CQRS without Event Sourcing. Swapping the write store for an event stream is a separate decision. The TypeScript version has the same shape; the prose below follows the C#.

Start with the write model. Look for two things: every rule is a guard at the top of a method, and `Version` goes up on every successful command.

```csharp
// --- Write model: invariants live here. Not a board row. ---

enum OrderStatus { Placed, Paid, Shipped, Cancelled }

sealed class OrderLine
{
    public required string Sku { get; init; }
    public required int Qty { get; init; }
    public required decimal UnitPrice { get; init; }
    public decimal LineTotal => Qty * UnitPrice;
}

sealed class Order
{
    public Guid OrderId { get; private set; }
    public Guid CustomerId { get; private set; }
    public string CustomerName { get; private set; } = "";
    public string WarehouseRegion { get; private set; } = "";
    public List<OrderLine> Lines { get; private set; } = new();
    public OrderStatus Status { get; private set; }
    public int Version { get; private set; } // increments on every successful command

    public decimal Total => Lines.Sum(l => l.LineTotal);

    public static Order Place(
        Guid orderId, Guid customerId, string customerName,
        string warehouseRegion, IReadOnlyList<OrderLine> lines)
    {
        if (lines.Count == 0) throw new InvalidOperationException("Order needs lines");
        if (string.IsNullOrWhiteSpace(customerName))
            throw new InvalidOperationException("Customer name required");
        return new Order
        {
            OrderId = orderId, CustomerId = customerId, CustomerName = customerName,
            WarehouseRegion = warehouseRegion, Lines = lines.ToList(),
            Status = OrderStatus.Placed, Version = 1
        };
    }

    public void MarkPaid()
    {
        if (Status != OrderStatus.Placed)
            throw new InvalidOperationException($"Cannot mark paid from {Status}");
        Status = OrderStatus.Paid;
        Version++;
    }

    public void Ship()
    {
        if (Status != OrderStatus.Paid)
            throw new InvalidOperationException($"Cannot ship from {Status}");
        Status = OrderStatus.Shipped;
        Version++;
    }

    public void Cancel()
    {
        if (Status is OrderStatus.Shipped or OrderStatus.Cancelled)
            throw new InvalidOperationException($"Cannot cancel from {Status}");
        Status = OrderStatus.Cancelled;
        Version++;
    }
}
```

Nothing here knows about the board. `Place` validates its inputs and starts the order at version 1. `MarkPaid`, `Ship`, and `Cancel` each refuse an illegal transition and bump the version. That version number does two jobs later: the save uses it to detect concurrent writers, and the projector uses it to ignore stale facts.

Next, the facts the write model emits, and the store that saves them. The facts are past tense and carry enough to rebuild a board row: `OrderPlaced` carries the customer name, region, lines, and total, while the later facts carry only the new version and the time. `SaveAsync` is where the Transactional Outbox lives.

```csharp
// Facts the projector consumes — past-tense, enough payload to rebuild the board row.
abstract record OrderFact(Guid FactId, Guid OrderId, int Version, DateTimeOffset At);

sealed record OrderPlaced(
    Guid FactId, Guid OrderId, int Version, DateTimeOffset At,
    Guid CustomerId, string CustomerName, string WarehouseRegion,
    IReadOnlyList<OrderLine> Lines, decimal Total) : OrderFact(FactId, OrderId, Version, At);

sealed record OrderPaid(Guid FactId, Guid OrderId, int Version, DateTimeOffset At)
    : OrderFact(FactId, OrderId, Version, At);

sealed record OrderShipped(Guid FactId, Guid OrderId, int Version, DateTimeOffset At)
    : OrderFact(FactId, OrderId, Version, At);

sealed record OrderCancelled(Guid FactId, Guid OrderId, int Version, DateTimeOffset At)
    : OrderFact(FactId, OrderId, Version, At);

sealed class ConcurrencyException : Exception
{
    public ConcurrencyException(Guid orderId, int expected, int actual)
        : base($"Order {orderId}: expected version {expected}, actual {actual}") { }
}

interface IOrderWriteStore
{
    Task<Order?> GetAsync(Guid orderId, CancellationToken ct);
    // Persists order + outbox facts in ONE local transaction (Transactional Outbox)
    // only if the row's current version == expectedVersion (0 = insert / must not exist).
    // Throws ConcurrencyException on mismatch — loser reloads and decides again.
    Task SaveAsync(
        Order order, int expectedVersion, IReadOnlyList<OrderFact> facts, CancellationToken ct);
}
```

`SaveAsync` persists the order row and the fact rows in one local transaction, and only if the row's current version equals `expectedVersion`: in SQL terms, `UPDATE ... WHERE version = @expected`, or an insert when the expected version is 0. A mismatch throws `ConcurrencyException`, and the loser reloads the order and decides again.

The command handlers all follow one shape: load the order, remember the version you read, apply the command, build the fact, save with the remembered version, return the new version.

```csharp
sealed class OrderCommands(IOrderWriteStore store)
{
    public async Task<(Guid OrderId, int Version)> PlaceAsync(
        Guid customerId, string customerName, string region,
        IReadOnlyList<OrderLine> lines, CancellationToken ct)
    {
        var id = Guid.NewGuid();
        var order = Order.Place(id, customerId, customerName, region, lines);
        var fact = new OrderPlaced(
            Guid.NewGuid(), id, order.Version, DateTimeOffset.UtcNow,
            customerId, customerName, region, order.Lines.ToList(), order.Total);
        // expectedVersion 0: fail if the order row already exists.
        await store.SaveAsync(order, expectedVersion: 0, new[] { fact }, ct);
        return (id, order.Version);
    }

    public async Task<int> MarkPaidAsync(Guid orderId, CancellationToken ct)
    {
        var order = await store.GetAsync(orderId, ct)
            ?? throw new InvalidOperationException("Order not found");
        var expectedVersion = order.Version;
        order.MarkPaid();
        var fact = new OrderPaid(Guid.NewGuid(), orderId, order.Version, DateTimeOffset.UtcNow);
        await store.SaveAsync(order, expectedVersion, new[] { fact }, ct);
        return order.Version;
    }

    public async Task<int> ShipAsync(Guid orderId, CancellationToken ct)
    {
        var order = await store.GetAsync(orderId, ct)
            ?? throw new InvalidOperationException("Order not found");
        var expectedVersion = order.Version;
        order.Ship();
        var fact = new OrderShipped(Guid.NewGuid(), orderId, order.Version, DateTimeOffset.UtcNow);
        await store.SaveAsync(order, expectedVersion, new[] { fact }, ct);
        return order.Version;
    }

    public async Task<int> CancelAsync(Guid orderId, CancellationToken ct)
    {
        var order = await store.GetAsync(orderId, ct)
            ?? throw new InvalidOperationException("Order not found");
        var expectedVersion = order.Version;
        order.Cancel();
        var fact = new OrderCancelled(Guid.NewGuid(), orderId, order.Version, DateTimeOffset.UtcNow);
        await store.SaveAsync(order, expectedVersion, new[] { fact }, ct);
        return order.Version;
    }

    // Read-your-writes escape hatch: confirmation page reads the write model, not the board.
    public Task<Order?> GetForEditAsync(Guid orderId, CancellationToken ct)
        => store.GetAsync(orderId, ct);
}
```

If Ship and Cancel run at the same time against the same Paid order, both read version 2, both pass their own rule, and both call `SaveAsync` with `expectedVersion` 2. One commits and moves the row to version 3. The other gets `ConcurrencyException` and must reload, and on reload its own rule rejects it. The returned version is what the query side will wait for. `GetForEditAsync` is the escape hatch for the rare path that must see the result immediately, such as the confirmation page right after placing an order.

Now the read side. `OrderBoardRow` is the flat shape ops asked for, stamped with the write-side version it was built from. `IOrderBoardStore` has the two guards from the Structure section: the inbox claim and the conditional upsert.

```csharp
// --- Read model: denormalized for the ops board. Commands never write here. ---

sealed record OrderBoardRow(
    Guid OrderId,
    string CustomerName,
    string SkuList,              // "SKU-1×2, SKU-2×1"
    decimal Total,
    string Status,               // Placed|Paid|Shipped|Cancelled
    string WarehouseRegion,
    DateTimeOffset LastChangedAt,
    int Version);                // last applied write-side version

interface IOrderBoardStore
{
    // Conditional upsert: INSERT, or UPDATE only WHERE existing.Version < row.Version.
    // Concurrent older facts lose here — not via a check-then-act Get → Upsert.
    Task UpsertIfNewerAsync(OrderBoardRow row, CancellationToken ct);
    Task<OrderBoardRow?> GetAsync(Guid orderId, CancellationToken ct);
    Task<IReadOnlyList<OrderBoardRow>> ListByRegionAsync(
        string region, DateOnly day, CancellationToken ct);
    // Inbox: claim (subscriberId, factId) so at-least-once redelivery is a no-op
    // (Idempotent Consumer). Key includes subscriberId so a second projector sharing
    // the store does not swallow facts.
    Task<bool> TryClaimFactAsync(string subscriberId, Guid factId, CancellationToken ct);
    Task BeginAsync(CancellationToken ct);
    Task CommitAsync(CancellationToken ct);
    Task RollbackAsync(CancellationToken ct);
}
```

`UpsertIfNewerAsync` is the atomic version guard: an insert, or an update only where the stored version is lower (`WHERE version < @v`). The check happens inside the store, not as a read followed by a write, so two projector instances cannot race each other into regressing a row. `TryClaimFactAsync` is the inbox. Its key includes the subscriber ID so that a second projector sharing the store does not swallow facts meant for the first.

The projector ties them together. Follow one fact through `ProjectAsync`: claim it, compare versions, build the new row, upsert, commit.

```csharp
sealed class OrderBoardProjector(IOrderBoardStore board)
{
    private const string SubscriberId = "readmodel.order-board";

    public async Task ProjectAsync(OrderFact fact, CancellationToken ct)
    {
        await board.BeginAsync(ct);
        try
        {
            // Deduplicate inside the transaction — broker redelivery must not double-apply.
            if (!await board.TryClaimFactAsync(SubscriberId, fact.FactId, ct))
            {
                await board.RollbackAsync(ct);
                return;
            }

            var current = await board.GetAsync(fact.OrderId, ct);
            // Already at or past this version: keep the claim, skip the row write.
            if (current is not null && fact.Version <= current.Version)
            {
                await board.CommitAsync(ct);
                return;
            }

            OrderBoardRow next = fact switch
            {
                OrderPlaced p => new OrderBoardRow(
                    p.OrderId,
                    p.CustomerName,
                    string.Join(", ", p.Lines.Select(l => $"{l.Sku}×{l.Qty}")),
                    p.Total,
                    nameof(OrderStatus.Placed),
                    p.WarehouseRegion,
                    p.At,
                    p.Version),
                OrderPaid p when current is not null => current with
                {
                    Status = nameof(OrderStatus.Paid),
                    LastChangedAt = p.At, Version = p.Version
                },
                OrderShipped p when current is not null => current with
                {
                    Status = nameof(OrderStatus.Shipped),
                    LastChangedAt = p.At, Version = p.Version
                },
                OrderCancelled p when current is not null => current with
                {
                    Status = nameof(OrderStatus.Cancelled),
                    LastChangedAt = p.At, Version = p.Version
                },
                // Missing predecessor (e.g. OrderPaid before OrderPlaced): throw so the
                // catch rolls back the inbox claim for retry — do not drop the fact.
                _ => throw new InvalidOperationException(
                    $"Cannot project {fact.GetType().Name} at board version {current?.Version}")
            };

            await board.UpsertIfNewerAsync(next, ct);
            await board.CommitAsync(ct);
        }
        catch
        {
            await board.RollbackAsync(ct);
            throw;
        }
    }
}
```

The claim and the apply share one read-store transaction, so a redelivered fact is rejected at the claim, and a failed apply rolls the claim back for retry. A fact at or below the row's version keeps its claim but skips the write. A fact with no predecessor, such as `OrderPaid` arriving before `OrderPlaced`, throws; the catch rolls the claim back, and the fact is retried later instead of being dropped. The projector never re-checks a business rule. It maps facts to rows.

Finally, the query side, where the consistency boundary becomes code. There are three ways to read, each with a different tolerance for lag.

```csharp
// --- Query side + consistency boundary ---

sealed class OrderBoardQueries(IOrderBoardStore board, OrderCommands write)
{
    // UTC calendar day — production often uses a region-local day boundary instead.
    public Task<IReadOnlyList<OrderBoardRow>> TodaysBoardAsync(
        string region, CancellationToken ct)
        => board.ListByRegionAsync(region, DateOnly.FromDateTime(DateTime.UtcNow), ct);

    // After Place/Pay/Ship/Cancel: wait until the board reflects writeVersion (or timeout).
    public async Task<OrderBoardRow?> WaitForVersionAsync(
        Guid orderId, int writeVersion, TimeSpan budget, CancellationToken ct)
    {
        var deadline = DateTime.UtcNow + budget;
        while (DateTime.UtcNow < deadline)
        {
            ct.ThrowIfCancellationRequested();
            var row = await board.GetAsync(orderId, ct);
            if (row is not null && row.Version >= writeVersion) return row;
            await Task.Delay(25, ct);
        }
        return await board.GetAsync(orderId, ct); // may still be stale — caller decides
    }

    // Paths that cannot tolerate lag: read the write model, not the board.
    public Task<Order?> ConfirmationAsync(Guid orderId, CancellationToken ct)
        => write.GetForEditAsync(orderId, ct);
}
```

Most board traffic takes `TodaysBoardAsync`: it reads the denormalized store as it is and accepts a short lag. `WaitForVersionAsync` polls until the row reaches the version a command returned or the time budget runs out, in which case the caller gets a possibly stale row and decides what to do. `ConfirmationAsync` reads the write model through the escape hatch, for paths that cannot tolerate lag at all. One detail to keep in mind: "today" in the sketch is the UTC calendar day, and production boards often use a region-local day boundary instead.

**In production.** Libraries and frameworks encode this split once you leave the sketch: MediatR-style command and query pipelines, Marten projections, KurrentDB subscriptions, dedicated read-store builders. Prefer them for the plumbing. The pattern is the two models and the explicit consistency boundary, not any particular mediator package. Pairing with Event Sourcing is common when the write side is already a log, and still optional.

## Trade-offs / Where it bites

Each cost below is real for the orders board. Read them before choosing the split, not after.

**One model usually wins.** If a normalized schema with ordinary queries can answer the board without misrepresenting the rules and without slowing the writes, keep the single store. The split doubles what you evolve: a new field on a command usually means a projector change, a read-model migration, and a rebuild. Martin Fowler's warning is the right default: for most systems, CQRS adds risky complexity. Reach for it when the shapes genuinely diverge, not to complete an architecture diagram.

**Projection lag is a product decision.** The board is eventually consistent with the write model. A customer who has just paid can refresh and still see Placed until the projector runs. Decide per screen: wait for the board to reach the command's version, read the write model directly for that screen, or do not split the models for it. If every path needs to read its own writes immediately and you have no plan for a version wait or a write-model read, keep those reads on the write model rather than building a projection you will then try to make synchronous. Treating the read model as if it were synchronously correct brings back the dual-write coupling the split was meant to remove.

**Keep the rules in one place.** Invariants belong to the write model. The moment the projector or a read-model query re-checks "cannot ship if unpaid", there are two places that can disagree, and in production they eventually will. Keep projections to mapping facts onto rows. A query that needs a business decision is a command, or a read of the write model, not a smarter projector.

**CQRS does not require Event Sourcing.** The sketch's write model is a mutable aggregate that emits facts on commit. An event-sourced write model works too, and the pairing is common. But wanting events is not a reason to adopt CQRS, and adopting CQRS is not a reason to adopt Event Sourcing. Decide each on its own merits.

**Rebuilds and dual evolution.** A buggy projector means replaying the facts into a corrected read store: wall-clock time, disk, and a cutover plan. Every schema change lands twice, once per model. Budget both when you choose the split; they are the complexity the first trade-off warns about.

**Never write through the read model.** An upsert from an HTTP handler "because the board needs it now" bypasses the rules and creates a second source of truth. Commands change the write model; the projector updates the board; queries read the board, or take the deliberate escape hatch to the write model.

## Catalog signal

Reach for CQRS when the read and write models genuinely need different shapes: heavy dashboards against strict writes, loads that scale independently, or different teams owning each side. Take it only when the consistency gap is acceptable, or is covered by an explicit version wait or a write-model read for the paths that cannot tolerate it. Signal: "read model and write model genuinely need different shapes."

The mechanism, in three lines: commands change the write model, which enforces the rules and emits a fact for each change in the same transaction; the projector applies each fact to the board once, in version order, and ignores the rest; the consistency boundary says which reads may be stale and which may not.

## Further reading

- Greg Young, CQRS Documents. The original write-up: Command Query Responsibility Segregation as a separation of models, not merely Meyer's command-query separation on methods, and why the interesting consequences are architectural.
- Martin Fowler, CQRS. A short canonical statement of separate update and read models, the variation from a shared database to a separate reporting store, and the explicit warning that for most systems CQRS adds risky complexity.
- Azure Architecture Center, CQRS pattern. The cloud-patterns treatment: single-store versus separate-store CQRS, independent scaling, materialized read models, synchronization through events, and the Transactional Outbox pairing when the write side publishes facts for projections.

---

## Editor's note

**Structure changes**

- New lede and promise. The old lede was the solution compressed into one sentence with three undefined terms; its content is now the intro paragraph, unpacked. The intro names CQRS, states the idea, and says what the article covers.
- "The Problem" keeps its three causes and ends with a hand-off to the trade-offs. The "do-not-use-when" paragraph moved there (see cuts).
- "Structure" now orders the parts as a change flows through them (write model, fact emission, projector, read model, consistency boundary) instead of command side, query side, projection, boundary, emission, so each part is defined using only the ones before it. The table holds names and one-line jobs; the reasoning from each cell became a paragraph.
- "Implementation": the preview paragraph was replaced with the sketch's framing. The listing is split into six segments in the same order as the parts, each with a sentence before and after. The post-code paragraph was distributed across the segments. The prose follows the C#; the TypeScript tab is mentioned once.
- "Trade-offs" paragraphs each lead with the situation. "The duplicated-logic trap" was retitled "Keep the rules in one place".
- "Catalog signal" gained the mechanism in three lines as the takeaway.

**Cuts**

- Flourish, each replaced with the literal statement: "joining itself into a corner", "lag the ledger by a beat", "melting the write path", "the architecture diagram looked incomplete without a box labeled CQRS", "the complexity bill the brief names".
- Repetition: the "use one model if one will do" argument appeared in The Problem, Trade-offs, and Catalog signal. It is argued once, in Trade-offs. The Problem has a one-line hand-off, and Catalog signal keeps the decision rule.
- "(Begin / Commit / Rollback, matching Event Sourcing)" from the post-code paragraph. The transaction methods are visible in the code, and the comparison with the Event Sourcing article is a cross-reference this reader cannot follow. Restore it if the series links the two articles.
- The paired TypeScript identifiers: "SaveAsync / save", "ConcurrencyException / ConcurrencyError", "UpsertIfNewerAsync / upsertIfNewer", "WaitForVersionAsync / waitForVersion", "GetForEditAsync / getForEdit". The prose follows the C# only.
- "The catalog's do-not-use-when is the heart of this pattern, not a footnote." Its substance is the first trade-off.

**Author questions**

- The supplied article has no TypeScript tab. If the site's tab component needs one block per tab, either apply the same six splits to the TypeScript listing or place the full TypeScript listing after the narrated C#.
- The concurrency walk-through under the command handlers (both writers read version 2, the loser's own rule rejects it on reload) is derived from the code, not stated in the source prose. Confirm it matches the intended reading.
- "Catalog signal" and "the brief" assume readers know the series' catalog. The heading is kept because the template requires it; the body no longer refers to the catalog as something the reader has open.

**Assumptions**

- Reader: a backend developer who has not used CQRS and may not have read the Event Sourcing, Transactional Outbox, or Idempotent Consumer articles. Each is named once with a one-clause gloss.
- Template kept: Intent, The Problem, Structure, Implementation, Trade-offs / Where it bites, Catalog signal, Further reading. Suggested template changes: rename "Structure" to "The parts" and "Trade-offs / Where it bites" to "Where the split costs you", and end "Catalog signal" with a takeaway in every article.
