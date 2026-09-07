ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS item_desc character varying(200);
ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS description character varying(300);
ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS uom character varying(30);
ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS amount numeric(38,2);
ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS discount numeric(38,2);
ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS tax numeric(38,2);
ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS tax_amount numeric(38,2);
ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS net_amount numeric(38,2);
ALTER TABLE public.po_inward_line ADD COLUMN IF NOT EXISTS rejected_reason character varying(250);

ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS item_desc character varying(200);
ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS description character varying(300);
ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS uom character varying(30);
ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS amount numeric(38,2);
ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS discount numeric(38,2);
ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS tax numeric(38,2);
ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS tax_amount numeric(38,2);
ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS net_amount numeric(38,2);
ALTER TABLE public.general_inward_line ADD COLUMN IF NOT EXISTS rejected_reason character varying(250);

ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS item_desc character varying(200);
ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS description character varying(300);
ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS uom character varying(30);
ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS amount numeric(38,2);
ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS discount numeric(38,2);
ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS tax numeric(38,2);
ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS tax_amount numeric(38,2);
ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS net_amount numeric(38,2);
ALTER TABLE public.jo_inward_line ADD COLUMN IF NOT EXISTS rejected_reason character varying(250);

ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS item_desc character varying(200);
ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS description character varying(300);
ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS uom character varying(30);
ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS amount numeric(38,2);
ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS discount numeric(38,2);
ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS tax numeric(38,2);
ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS tax_amount numeric(38,2);
ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS net_amount numeric(38,2);
ALTER TABLE public.lo_inward_line ADD COLUMN IF NOT EXISTS rejected_reason character varying(250);

ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS item_desc character varying(200);
ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS description character varying(300);
ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS uom character varying(30);
ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS amount numeric(38,2);
ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS discount numeric(38,2);
ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS tax numeric(38,2);
ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS tax_amount numeric(38,2);
ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS net_amount numeric(38,2);
ALTER TABLE public.return_inward_line ADD COLUMN IF NOT EXISTS rejected_reason character varying(250);

ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS item_desc character varying(200);
ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS description character varying(300);
ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS uom character varying(30);
ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS amount numeric(38,2);
ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS discount numeric(38,2);
ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS tax numeric(38,2);
ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS tax_amount numeric(38,2);
ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS net_amount numeric(38,2);
ALTER TABLE public.inward_return_line ADD COLUMN IF NOT EXISTS rejected_reason character varying(250);

ALTER TABLE public.quality_inspection ADD COLUMN IF NOT EXISTS location character varying(60);
ALTER TABLE public.quality_inspection ADD COLUMN IF NOT EXISTS warehouse character varying(60);
