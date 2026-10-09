using kx;

namespace CSharpApiExamples;

public static class Subscriber
{
    public static int Run(string host, int port)
    {
        using var conn = new c(host, port);
        conn.k(".u.sub[`trade;`]");
        while (true)
        {
            object[] message;
            try
            {
                message = (object[])conn.k();
            }
            catch (Exception e) when (e is KException or IOException)
            {
                Console.Error.WriteLine($"Connection closed: {e.Message}");
                return 1;
            }
            var table = (string)message[1];
            var rows = (c.Flip)message[2];
            var first = rows.x.Zip(rows.y, (name, column) => $"{name}:{TableQuery.Format(c.at(column, 0))}");
            Console.WriteLine($"{table} update. row 1/{c.n(rows.y[0])} -> {string.Join(" ", first)}");
        }
    }
}
