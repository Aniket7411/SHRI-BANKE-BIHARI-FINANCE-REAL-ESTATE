-- ---------------------------------------------------------------------------
-- Richer listings: Residential / Commercial / Semi-commercial categories,
-- finer property types (Flat, Shop, Warehouse…) and optional India-specific
-- attributes (facing, road width, ownership, approval, rooms…) in `details`.
-- Field list lives in lib/property-meta.ts; areas inside `details` are sq.ft.
-- ---------------------------------------------------------------------------

alter table properties alter column type type text using type::text;
drop type if exists property_type;

alter table properties
  add column category text not null default 'Residential'
    check (category in ('Residential', 'Commercial', 'Semi-commercial')),
  add column details jsonb not null default '{}'::jsonb;

-- Map the five old broad types onto the new vocabulary.
update properties set
  category = case when type = 'Commercial' then 'Commercial' else 'Residential' end,
  type = case type
    when 'Apartment' then 'Flat'
    when 'House' then 'Independent House'
    when 'Plot' then 'Residential Plot'
    when 'Commercial' then 'Office Space'
    else type
  end;

create index properties_category_idx on properties (category, type);
