-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL,
  setor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, setor)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', 'Usuário'),
    COALESCE(new.raw_user_meta_data->>'setor', 'TI')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de categorias
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver categorias"
  ON public.categorias FOR SELECT
  USING (true);

-- Inserir categorias padrão
INSERT INTO public.categorias (nome, descricao) VALUES
  ('Hardware', 'Problemas com equipamentos físicos'),
  ('Software', 'Problemas com programas e aplicativos'),
  ('Rede', 'Problemas de conectividade'),
  ('Email', 'Problemas com e-mail'),
  ('Acesso', 'Problemas de login e permissões'),
  ('Outros', 'Outras solicitações');

-- Tabela de chamados
CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_chamado SERIAL UNIQUE,
  usuario_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome_aluno TEXT NOT NULL,
  ra TEXT NOT NULL,
  email TEXT NOT NULL,
  curso TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Em andamento', 'Aguardando resposta', 'Resolvido', 'Fechado')),
  prioridade TEXT NOT NULL DEFAULT 'Média' CHECK (prioridade IN ('Baixa', 'Média', 'Alta', 'Urgente')),
  setor_responsavel TEXT,
  resposta_ia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios chamados"
  ON public.chamados FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar chamados"
  ON public.chamados FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios chamados"
  ON public.chamados FOR UPDATE
  USING (auth.uid() = usuario_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chamados_updated_at
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de respostas/histórico
CREATE TABLE public.respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  is_ia BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver respostas de seus chamados"
  ON public.respostas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chamados
      WHERE chamados.id = respostas.chamado_id
      AND chamados.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar respostas"
  ON public.respostas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Tabela de FAQ (base de conhecimento)
CREATE TABLE public.faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias ON DELETE SET NULL,
  visualizacoes INTEGER DEFAULT 0,
  util INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver FAQ"
  ON public.faq FOR SELECT
  USING (true);

-- Inserir alguns FAQs exemplo
INSERT INTO public.faq (pergunta, resposta, categoria_id) VALUES
  ('Como resetar minha senha?', 'Para resetar sua senha, clique em "Esqueceu a senha?" na tela de login e siga as instruções enviadas por email.', (SELECT id FROM categorias WHERE nome = 'Acesso')),
  ('Meu computador não liga, o que fazer?', 'Verifique se o cabo de energia está conectado corretamente. Se o problema persistir, abra um chamado com prioridade alta.', (SELECT id FROM categorias WHERE nome = 'Hardware')),
  ('Como solicitar acesso a um sistema?', 'Abra um chamado na categoria "Acesso" descrevendo qual sistema você precisa acessar e justificativa.', (SELECT id FROM categorias WHERE nome = 'Acesso'));

-- Habilitar realtime para chamados
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.respostas;