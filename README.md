# Vela — Client Site
Deploy this to: yourdomain.com (e.g. getvela.io)

URLs after deploy:
  /          → Landing page
  /demo      → Live agent demo
  /pricing   → Pricing + payment
  /onboard   → Client onboarding form
  /widget    → Embed widget preview
  /widget.js → Drop-in chat script

Setup:
1. Deploy this folder to Vercel
2. Add ANTHROPIC_API_KEY in Vercel Environment Variables
3. Connect your domain (e.g. getvela.io)
4. Add Flutterwave + Paystack links in vela-pricing.html
