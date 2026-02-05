// Edge Function: Validate Stripe Checkout Session
// Validates a Stripe checkout session and returns customer email for onboarding
//
// Deploy with:
// supabase functions deploy validate-stripe-session --no-verify-jwt
//
// Set secret:
// supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Stripe } from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })

    const { sessionId } = await req.json()

    if (!sessionId) {
      throw new Error('sessionId is required')
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      throw new Error('Invalid session ID')
    }

    // Check if session is paid/complete
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new Error('Session is not paid or complete')
    }

    // Return customer info
    return new Response(
      JSON.stringify({
        valid: true,
        customerEmail: session.customer_details?.email || session.customer_email,
        subscriptionId: session.subscription,
        customerId: session.customer,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error validating session:', error)

    return new Response(
      JSON.stringify({
        valid: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
