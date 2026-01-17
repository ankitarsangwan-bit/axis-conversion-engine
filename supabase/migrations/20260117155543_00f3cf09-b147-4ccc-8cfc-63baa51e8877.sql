-- Create MIS uploads table
CREATE TABLE public.mis_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id TEXT NOT NULL UNIQUE,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  upload_time TEXT NOT NULL DEFAULT to_char(now(), 'HH24:MI'),
  record_count INTEGER NOT NULL DEFAULT 0,
  new_records INTEGER NOT NULL DEFAULT 0,
  updated_records INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT NOT NULL DEFAULT 'System',
  status TEXT NOT NULL DEFAULT 'Current',
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create MIS records table (the actual data from uploads)
CREATE TABLE public.mis_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES public.mis_uploads(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL,
  month TEXT NOT NULL,
  state TEXT,
  product TEXT,
  applications INTEGER DEFAULT 0,
  dedupe_pass INTEGER DEFAULT 0,
  bureau_pass INTEGER DEFAULT 0,
  vkyc_pass INTEGER DEFAULT 0,
  disbursed INTEGER DEFAULT 0,
  disbursement_amount NUMERIC DEFAULT 0,
  rejection_reason TEXT,
  last_updated_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(application_id)
);

-- Create quality metrics table
CREATE TABLE public.quality_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_type TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  valid_records INTEGER DEFAULT 0,
  invalid_records INTEGER DEFAULT 0,
  validation_rate NUMERIC DEFAULT 0,
  common_issues JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data freshness table
CREATE TABLE public.data_freshness (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'MIS',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  record_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Fresh',
  latency_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conflicts table
CREATE TABLE public.data_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  upload_id UUID REFERENCES public.mis_uploads(id) ON DELETE CASCADE,
  resolution TEXT DEFAULT 'pending',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create VKYC funnel metrics table
CREATE TABLE public.vkyc_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  state TEXT,
  vkyc_attempted INTEGER DEFAULT 0,
  vkyc_initiated INTEGER DEFAULT 0,
  face_match_done INTEGER DEFAULT 0,
  vkyc_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for now, can add auth later)
ALTER TABLE public.mis_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mis_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_freshness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vkyc_metrics ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for now - no auth required)
CREATE POLICY "Allow public read on mis_uploads" ON public.mis_uploads FOR SELECT USING (true);
CREATE POLICY "Allow public insert on mis_uploads" ON public.mis_uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on mis_uploads" ON public.mis_uploads FOR UPDATE USING (true);

CREATE POLICY "Allow public read on mis_records" ON public.mis_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert on mis_records" ON public.mis_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on mis_records" ON public.mis_records FOR UPDATE USING (true);

CREATE POLICY "Allow public read on quality_metrics" ON public.quality_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public insert on quality_metrics" ON public.quality_metrics FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on data_freshness" ON public.data_freshness FOR SELECT USING (true);
CREATE POLICY "Allow public insert on data_freshness" ON public.data_freshness FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on data_freshness" ON public.data_freshness FOR UPDATE USING (true);

CREATE POLICY "Allow public read on data_conflicts" ON public.data_conflicts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on data_conflicts" ON public.data_conflicts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on data_conflicts" ON public.data_conflicts FOR UPDATE USING (true);

CREATE POLICY "Allow public read on vkyc_metrics" ON public.vkyc_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public insert on vkyc_metrics" ON public.vkyc_metrics FOR INSERT WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_mis_records_application_id ON public.mis_records(application_id);
CREATE INDEX idx_mis_records_month ON public.mis_records(month);
CREATE INDEX idx_mis_uploads_upload_date ON public.mis_uploads(upload_date);
CREATE INDEX idx_data_conflicts_application_id ON public.data_conflicts(application_id);
CREATE INDEX idx_vkyc_metrics_month ON public.vkyc_metrics(month);