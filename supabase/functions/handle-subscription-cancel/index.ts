// Edge Function: Handle Stripe Subscription Cancellation
// Deletes user's couple data when their subscription is cancelled via Stripe webhook
//
// Deploy with:
// supabase functions deploy handle-subscription-cancel --no-verify-jwt
//
// Set secrets:
// supabase secrets set STRIPE_SECRET_KEY=sk_xxx
// supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
// supabase secrets set SUPABASE_SERVICE_KEY=eyJxxx (service role key)
//
// Then configure a Stripe webhook pointing to:
// https://<project-ref>.supabase.co/functions/v1/handle-subscription-cancel
// with event: customer.subscription.deleted

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Stripe } from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
        const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured')
        }
        if (!stripeWebhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
        }
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase environment variables are not configured')
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2024-12-18.acacia',
        })

        // Get the raw body and signature for webhook verification
        const body = await req.text()
        const signature = req.headers.get('stripe-signature')

        if (!signature) {
            throw new Error('Missing Stripe signature')
        }

        // Verify the webhook signature
        let event: Stripe.Event
        try {
            event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message)
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Only handle subscription cancellation events
        if (event.type !== 'customer.subscription.deleted') {
            return new Response(
                JSON.stringify({ received: true, message: 'Event type not handled' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        console.log(`Processing subscription cancellation: ${subscriptionId}`)

        // Create Supabase client with service role key (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Find the couple with this subscription ID
        const { data: couple, error: findError } = await supabase
            .from('couples')
            .select('id, path, couple_name, user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

        if (findError || !couple) {
            console.log(`No couple found for subscription ${subscriptionId}`)
            return new Response(
                JSON.stringify({ received: true, message: 'No matching couple found' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        console.log(`Found couple: ${couple.couple_name} (${couple.path})`)

        // Delete the couple - this will cascade to delete checkpoints and memories
        const { error: deleteError } = await supabase
            .from('couples')
            .delete()
            .eq('id', couple.id)

        if (deleteError) {
            console.error('Error deleting couple:', deleteError)
            throw new Error(`Failed to delete couple: ${deleteError.message}`)
        }

        // If the couple had a user, delete the auth user as well
        if (couple.user_id) {
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
                couple.user_id
            )

            if (authDeleteError) {
                console.error('Error deleting auth user:', authDeleteError)
                // Don't throw here - the couple data is already deleted
            } else {
                console.log(`Deleted auth user: ${couple.user_id}`)
            }
        }

        console.log(`Successfully deleted couple and user data for subscription ${subscriptionId}`)

        return new Response(
            JSON.stringify({
                success: true,
                message: `Deleted couple ${couple.path} and associated data`,
                deletedCoupleId: couple.id,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    } catch (error) {
        console.error('Error handling subscription cancellation:', error)

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
