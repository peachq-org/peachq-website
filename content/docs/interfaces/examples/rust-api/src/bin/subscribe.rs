use chrono::{Duration, NaiveTime};
use kdbplus::ipc::*;

fn first_row(table: &K) -> Result<String> {
    let millis = table.get_column("time")?.as_vec::<i32>()?[0];
    let time = NaiveTime::MIN + Duration::milliseconds(millis.into());
    Ok(format!(
        "time:{} sym:{} price:{} size:{} stop:{} cond:{} ex:{}",
        time.format("%H:%M:%S%.3f"),
        table.get_column("sym")?.as_vec::<String>()?[0],
        table.get_column("price")?.as_vec::<f64>()?[0],
        table.get_column("size")?.as_vec::<i32>()?[0],
        table.get_column("stop")?.as_vec::<u8>()?[0] != 0,
        &table.get_column("cond")?.as_string()?[..1],
        &table.get_column("ex")?.as_string()?[..1],
    ))
}

#[tokio::main]
async fn main() -> Result<()> {
    let mut q = QStream::connect(ConnectionMethod::TCP, "localhost", 5005, "rust:pass").await?;
    q.send_sync_message(&".u.sub[`trade;`]").await?;
    loop {
        let (_, message) = q.receive_message().await?;
        let parts = message.as_vec::<K>()?;
        let (name, table) = (parts[1].get_symbol()?, &parts[2]);
        println!("{name} update. row 1/{} -> {}", table.len(), first_row(table)?);
    }
}
