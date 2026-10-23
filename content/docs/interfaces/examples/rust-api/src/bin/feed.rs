use chrono::{NaiveTime, Utc};
use kdbplus::ipc::*;
use kdbplus::qattribute::NONE;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const SYMS: [&str; 4] = ["A", "GM", "GOOG", "KX"];
const COLUMNS: [&str; 7] = ["time", "sym", "price", "size", "stop", "cond", "ex"];

struct Random(u64);

impl Random {
    fn below(&mut self, n: usize) -> usize {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 % n as u64) as usize
    }

    fn pick(&mut self, choices: &str) -> char {
        choices.as_bytes()[self.below(choices.len())] as char
    }
}

fn batch(random: &mut Random, prices: &mut [f64; 4]) -> Result<K> {
    let n = 1 + random.below(10);
    let now = Utc::now().time().signed_duration_since(NaiveTime::MIN);
    let (mut sym, mut price, mut size, mut stop) = (vec![], vec![], vec![], vec![]);
    let (mut cond, mut ex) = (String::new(), String::new());
    for _ in 0..n {
        let s = random.below(SYMS.len());
        prices[s] = (prices[s] + (random.below(101) as f64 - 50.0) / 100.0).max(1.0);
        sym.push(SYMS[s].to_string());
        price.push((prices[s] * 100.0).round() / 100.0);
        size.push(1 + random.below(1000) as i32);
        stop.push(random.below(10) == 0);
        cond.push(random.pick("ABS"));
        ex.push(random.pick("LNO"));
    }
    let names = K::new_symbol_list(COLUMNS.map(String::from).to_vec(), NONE);
    let columns = K::new_compound_list(vec![
        K::new_time_list(vec![now; n], NONE),
        K::new_symbol_list(sym, NONE),
        K::new_float_list(price, NONE),
        K::new_int_list(size, NONE),
        K::new_bool_list(stop, NONE),
        K::new_string(cond, NONE),
        K::new_string(ex, NONE),
    ]);
    K::new_dictionary(names, columns)?.flip()
}

#[tokio::main]
async fn main() -> Result<()> {
    let mut q = QStream::connect(ConnectionMethod::TCP, "localhost", 5005, "rust:pass").await?;
    let seed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;
    let mut random = Random(seed | 1);
    let mut prices = [45.0, 30.0, 150.0, 90.0];
    let mut ticker = tokio::time::interval(Duration::from_millis(500));
    loop {
        ticker.tick().await;
        let trades = batch(&mut random, &mut prices)?;
        let rows = trades.len();
        let update = K::new_compound_list(vec![
            K::new_symbol(String::from(".u.upd")),
            K::new_symbol(String::from("trade")),
            trades,
        ]);
        q.send_async_message(&update).await?;
        println!("Sent {rows} trades");
    }
}
