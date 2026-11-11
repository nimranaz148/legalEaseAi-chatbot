import { Citation, DebugInfo } from "./api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  found?: boolean;
  disclaimer?: string;
  debug?: DebugInfo | null;
  timestamp: string;
}
