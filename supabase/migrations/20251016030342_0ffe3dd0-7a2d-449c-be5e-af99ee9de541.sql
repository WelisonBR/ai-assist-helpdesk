-- Recriar políticas RLS para chamados com configuração correta

-- Primeiro, remover as políticas existentes
DROP POLICY IF EXISTS "Funcionários podem ver todos os chamados" ON public.chamados;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios chamados" ON public.chamados;
DROP POLICY IF EXISTS "Funcionários podem atualizar qualquer chamado" ON public.chamados;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios chamados" ON public.chamados;

-- Recriar políticas PERMISSIVE (padrão) para SELECT
-- Funcionários podem ver TODOS os chamados
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

-- Usuários podem ver seus próprios chamados
CREATE POLICY "Usuários podem ver seus próprios chamados" 
ON public.chamados 
FOR SELECT 
TO authenticated
USING (auth.uid() = usuario_id);

-- Políticas de UPDATE
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

CREATE POLICY "Usuários podem atualizar seus próprios chamados" 
ON public.chamados 
FOR UPDATE 
TO authenticated
USING (auth.uid() = usuario_id);

-- Verificar política de INSERT (já existe, mas vamos garantir)
DROP POLICY IF EXISTS "Usuários podem criar chamados" ON public.chamados;
CREATE POLICY "Usuários podem criar chamados" 
ON public.chamados 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = usuario_id);