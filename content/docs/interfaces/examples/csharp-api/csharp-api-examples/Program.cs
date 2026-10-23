namespace CSharpApiExamples;

public static class Program
{
    public const string Host = "localhost";
    public const int Port = 5002;

    public static int Main(string[] args)
    {
        switch (args.Length > 0 ? args[0] : "")
        {
            case "feed":
                return FeedDemo.Run(Host, Port);
            case "query":
                return TableQuery.Run(Host, Port, args.Length > 1 ? args[1] : null);
            case "subscribe":
                return Subscriber.Run(args.Length > 1 ? args[1] : Host,
                                      args.Length > 2 ? int.Parse(args[2]) : Port);
            default:
                Console.Error.WriteLine("usage: dotnet run -- feed | query [expression] | subscribe [host port]");
                return 2;
        }
    }
}
