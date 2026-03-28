import { ConvoView } from '@atproto/api/dist/client/types/chat/bsky/convo/defs';

export class BSkyConvoInfo {
  id: string;
  unreadCount: number;
  isRequest: boolean;
  constructor(convo: ConvoView) {
    this.id = convo.id;
    this.isRequest = (convo.status === "request") || false;
    this.unreadCount = convo.unreadCount;
  }
};
