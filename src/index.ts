#!/usr/bin/env bun

import { MaelstromNode } from "./maelstrom/runtime";
import type { JsonValue, MessageBody } from "./maelstrom/types";

type EchoBody = MessageBody & {
  type: "echo";
  echo: JsonValue;
};

function isEchoBody(body: MessageBody): body is EchoBody {
  return body.type === "echo" && Object.hasOwn(body, "echo");
}

const node = new MaelstromNode();

node.handle("echo", (message, runtime) => {
  if (!isEchoBody(message.body)) {
    throw new Error("echo message is missing echo field");
  }

  runtime.reply(message, {
    type: "echo_ok",
    echo: message.body.echo,
  });
});

node.handle("generate", (message, runtime) => {
  return runtime.reply(message, {
    type: "generate_ok",
    id: `${runtime.id}-${Math.random()}-${100 + Math.random()}-${1000 + Math.random()}-${100000 + Math.random()}`,
  });
});

node.run();
