-- Adicionar política para funcionários verem todas as respostas
CREATE POLICY "Funcionários podem ver todas as respostas"
ON public.respostas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.papel = 'funcionario'
  )
);