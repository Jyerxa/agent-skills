# CQRS

Ops needs today's orders by region with customer names and payment status in one row — the write model that enforces cancel and ship invariants cannot serve that shape without either lying or joining itself into a corner.

8 min read · Updated 2026-10-29

Checkout owns a normalized orders aggregate: line items, money totals, and a state machine that refuses to ship an unpaid order or cancel one already in transit. Ops wants a different answer — today's board as one denormalized row per order: customer display name, SKU list, payment status, warehouse region, last change time — sorted and filtered without joining five tables on every refresh. Forcing one model to do both jobs either slows the write path with read-shaped indexes and joins, or ships a board that cannot express the invariants. CQRS splits them: commands mutate the write model; a projection pipeline builds read models for the shapes queries actually need — accepting that the board may lag the ledger by a beat.

## Intent

Split the write model (commands, invariants) from one or more read models optimized for queries, accepting that they may lag or differ in shape.

## The Problem

A single normalized store is the right default for most domains. One schema, one transaction boundary, read-your-writes for free. It fails when the catalog signal shows up — read model and write model genuinely need different shapes — because the structure that protects writes fights the structure that answers reads:

- **Different shapes.** The write model is normalized around invariants: "an order cannot ship unpaid," "line totals must equal the header," "cancel is illegal after ship." The board wants a flat, denormalized card with customer name already resolved and SKUs already concatenated. Serving that card from the write schema means either expensive joins on every poll or denormalizing into the write tables and accepting update anomalies on every customer rename.
- **Independent scale.** Command traffic is bursty and correctness-bound; board traffic is steady, cache-friendly, and often an order of magnitude higher. One store forces you to provision for the union of both loads and to take write locks (or row contention) on the same pages the board is scanning.
- **Different ownership.** A billing team owns payment state transitions; a fulfillment team owns the regional board. Coupling both to one schema couples their release trains and their failure modes — a migration for the board's filter columns becomes a write-path risk.

The catalog's do-not-use-when is the heart of this pattern, not a footnote. If one model would do — a single store with ordinary queries — use that. Wanting CQRS only to "use events" is not a reason; decide Event Sourcing on its own merits (CQRS is a common pairing, not a prerequisite either way). If every path needs immediate read-your-writes and you have no plan for a version checkpoint or a read-from-write escape hatch, keep those reads on the write model instead of inventing a projection you will then try to make synchronous.

## Structure

CQRS makes the command path and the query path different models. The write model owns invariants; read models own query shapes; a projection pipeline bridges them; a consistency boundary says how stale is OK.

| Role | Responsibility |
| --- | --- |
| Command side / write model | Accepts commands (PlaceOrder, MarkPaid, Ship, Cancel). Enforces invariants. Persists in a write-optimized schema (normalized rows, or an event stream — see Event Sourcing). Never serves the board's denormalized queries. Concurrent commands collide on an expected-version save so two writers cannot both commit against the same snapshot. |
| Query side / read model(s) | One or more stores shaped for specific queries: ops board row, customer order history card, search document. Updated by projections, not by command handlers writing "through" them. May use a different technology (document store, search index) than the write side. |
| Projection pipeline | Consumes facts the write side emits (domain events, or change records) and upserts read models. Must tolerate at-least-once delivery — typically Idempotent Consumer discipline (inbox keyed on (subscriberId, factId)) plus an atomic per-entity version guard so out-of-order or duplicate facts do not corrupt the board. Claim and apply share one read-store transaction so a failed apply rolls the claim back for retry. |
| Consistency boundary | The explicit contract for lag: how stale a read may be, whether a path waits on a version checkpoint after a command, and which rare paths read the write model directly for read-your-writes. Without this, every UI assumes the board is "current" and every bug looks like data loss. |
| Fact emission | How the write commit becomes input to projectors. Prefer a Transactional Outbox (or the event store's own subscription feed) over a dual write to the broker — crash between commit and publish must not lose the fact the board depends on. |

Commands never write the read model. Queries never mutate the write model. The projection is the only bridge — and it is asynchronous unless you have deliberately chosen a synchronous in-process update and accepted that it couples the two again.

## Implementation

Both tabs wrap the same scenario: an order write model that places, marks paid, ships, and cancels under invariants, emits facts through an outbox-shaped hook, and a projector that maintains a denormalized OrderBoardRow for ops. Saves take an expectedVersion and throw on conflict so concurrent Ship / Cancel cannot both win. After a command, the handler returns the write-side Version. The query side either reads the board as-is (accepting lag) or waits until the projected version catches up — the consistency boundary made visible. A GetForEditAsync / getForEdit escape hatch reads the write model for the rare path that must see the command's result immediately (confirmation page right after place).

Self-contained — no MediatR, Marten, or KurrentDB (formerly EventStoreDB) subscription client — so the command / project / query split stays visible. Production stacks add brokers, competing consumers, and rebuild tooling; the sketch is the contract those features hang on. The write model here is ordinary mutable state plus emitted facts — CQRS without Event Sourcing. Swapping the write store for an event stream is a separate decision.

C# | TypeScript

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

SaveAsync / save is the Transactional Outbox boundary: the order row and the fact rows commit together only when expectedVersion still matches (UPDATE … WHERE version = @expected, or insert when expected is 0). Concurrent Ship and Cancel against the same Paid snapshot collide — one wins, the other gets ConcurrencyException / ConcurrencyError and must reload. The projector runs claim + apply in one read-store transaction (Begin / Commit / Rollback, matching Event Sourcing): a missing predecessor throws and rolls the inbox claim back for retry instead of permanently dropping the fact. Inbox keys are (subscriberId, factId). UpsertIfNewerAsync / upsertIfNewer is the atomic version guard (WHERE version < @v) so concurrent relays cannot regress the board via check-then-act. Commands return Version so the UI can either wait (WaitForVersionAsync / waitForVersion) or take the confirmation-page escape hatch (GetForEditAsync / getForEdit) that reads the write model. Most board traffic just reads the denormalized store and accepts a short lag; "today" is the UTC calendar day in the sketch.

**Modern idiom.** Libraries and frameworks (MediatR-style command/query pipelines, Marten projections, KurrentDB (formerly EventStoreDB) subscriptions, dedicated read-store builders) encode this split once you leave the sketch. Prefer them for production plumbing; the pattern is the two models + explicit consistency boundary, not a particular mediator package. Pairing with Event Sourcing is common when the write side is already a log — still optional.

## Trade-offs / Where it bites

**One model usually wins.** If a normalized schema plus ordinary queries answers the board without lying about invariants or melting the write path, keep the single store. CQRS doubles the surfaces you evolve: every new field on a command often means a projector change, a read-model migration, and a rebuild story. Fowler's blunt line is the right default — for most systems the split adds risky complexity. Reach for it when the shapes genuinely diverge, not because the architecture diagram looked incomplete without a box labeled "CQRS."

**Projection lag is a product decision.** The board is eventually consistent with the write model. Users who just paid will not see "Paid" on the board until the projector runs. If the UX cannot tolerate that, you need a version checkpoint wait, a read-from-write escape hatch for those paths, or you should not have split the models for that screen. Pretending the read model is synchronously correct reintroduces the dual-write coupling the split was meant to remove.

**The duplicated-logic trap.** Invariants belong on the write side. The moment the projector (or the read model) starts re-checking "cannot ship if unpaid," you have two places that can disagree — and the board will eventually disagree in production. Keep projections dumb: map facts to rows. If a query needs a business decision, that is a command or a write-model read, not a smarter projector.

**CQRS does not require Event Sourcing.** The write model in the sketch is a mutable aggregate that emits facts on commit. An event-sourced write model works too, and the pairing is common, but "we want events" is not a reason to adopt CQRS, and "we adopted CQRS" is not a reason to adopt Event Sourcing. Decide each on its catalog signal.

**Rebuilds and dual evolution.** A buggy projector means replaying facts into a corrected read store — wall-clock time, disk, and a cutover plan. Schema changes land twice. Budget that cost when you choose the split; it is the complexity bill the brief names.

**Do not write through the read model.** Upserts from an HTTP handler "because the board needs it now" bypass invariants and create a second source of truth. Commands mutate the write model; projections update the board; queries read the board (or the deliberate write-model escape hatch).

## Catalog signal

Reach for CQRS when read and write shapes genuinely diverge — heavy dashboards versus strict writes, independent scale, or different team ownership — and the consistency gap is acceptable (or covered by an explicit version wait / write-model read). Signal: "read model and write model genuinely need different shapes."

## Further reading

- Greg Young, CQRS Documents — the original write-up: Command/Query Responsibility Segregation as a segregation of models (not merely Meyer's CQS on methods), and why the interesting consequences are architectural.
- Martin Fowler, CQRS — short canonical statement of separate update and read models, the variation from shared database to separate reporting store, and the explicit warning that for most systems CQRS adds risky complexity.
- Azure Architecture Center — CQRS pattern — cloud-patterns treatment of single-store vs separate-store CQRS, independent scaling, materialized read models, synchronization via events, and the Transactional Outbox pairing when the write side publishes facts for projections.
