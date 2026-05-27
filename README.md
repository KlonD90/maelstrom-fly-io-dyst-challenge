# Maelstrom Fly.io Dyst Challenge

This is a Bun TypeScript implementation of Fly.io's Gossip Glomers challenge 1, Echo.

Maelstrom nodes are language agnostic: the executable reads newline-delimited JSON messages from `STDIN` and writes newline-delimited JSON replies to `STDOUT`. This project implements the required `init` and `echo` handlers in TypeScript.

## Structure

- `src/index.ts` registers challenge-specific message handlers.
- `src/maelstrom/runtime.ts` owns the reusable Maelstrom data/protocol layer: input parsing, `init`, node identity, message IDs, replies, and dispatch.
- `src/maelstrom/types.ts` contains shared protocol types.

## Setup

```sh
bun install
```

## Local sample

```sh
bun run test:sample
```

You should see an `init_ok` response followed by an `echo_ok` response.

## Run with Maelstrom

Maelstrom 0.2.3 is included locally under `tools/maelstrom`. From this project directory, run:

```sh
bun run test:maelstrom
```

That script runs the TypeScript source file directly with Bun:

```sh
tools/maelstrom/maelstrom test -w echo --bin "$(pwd)/src/index.ts" --node-count 1 --time-limit 10
```

On this machine, the workload succeeds but Maelstrom exits nonzero during analysis because `gnuplot` is not installed for optional performance graphs. The run reported 55 successful echo operations, 0 failures, and `:workload {:valid? true, :errors ()}`.
