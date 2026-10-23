using kx;

namespace CSharpApiExamples;

public record TradeEvent(TimeSpan Time, string Sym, double Price, int Size, bool Stop, char Cond, char Ex);

public static class FakeFeed
{
    static readonly Random Random = new();
    static readonly string[] Syms = { "GOOG", "A", "GM", "KX" };
    static readonly char[] Conds = { 'B', 'S' };
    static readonly char[] Exs = { 'L', 'N' };

    public static void Run(Action<IReadOnlyList<TradeEvent>> listener)
    {
        while (true)
        {
            int count = 1 + Random.Next(10);
            var trades = new List<TradeEvent>(count);
            for (int i = 0; i < count; i++)
            {
                trades.Add(new TradeEvent(DateTime.Now.TimeOfDay, Syms[Random.Next(Syms.Length)],
                                          Random.NextDouble() * 100.0, Random.Next(1000), Random.Next(2) == 1,
                                          Conds[Random.Next(Conds.Length)], Exs[Random.Next(Exs.Length)]));
            }
            listener(trades);
            Thread.Sleep(500);
        }
    }
}

public sealed class FeedHandler : IDisposable
{
    static readonly string[] Columns = { "time", "sym", "price", "size", "stop", "cond", "ex" };
    readonly c conn;

    public FeedHandler(string host, int port)
    {
        conn = new c(host, port);
    }

    public void TradeEvent(IReadOnlyList<TradeEvent> trades)
    {
        int n = trades.Count;
        Console.Write($"Received {n} records from fakefeed. ");
        var time = new TimeSpan[n];
        var sym = new string[n];
        var price = new double[n];
        var size = new int[n];
        var stop = new bool[n];
        var cond = new char[n];
        var ex = new char[n];
        for (int i = 0; i < n; i++)
        {
            time[i] = trades[i].Time;
            sym[i] = trades[i].Sym;
            price[i] = trades[i].Price;
            size[i] = trades[i].Size;
            stop[i] = trades[i].Stop;
            cond[i] = trades[i].Cond;
            ex[i] = trades[i].Ex;
        }
        var table = new c.Flip(new c.Dict(Columns, new object[] { time, sym, price, size, stop, cond, ex }));
        try
        {
            conn.ks(new object[] { ".u.upd", "trade", table });
            Console.WriteLine($"Sent {n} records to q server");
        }
        catch (IOException)
        {
            Console.Error.WriteLine("error sending feed to server.");
        }
    }

    public void Dispose() => conn.Dispose();
}

public static class FeedDemo
{
    public static int Run(string host, int port)
    {
        using var handler = new FeedHandler(host, port);
        FakeFeed.Run(handler.TradeEvent);
        return 0;
    }
}
