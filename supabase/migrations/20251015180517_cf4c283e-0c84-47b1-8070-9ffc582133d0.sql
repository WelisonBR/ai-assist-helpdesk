-- Adicionar coluna papel aos profiles para diferenciar aluno de funcionário
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS papel text DEFAULT 'aluno' CHECK (papel IN ('aluno', 'funcionario'));

-- Atualizar políticas RLS para funcionários verem todos os chamados
CREATE POLICY "Funcionários podem ver todos os chamados"
ON public.chamados
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.papel = 'funcionario'
  )
);

-- Permitir funcionários criarem respostas em qualquer chamado
CREATE POLICY "Funcionários podem responder qualquer chamado"
ON public.respostas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.papel = 'funcionario'
  )
);

-- Permitir funcionários atualizarem status de chamados
CREATE POLICY "Funcionários podem atualizar qualquer chamado"
ON public.chamados
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.papel = 'funcionario'
  )
);