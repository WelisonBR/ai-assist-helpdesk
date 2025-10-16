-- Adicionar política RLS para permitir alunos deletarem seus próprios chamados
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios chamados" ON public.chamados;

CREATE POLICY "Usuários podem deletar seus próprios chamados" 
ON public.chamados 
FOR DELETE 
TO authenticated
USING (auth.uid() = usuario_id);

-- Adicionar índice para melhorar performance (se não existir)
CREATE INDEX IF NOT EXISTS idx_chamados_usuario_id ON public.chamados(usuario_id);