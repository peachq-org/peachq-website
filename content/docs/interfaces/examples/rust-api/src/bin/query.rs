use kdbplus::ipc::*;
use kdbplus::qattribute;

#[tokio::main]
async fn main() -> Result<()> {
    let mut q = QStream::connect(ConnectionMethod::TCP, "localhost", 5005, "rust:pass").await?;

    let summary = q
        .send_sync_message(&"0!select trades:count i,sum size by sym from trade")
        .await?;
    let syms = summary.get_column("sym")?.as_vec::<String>()?;
    let trades = summary.get_column("trades")?.as_vec::<i64>()?;
    let sizes = summary.get_column("size")?.as_vec::<i32>()?;
    println!("{:<6} {:>8} {:>8}", "sym", "trades", "size");
    for i in 0..syms.len() {
        println!("{:<6} {:>8} {:>8}", syms[i], trades[i], sizes[i]);
    }

    // Functional query adapted from the kdbplus 0.3.8 README client example (Apache-2.0).
    let call = K::new_compound_list(vec![
        K::new_string(
            String::from("{[s;n] n#select time,price,size from trade where sym=s}"),
            qattribute::NONE,
        ),
        K::new_symbol(String::from("GOOG")),
        K::new_long(-3),
    ]);
    let recent = q.send_sync_message(&call).await?;
    println!("last 3 GOOG prices: {}", recent.get_column("price")?);

    let failed = q.send_sync_message(&"1+`a").await?;
    println!("1+`a failed with q error: {}", failed.get_error_string()?);

    q.shutdown().await?;
    Ok(())
}
