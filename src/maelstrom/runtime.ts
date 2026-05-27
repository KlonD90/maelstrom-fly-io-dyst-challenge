import { createInterface, type Interface } from "node:readline";
import type { Readable, Writable } from "node:stream";

import type { InitBody, Message, MessageBody } from "./types";

export type Handler<TBody extends MessageBody = MessageBody> = (
  message: Message<TBody>,
  node: MaelstromNode,
) => void | Promise<void>;

type RuntimeOptions = {
  input?: Readable;
  output?: Writable;
  error?: Writable;
};

export class MaelstromNode {
  private readonly handlers = new Map<string, Handler>();
  private readonly input: Readable;
  private readonly output: Writable;
  private readonly error: Writable;
  private nodeId: string | undefined;
  private clusterNodeIds: string[] = [];
  private nextMessageId = 1;

  constructor(options: RuntimeOptions = {}) {
    this.input = options.input ?? process.stdin;
    this.output = options.output ?? process.stdout;
    this.error = options.error ?? process.stderr;
  }

  get id(): string | undefined {
    return this.nodeId;
  }

  get nodeIds(): readonly string[] {
    return this.clusterNodeIds;
  }

  handle<TBody extends MessageBody>(
    type: TBody["type"],
    handler: Handler<TBody>,
  ): this {
    this.handlers.set(type, handler as Handler);
    return this;
  }

  send(dest: string, body: MessageBody): void {
    if (!this.nodeId) {
      throw new Error("cannot send before init");
    }

    const message: Message = {
      src: this.nodeId,
      dest,
      body: {
        msg_id: this.nextMessageId++,
        ...body,
      },
    };

    this.output.write(`${JSON.stringify(message)}\n`);
  }

  reply(request: Message, body: MessageBody): void {
    this.send(request.src, {
      ...body,
      in_reply_to: request.body.msg_id,
    });
  }

  run(): void {
    const input = createInterface({
      input: this.input,
      crlfDelay: Infinity,
    });

    input.on("line", (line) => {
      void this.handleLine(line, input);
    });
  }

  private async handleLine(line: string, input: Interface): Promise<void> {
    if (!line.trim()) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(line);
      if (!isMessage(parsed)) {
        throw new Error("input is not a Maelstrom message");
      }

      await this.dispatch(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error.write(`Failed to handle input line: ${message}\n`);
      process.exitCode = 1;
      input.close();
    }
  }

  private async dispatch(message: Message): Promise<void> {
    const { body } = message;

    if (isInitBody(body)) {
      this.nodeId = body.node_id;
      this.clusterNodeIds = body.node_ids;
      this.reply(message, { type: "init_ok" });
      return;
    }

    const handler = this.handlers.get(body.type);
    if (handler) {
      await handler(message, this);
      return;
    }

    this.error.write(
      `No handler for message type ${JSON.stringify(body.type)} on ${this.nodeId ?? "uninitialized"}; cluster=${this.clusterNodeIds.join(",")}\n`,
    );
  }
}

function isInitBody(body: MessageBody): body is InitBody {
  return (
    body.type === "init" &&
    typeof body.node_id === "string" &&
    Array.isArray(body.node_ids) &&
    body.node_ids.every((id) => typeof id === "string")
  );
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Message>;
  return (
    typeof candidate.src === "string" &&
    typeof candidate.dest === "string" &&
    !!candidate.body &&
    typeof candidate.body === "object" &&
    typeof candidate.body.type === "string"
  );
}
