import type { ChatBskyConvoDefs } from "@atproto/api";

export class BSkyConvoInfo {
  id: string;
  unreadCount: number;
  isRequest: boolean;
  hasLastMessage: boolean;
  constructor(convo: ChatBskyConvoDefs.ConvoView) {
    this.id = convo.id;
    this.isRequest = (convo.status === "request") || false;
    this.hasLastMessage = convo.lastMessage !== undefined;
    this.unreadCount = convo.unreadCount;
  }
};
