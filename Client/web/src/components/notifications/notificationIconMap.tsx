import type { ComponentType } from "react";
import {
  Ban,
  Bell,
  CheckCircle2,
  CircleX,
  ClipboardList,
  Clock3,
  MessageSquare,
} from "lucide-react";

type IconProps = { className?: string; size?: number; strokeWidth?: number };

export function notificationTypeIcon(type: string): ComponentType<IconProps> {
  switch (type) {
    case "VISIT_REQUEST_RECEIVED":
    case "VISIT_APPROVED":
      return CheckCircle2;
    case "VISIT_DENIED":
      return CircleX;
    case "VISIT_CANCELLED":
      return Ban;
    case "VISIT_REMINDER_24H":
    case "VISIT_REMINDER_1H":
      return Clock3;
    case "CAREPLAN_UPDATED":
      return ClipboardList;
    case "MESSAGE":
    case "MESSAGE_RECEIVED":
      return MessageSquare;
    default:
      return Bell;
  }
}
