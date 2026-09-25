# TorQ monitor integration issue

## TORQ-006: initial WebSocket subscription requests a function schema

With PeachQ v0.85, TorQ `7e77714a62fb49dc42b11500a96bcfa535ce9a19` and Finance
Starter Pack `50fcd5ad6d8e50fcd71965010ce38a1fccdad87b`, run the cookbook setup
without its `html.q` replacement. Open the monitor in a browser.

Expected: an initial `start` WebSocket message followed by heartbeat `upd`
messages. Observed: updates arrive but the initial `start` message is absent.
The existing `.html.add` path builds a table schema for a function-valued entry.
Registering the socket directly, as the recipe does, passes the initial-data and
live-update browser checks. Keep the workaround in the page until that path can
be used unchanged. This is an integration adaptation; runtime ownership has not
been established by this test.

No additional PeachQ failure was found in the five-process recipe. Heartbeats
arrive on a 30-second interval, so checks must wait for readiness rather than
fail immediately on an empty table.
