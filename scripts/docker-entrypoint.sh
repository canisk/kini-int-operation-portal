#!/bin/sh
set -eu

# Side-process HTTP scheduler (9am/1pm) — does not touch Next instrumentation.
if [ "${SYNC_SCHEDULER_ENABLED:-true}" = "true" ]; then
  node ./scripts/http-sync-scheduler.mjs &
fi

exec node server.js
