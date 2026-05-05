# Vela — Admin Panel (PRIVATE)
Deploy to: admin.yourdomain.com

Password: Ikwetion6@$
Change in: Dashboard → Settings → Operator Profile → Change Password

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILES IN THIS REPO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

index.html        → Your operator dashboard (/)
sales.html        → Your sales pipeline (/sales)
chat.js           → Anthropic API proxy (/api/chat)
leads.js          → Upstash leads database (/api/leads)
vercel.json       → Route config

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — Environment Variables (Vercel → Settings → Env Variables)
  ANTHROPIC_API_KEY = sk-ant-your-key-here
  KV_REST_API_URL   = (auto-added by Upstash)
  KV_REST_API_TOKEN = (auto-added by Upstash)

STEP 2 — Connect Upstash
  Vercel → Storage → Connect upstash-kv-violet-flame → this project

STEP 3 — Connect subdomain
  Vercel → Domains → Add admin.yourdomain.com
  DNS: CNAME admin → cname.vercel-dns.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW LEADS REACH YOUR DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client joins waitlist → saved to Upstash → appears in Leads tab
Client submits onboarding → saved to Upstash → appears in Leads tab
Dashboard auto-refreshes every 30 seconds
