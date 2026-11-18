/**
 * Connector store operations (18 Nov 2026).
 *
 * Every entry compiles to a real n8n node (adapters/n8n/compiler/connector-steps.ts)
 * that runs on the app's ONE account credential. Nothing here is a placeholder;
 * anything not genuinely built stays out of this list.
 */

import type { StepKind, SupportedIntegration } from "../schema";
import type { OperationDefinition } from "./operation-catalog";

const op = (
  integration: SupportedIntegration,
  operation: string,
  kinds: readonly StepKind[],
  requiredParams: readonly string[],
  description: string,
): OperationDefinition => ({ integration, operation, kinds, requiredParams, description });

/**
 * Internal step for a user's own MCP tool. NEVER offered to the model: the
 * production converter lowers an approved custom tool step into it, with a
 * signed token bound to user + connector + tool.
 */
export const MCP_CALL_OPERATION: OperationDefinition = {
  integration: null,
  operation: "mcp_call",
  kinds: ["action"],
  requiredParams: ["connector_id", "tool", "token", "input_map"],
  description: "Internal: call an approved tool on the user's own MCP connector through the AutomateCraft backend.",
};

export const CONNECTOR_OPERATIONS: readonly OperationDefinition[] = [
  MCP_CALL_OPERATION,
  op("gmail", "list_emails", ["action"], ["query"], "Find recent emails matching a Gmail search."),
  op("gmail", "send_email", ["notification", "action"], ["to", "subject", "body"], "Send a plain-text email from the user's Gmail."),
  op("google_calendar", "list_events", ["action"], [], "List the next upcoming events on the primary calendar."),
  op("google_calendar", "create_event", ["action"], ["summary", "start", "end"], "Create an event on the primary calendar (start/end as ISO date-time)."),
  op("google", "list_files", ["action"], ["query"], "Find files in Google Drive matching a Drive search."),
  op("google_forms", "list_responses", ["action"], ["form_id"], "Read the responses of a Google Form."),
  op("outlook", "send_email", ["notification", "action"], ["to", "subject", "body"], "Send a plain-text email from the user's Outlook."),
  op("outlook", "list_emails", ["action"], [], "List the latest emails in the Outlook inbox."),
  op("outlook_calendar", "list_events", ["action"], [], "List upcoming Outlook calendar events."),
  op("outlook_calendar", "create_event", ["action"], ["summary", "start", "end"], "Create an Outlook calendar event (start/end as ISO date-time, UTC)."),
  op("facebook_pages", "list_posts", ["action"], ["page_id"], "Read recent posts of a Facebook Page."),
  op("facebook_lead_ads", "list_leads", ["action"], ["form_id"], "Read leads submitted to a Facebook lead form."),
  op("instagram", "list_media", ["action"], ["ig_user_id"], "Read recent media of an Instagram business account."),
  op("slack", "read_messages", ["action"], ["channel"], "Read recent messages from a Slack channel the user picked."),
  op("telegram", "send_message", ["notification", "action"], ["chat_id", "text"], "Send a message with the user's Telegram bot."),
  op("hubspot", "search_contact", ["action"], ["email"], "Find a HubSpot contact by email."),
  op("hubspot", "list_deals", ["action"], [], "List recent HubSpot deals."),
  op("zoho_crm", "create_lead", ["save", "action"], ["last_name", "company"], "Create a lead in Zoho CRM."),
  op("zoho_crm", "create_contact", ["save", "action"], ["last_name"], "Create a contact in Zoho CRM."),
  op("zoho_crm", "list_leads", ["action"], [], "List recent Zoho CRM leads."),
  op("pipedrive", "create_person", ["save", "action"], ["name"], "Create a person in Pipedrive."),
  op("pipedrive", "create_deal", ["save", "action"], ["title"], "Create a deal in Pipedrive."),
  op("pipedrive", "list_deals", ["action"], [], "List recent Pipedrive deals."),
  op("trello", "create_card", ["save", "action"], ["list_id", "name"], "Create a card on a Trello list."),
  op("trello", "list_cards", ["action"], ["list_id"], "List the cards on a Trello list."),
  op("asana", "create_task", ["save", "action"], ["workspace", "name"], "Create a task in an Asana workspace."),
  op("asana", "list_tasks", ["action"], ["project"], "List tasks in an Asana project."),
  op("github", "create_issue", ["action"], ["owner", "repo", "title"], "Open an issue on a GitHub repository."),
  op("github", "list_issues", ["action"], ["owner", "repo"], "List open issues of a GitHub repository."),
  op("github", "get_repo", ["action"], ["owner", "repo"], "Read details of a GitHub repository."),
  op("notion", "create_page", ["save", "action"], ["parent_page_id", "title"], "Create a Notion page under a page shared with the app."),
  op("notion", "search", ["action"], ["query"], "Search Notion pages shared with the app."),
  op("airtable", "create_record", ["save", "action"], ["base_id", "table", "field", "value"], "Add a record to an Airtable table (one field)."),
  op("airtable", "list_records", ["action"], ["base_id", "table"], "List records of an Airtable table."),
  op("discord", "send_message", ["notification", "action"], ["content"], "Post a message to the Discord channel picked at connection."),
  op("shopify", "list_orders", ["action"], ["shop"], "Read recent orders from a Shopify store."),
  op("woocommerce", "list_orders", ["action"], ["store_url"], "Read recent orders from a WooCommerce store."),
];
