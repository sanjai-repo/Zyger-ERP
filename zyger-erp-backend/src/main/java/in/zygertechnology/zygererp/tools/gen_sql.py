from gen_entities import T
def cols(hdr): return ", ".join(f"{n} {sql(t)}" for n,t in hdr)
def sql(t): return {"String":"varchar(80)","Double":"double precision","double":"double precision","java.time.LocalDate":"date"}[t]
H="id bigserial primary key, doc_no varchar(60) unique not null, status varchar(20) not null, doc_date date, remarks varchar(500), created_by varchar(80), created_at timestamp, updated_at timestamp"
LB="id bigserial primary key, doc_id bigint not null, item_code varchar(60) not null, batch_no varchar(60), heat_no varchar(60), location varchar(60), remarks varchar(300)"
out=["drop table if exists erp_documents;"]
for k,(t,h,lt,le,q,has) in T.items():
    out.append(f"create table {t} ({H}, {cols(h)});")
    if has:
        out.append(f"create table {lt} ({LB}, {cols(le)}, foreign key (doc_id) references {t}(id) on delete cascade);")
        out.append(f"create index idx_{lt}_doc on {lt}(doc_id);")
    out.append(f"create index idx_{t}_st on {t}(status);")
open("src/main/resources/db/migration/V2__individual_doc_tables.sql","w").write("\n".join(out))
print("SQL written")