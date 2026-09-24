# Finance Starter Pack checks

The complete setup and monitor adaptation are in
`content/docs/cookbook/torq.md`. Start the five processes there, then run:

```bash
python3 demos/torq/verify-finance.py --q /path/to/downloaded/q --output /tmp/torq-checks.json
node demos/torq/check-monitor.cjs 'http://localhost:6009/.non?monitorui' /tmp/torq-browser
```

The first check verifies initialization, increasing trade counts, aggregate
queries, heartbeat records, seven loaded monitor checks and the HTTP page.
The second uses Playwright to check initial and live WebSocket data and save a
real screenshot. They leave the stack running; stop it with the recipe's command.
Use a disposable local installation with the recipe's ports available.

Current integration issues are in `DEFECTS.md`.

## Sources

TorQ and the Finance Starter Pack are downloaded from Data Intellect's repositories
at the revisions pinned in the page. Retain their MIT licences and other component
notices. No upstream implementation is vendored here. The screenshot is an actual
browser capture and retains its Data Intellect attribution.
