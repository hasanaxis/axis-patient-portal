#!/bin/bash

# Deploy Axis Imaging Patient Portal to Supabase
echo "🚀 Deploying Axis Imaging Patient Portal to Supabase..."

# Link to the existing project
echo "📡 Linking to Supabase project..."
supabase link --project-ref yageczmzfuuhlklctojc

# Deploy the Edge Function
echo "⚡ Deploying Edge Functions..."
supabase functions deploy api --no-verify-jwt

# Get the function URL
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your API is now available at:"
echo "https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api"
echo ""
echo "📊 Test endpoints:"
echo "Health: https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/health"
echo "Dashboard: https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/dashboard" 
echo "Studies: https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/studies"
echo "Voyager Webhook: https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/voyager/webhook"
echo ""
echo "🎯 Next steps:"
echo "1. Update frontend to use the new API URL"
echo "2. Test all endpoints"
echo "3. Configure Voyager RIS integration"