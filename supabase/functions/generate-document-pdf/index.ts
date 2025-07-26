import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DocumentData {
  userName?: string;
  userAddress?: string;
  landlordName?: string;
  landlordAddress?: string;
  rentalAddress?: string;
  depositAmount?: string;
  moveOutDate?: string;
}

interface PDFGenerationRequest {
  documentType: string;
  documentData: DocumentData;
  language: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 PDF Generation request received');

    // Parse request body
    const { documentType, documentData, language }: PDFGenerationRequest = await req.json();

    console.log('📄 Document generation details:', {
      documentType,
      language,
      dataKeys: Object.keys(documentData)
    });

    // Validate required data
    if (!documentType || !documentData || !language) {
      throw new Error('Missing required parameters: documentType, documentData, or language');
    }

    // Get N8N webhook URL for PDF generation
    const n8nPdfWebhookUrl = Deno.env.get('N8N_PDF_WEBHOOK_URL');
    
    if (!n8nPdfWebhookUrl) {
      console.error('❌ N8N_PDF_WEBHOOK_URL not configured');
      throw new Error('PDF generation service not configured');
    }

    // Validate webhook URL format
    try {
      new URL(n8nPdfWebhookUrl);
    } catch {
      console.error('❌ Invalid N8N_PDF_WEBHOOK_URL format:', n8nPdfWebhookUrl);
      throw new Error('Invalid PDF generation service configuration');
    }

    console.log('🔄 Calling N8N PDF generation webhook...');

    // Call N8N webhook for PDF generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for PDF generation

    const response = await fetch(n8nPdfWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
      body: JSON.stringify({
        documentType,
        documentData,
        language,
        timestamp: new Date().toISOString()
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('📡 N8N PDF webhook response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('❌ N8N PDF webhook failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`PDF generation failed: ${response.status} ${response.statusText}`);
    }

    // Validate content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ N8N PDF webhook returned non-JSON response');
      throw new Error('Invalid response from PDF generation service');
    }

    const result = await response.json();
    
    // Enhanced response validation
    if (!result || typeof result !== 'object') {
      console.error('❌ Invalid response format from N8N PDF webhook');
      throw new Error('Invalid response format from PDF generation service');
    }

    if (!result.pdfUrl || typeof result.pdfUrl !== 'string') {
      console.error('❌ Missing or invalid pdfUrl in N8N PDF webhook response');
      throw new Error('PDF generation failed - no download URL received');
    }

    console.log('✅ PDF generated successfully:', {
      pdfUrl: result.pdfUrl.substring(0, 50) + '...',
      fileSize: result.fileSize || 'unknown'
    });

    return new Response(JSON.stringify({
      success: true,
      pdfUrl: result.pdfUrl,
      fileSize: result.fileSize,
      documentType,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 PDF Generation error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    let errorMessage = 'Failed to generate PDF document';
    let statusCode = 500;

    if (error.name === 'AbortError') {
      errorMessage = 'PDF generation timeout - please try again';
      statusCode = 408;
    } else if (error.message.includes('not configured')) {
      errorMessage = 'PDF generation service not available';
      statusCode = 503;
    } else if (error.message.includes('Missing required parameters')) {
      errorMessage = error.message;
      statusCode = 400;
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});