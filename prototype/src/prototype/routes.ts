/** Every page in the prototype. Add new pages here so they show up in the panel and at /prototype. */
export type RouteGroup = { title: string; routes: Array<{ name: string; href: string }> };

export const ROUTE_GROUPS: RouteGroup[] = [
  {
    title: "App",
    routes: [
      { name: "Home", href: "/dashboard" },
      { name: "All Automations", href: "/dashboard/projects" },
      { name: "Automation detail", href: "/dashboard/automations/auto-lead-routing" },
      { name: "Chat (with workflow)", href: "/dashboard/chat/demo-lead-routing" },
      { name: "Chat (new)", href: "/dashboard/chat/new" },
      { name: "Connect Apps", href: "/dashboard/apps" },
      { name: "Execution Logs", href: "/dashboard/logs" },
      { name: "Usage Intelligence", href: "/dashboard/credits" },
      { name: "Usage (redirect)", href: "/dashboard/usage" },
      { name: "Settings", href: "/dashboard/settings" },
      { name: "Setup wizard", href: "/setup?prompt=Send%20a%20WhatsApp%20greeting%20for%20each%20new%20form%20lead" },
      { name: "Build workspace", href: "/build" },
    ],
  },
  {
    title: "Account",
    routes: [
      { name: "Log in", href: "/login" },
      { name: "Sign up", href: "/signup" },
      { name: "Check email", href: "/check-email" },
      { name: "Verify email", href: "/verify-email?email=maya%40northwind-demo.test" },
      { name: "Onboarding", href: "/onboarding" },
    ],
  },
  {
    title: "Marketing",
    routes: [
      { name: "Landing page", href: "/" },
      { name: "Pricing", href: "/pricing" },
      { name: "Integrations", href: "/integrations" },
      { name: "Templates", href: "/templates" },
      { name: "Why us", href: "/why-us" },
      { name: "How credits work", href: "/how-credits-work" },
      { name: "Let's talk", href: "/lets-talk" },
      { name: "Changelog", href: "/changelog" },
      { name: "Status", href: "/status" },
    ],
  },
  {
    title: "Solutions",
    routes: [
      { name: "Agencies", href: "/solutions/agencies" },
      { name: "Operations", href: "/solutions/operations" },
      { name: "Startups", href: "/solutions/startups" },
      { name: "Support", href: "/solutions/support" },
    ],
  },
  {
    title: "Resources",
    routes: [
      { name: "Docs", href: "/docs" },
      { name: "Blog", href: "/blog" },
      { name: "Blog: five automations", href: "/blog/five-automations-every-startup-needs" },
      { name: "Blog: lead routing", href: "/blog/how-to-automate-lead-routing" },
      { name: "Blog: what are logs", href: "/blog/what-are-logs" },
    ],
  },
  {
    title: "Legal",
    routes: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Security", href: "/security" },
    ],
  },
];
