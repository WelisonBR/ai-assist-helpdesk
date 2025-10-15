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
    const { email, senha, nome, setor } = await req.json();
    console.log('Criando funcionário:', { email, nome, setor });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Criar usuário no auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        setor,
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      throw authError;
    }

    console.log('Usuário criado:', authData.user.id);

    // Atualizar o perfil para marcar como funcionário
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ papel: 'funcionario' })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError);
      throw profileError;
    }

    console.log('Funcionário criado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Funcionário criado com sucesso',
        email,
        senha 
      }),
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
