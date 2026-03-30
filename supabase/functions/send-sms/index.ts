import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipient, message, type } = await req.json()

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get SMS settings from database
    const { data: settings } = await supabaseClient
      .from('sms_settings')
      .select('*')
      .eq('enabled', true)
      .single()

    if (!settings) {
      throw new Error('SMS not enabled or not configured')
    }

    let result = { success: false }

    // Send via Twilio
    if (settings.provider === 'twilio') {
      const accountSid = settings.username
      const authToken = settings.api_key_encrypted
      const fromNumber = settings.sender_number

      if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Twilio credentials not configured')
      }

      // Format phone number for Twilio (add + if missing)
      const toNumber = recipient.startsWith('+') ? recipient : `+${recipient}`

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: toNumber,
            Body: message
          })
        }
      )

      const twilioResult = await response.json()

      if (!response.ok) {
        throw new Error(twilioResult.message || 'Failed to send SMS')
      }

      result = { 
        success: true, 
        messageId: twilioResult.sid,
        status: twilioResult.status
      }
    } 
    // Send via Africa's Talking
    else if (settings.provider === 'africas-talking') {
      const username = settings.username
      const apiKey = settings.api_key_encrypted

      if (!username || !apiKey) {
        throw new Error('Africa\'s Talking credentials not configured')
      }

      const response = await fetch('https://api.africastalking.com/v1/messaging', {
        method: 'POST',
        headers: {
          'ApiKey': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          to: recipient,
          message: message
        })
      })

      const africaResult = await response.json()

      if (response.ok && africaResult.SMSMessageData && africaResult.SMSMessageData.Recipients) {
        result = { 
          success: true, 
          messageId: africaResult.SMSMessageData.Recipients[0]?.messageId,
          status: africaResult.SMSMessageData.Recipients[0]?.statusCode
        }
      } else {
        throw new Error(africaResult.SMSMessageData?.Message || 'Failed to send SMS')
      }
    } 
    else {
      throw new Error('Unsupported SMS provider')
    }

    // Log the SMS
    await supabaseClient.from('sms_logs').insert({
      recipient: recipient,
      message: message,
      status: result.success ? 'sent' : 'failed',
      type: type || 'manual'
    })

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error sending SMS:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
