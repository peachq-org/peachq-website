using kx;

namespace CSharpApiExamples;

public static class TableQuery
{
    const string DefaultQuery = "0!select trades:count i,sum size by sym from trade";

    public static int Run(string host, int port, string? query)
    {
        object result;
        using (var conn = new c(host, port, "username:password"))
        {
            try
            {
                result = conn.k(query ?? DefaultQuery);
            }
            catch (KException e)
            {
                Console.Error.WriteLine($"q error: {e.Message}");
                return 1;
            }
        }
        if (result is not c.Flip table)
        {
            Console.Error.WriteLine($"not a table: {result?.GetType().Name ?? "null"}; unkey a keyed table with 0!");
            return 1;
        }
        Print(table, 5);
        return 0;
    }

    public static void Print(c.Flip table, int maxRows)
    {
        int rows = c.n(table.y[0]);
        Console.WriteLine(string.Concat(table.x.Select(name => name.PadRight(14))).TrimEnd());
        for (int row = 0; row < Math.Min(maxRows, rows); row++)
        {
            var cells = table.y.Select(column => Format(c.at(column, row)).PadRight(14));
            Console.WriteLine(string.Concat(cells).TrimEnd());
        }
        Console.WriteLine($"{rows} rows");
    }

    public static string Format(object value) => value switch
    {
        double d => d.ToString("F4"),
        bool b => b ? "true" : "false",
        TimeSpan t => t.ToString(@"hh\:mm\:ss\.fff"),
        c.Date d => c.qn(d) ? "" : d.DateTime().ToString("yyyy-MM-dd"),
        DateTime p => p.ToString("yyyy-MM-dd HH:mm:ss.fff"),
        _ => value?.ToString() ?? ""
    };
}
