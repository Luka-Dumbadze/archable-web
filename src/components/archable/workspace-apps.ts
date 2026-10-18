import { Headset, Users, Cloud, Bot, ChartNoAxesCombined, Workflow } from "lucide-react";

export const WORKSPACE_APPS = [
  { id: "contact", title: "Contact Center", icon: Headset, tone: "app-contact", description: "Unifies calls, chats, email, and customer interactions." },
  { id: "crm", title: "CRM", icon: Users, tone: "app-crm", description: "Unifies customer data, history, and relationships." },
  { id: "storage", title: "Storage", icon: Cloud, tone: "app-storage", description: "Centralize files, media, and organizational resources." },
  { id: "team", title: "AI Team", icon: Bot, tone: "app-team", description: "AI agents that coordinate and execute operational workflows." },
  { id: "analytics", title: "Analytics", icon: ChartNoAxesCombined, tone: "app-analytics", description: "Monitor organizational performance and operational intelligence." },
  { id: "operations", title: "Operations", icon: Workflow, tone: "app-operations", description: "Coordinate workflows, tasks, and operational execution." },
] as const;

export type WorkspaceAppId = (typeof WORKSPACE_APPS)[number]["id"];