-- Central Thais - Database Schema
-- Execute no Supabase SQL Editor

-- Areas (pre-configuradas, editaveis)
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT NOT NULL DEFAULT '#552A7B',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own areas" ON areas FOR ALL USING (auth.uid() = user_id);

-- Tarefas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'waiting', 'completed', 'cancelled')),
  priority INT DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
  planned_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  resume_note TEXT,
  waiting_for TEXT,
  waiting_check_date DATE,
  is_habit BOOLEAN DEFAULT false,
  habit_frequency TEXT CHECK (habit_frequency IN ('daily', 'weekly', 'monthly')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_area ON tasks(user_id, area_id);
CREATE INDEX idx_tasks_planned ON tasks(user_id, planned_date) WHERE status != 'completed';

-- Subtarefas (checklist)
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own subtasks" ON subtasks FOR ALL
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));

-- Notas
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notes" ON notes FOR ALL USING (auth.uid() = user_id);

-- Eventos (agenda)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own events" ON events FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_events_user_date ON events(user_id, start_at);

-- Financeiro
CREATE TABLE finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  paid BOOLEAN DEFAULT false,
  paid_at DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INT CHECK (recurring_day BETWEEN 1 AND 31),
  is_installment BOOLEAN DEFAULT false,
  installment_current INT,
  installment_total INT,
  installment_group_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own finances" ON finances FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_finances_user_due ON finances(user_id, due_date);
CREATE INDEX idx_finances_user_type ON finances(user_id, type);

-- Funcao para criar areas padrao no primeiro login
CREATE OR REPLACE FUNCTION create_default_areas()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO areas (user_id, name, slug, icon, color, sort_order) VALUES
    (NEW.id, 'Pessoal', 'pessoal', 'heart', '#A56CFF', 1),
    (NEW.id, 'Financeiro', 'financeiro', 'wallet', '#059669', 2),
    (NEW.id, 'Trabalho CLT', 'trabalho', 'briefcase', '#552A7B', 3),
    (NEW.id, 'Projetos', 'projetos', 'rocket', '#FF675C', 4),
    (NEW.id, 'Estudos', 'estudos', 'book-open', '#3B82F6', 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_areas();

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER finances_updated_at BEFORE UPDATE ON finances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
