export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type MessageBody = {
  type: string;
  msg_id?: number;
  in_reply_to?: number;
  [key: string]: JsonValue | undefined;
};

export type Message<TBody extends MessageBody = MessageBody> = {
  src: string;
  dest: string;
  body: TBody;
};

export type InitBody = MessageBody & {
  type: "init";
  node_id: string;
  node_ids: string[];
};
