import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pergunta, categoriaId } = await req.json();
    console.log('Recebida pergunta:', pergunta);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Buscar FAQs relacionados para contexto
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: faqs } = await supabase
      .from('faq')
      .select('pergunta, resposta')
      .limit(10);

    const contextoFaq = faqs?.map(f => `P: ${f.pergunta}\nR: ${f.resposta}`).join('\n\n') || '';

    // Calcular prioridade baseado no conteúdo
    const calcularPrioridade = (texto: string): string => {
      const textoLower = texto.toLowerCase();
      
      // Palavras-chave que indicam urgência
      const urgente = ['urgente', 'emergência', 'emergencia', 'crítico', 'critico', 'parado', 'travado', 'não consigo acessar', 'nao consigo acessar'];
      const alta = ['importante', 'preciso urgente', 'problema grave', 'não funciona', 'nao funciona', 'erro crítico', 'erro critico'];
      const media = ['dúvida', 'duvida', 'ajuda', 'problema', 'erro', 'bug'];
      
      if (urgente.some(palavra => textoLower.includes(palavra))) return 'Urgente';
      if (alta.some(palavra => textoLower.includes(palavra))) return 'Alta';
      if (media.some(palavra => textoLower.includes(palavra))) return 'Média';
      
      return 'Baixa';
    };

    const systemPrompt = `Você é um assistente de suporte técnico especializado. 
Sua função é ajudar usuários com problemas técnicos de TI de forma clara e objetiva.

Base de conhecimento:
${contextoFaq}

Diretrizes:
- Responda de forma clara e profissional
- Se a pergunta estiver na base de conhecimento, use essa informação
- Se não souber, sugira abrir um chamado específico
- Seja educado e prestativo
- Mantenha respostas concisas mas completas`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: pergunta }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Erro na API de IA:", response.status, errorText);
      throw new Error("Erro ao processar resposta da IA");
    }

    const data = await response.json();
    const resposta = data.choices?.[0]?.message?.content;
    const prioridade = calcularPrioridade(pergunta);

    console.log('Resposta gerada com sucesso');

    return new Response(
      JSON.stringify({ resposta, prioridade }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro no edge function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
