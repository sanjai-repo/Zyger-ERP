import os

BASE = "src/main/java/in/zygertechnology/zygererp/entity"
MIG  = "src/main/resources/db/migration"
os.makedirs(BASE, exist_ok=True)

# key: (table, header[(name,type)], line_table, line_extra[(name,type)], qty, has_lines)
T = {
 "po-inward":("po_inward",[("supplier","String"),("purchaseOrderNo","String"),("supplierChallanNo","String"),("vehicleNo","String"),("receivedBy","String")],"po_inward_line",[("receivedQty","double"),("rate","Double"),("acceptedQty","Double"),("rejectedQty","Double")],"receivedQty",True),
 "lo-inward":("lo_inward",[("vendor","String"),("labourOrderNo","String"),("jobOrderNo","String"),("process","String")],"lo_inward_line",[("receivedQty","double"),("rate","Double"),("acceptedQty","Double"),("rejectedQty","Double")],"receivedQty",True),
 "jo-inward":("jo_inward",[("jobOrderNo","String"),("workCenter","String"),("operationNo","String")],"jo_inward_line",[("producedQty","double"),("rate","Double"),("acceptedQty","Double"),("rejectedQty","Double")],"producedQty",True),
 "general-inward":("general_inward",[("sourceType","String"),("party","String"),("reasonCode","String"),("returnable","String")],"general_inward_line",[("receivedQty","double"),("rate","Double"),("acceptedQty","Double"),("rejectedQty","Double")],"receivedQty",True),
 "return-inward":("return_inward",[("party","String"),("originalDocumentNo","String"),("reasonCode","String"),("inspectionRequired","String")],"return_inward_line",[("returnedQty","double"),("acceptedQty","Double"),("rejectedQty","Double")],"returnedQty",True),
 "grn":("grn",[("sourceType","String"),("sourceDocumentNo","String"),("party","String"),("inspectionRef","String")],"grn_line",[("acceptedQty","double"),("rate","Double"),("rejectedQty","Double")],"acceptedQty",True),
 "stock-issue-request":("stock_issue_request",[("department","String"),("requestedBy","String"),("requiredDate","java.time.LocalDate"),("jobOrderNo","String"),("purpose","String")],"stock_issue_request_line",[("requestedQty","double"),("approvedQty","Double"),("returnable","String")],"requestedQty",True),
 "rm-issue":("rm_issue",[("jobOrderNo","String"),("issueRequestNo","String"),("sourceLocation","String")],"rm_issue_line",[("issueQty","double"),("returnable","String")],"issueQty",True),
 "general-issue":("general_issue",[("department","String"),("purpose","String"),("sourceLocation","String")],"general_issue_line",[("issueQty","double"),("returnable","String")],"issueQty",True),
 "jo-dc-issue":("jo_dc_issue",[("vendor","String"),("jobOrderNo","String"),("sourceLocation","String")],"jo_dc_issue_line",[("issueQty","double"),("returnable","String")],"issueQty",True),
 "issue-internal-external":("issue_internal_external",[("issueType","String"),("toDepartment","String"),("issuedTo","String"),("sourceLocation","String")],"issue_internal_external_line",[("issueQty","double"),("returnable","String")],"issueQty",True),
 "issue-against-receipt":("issue_against_receipt",[("originalReceiptNo","String"),("sourceLocation","String")],"issue_against_receipt_line",[("issueQty","double"),("returnable","String")],"issueQty",True),
 "sales-dc":("sales_dc",[("party","String"),("sourceLocation","String"),("vehicleNo","String"),("transporter","String"),("linkedDocumentNo","String")],"sales_dc_line",[("qty","double")],"qty",True),
 "jo-dc":("jo_dc",[("party","String"),("sourceLocation","String"),("vehicleNo","String"),("transporter","String"),("linkedDocumentNo","String")],"jo_dc_line",[("qty","double")],"qty",True),
 "general-dc":("general_dc",[("party","String"),("sourceLocation","String"),("vehicleNo","String"),("transporter","String"),("linkedDocumentNo","String")],"general_dc_line",[("qty","double")],"qty",True),
 "return-dc":("return_dc",[("party","String"),("sourceLocation","String"),("vehicleNo","String"),("transporter","String"),("linkedDocumentNo","String")],"return_dc_line",[("qty","double")],"qty",True),
 "transfer-dc":("transfer_dc",[("party","String"),("sourceLocation","String"),("vehicleNo","String"),("transporter","String"),("linkedDocumentNo","String")],"transfer_dc_line",[("qty","double")],"qty",True),
 "purchase-invoice":("purchase_invoice",[("supplier","String"),("purchaseOrderNo","String"),("grnNo","String"),("supplierInvoiceNo","String"),("taxAmount","Double"),("totalAmount","Double"),("dueDate","java.time.LocalDate")],None,[],None,False),
 "subcontract-invoice":("subcontract_invoice",[("vendor","String"),("labourOrderNo","String"),("process","String"),("totalAmount","Double")],"subcontract_invoice_line",[("processedQty","double"),("rate","Double")],"processedQty",True),
 "inward-return":("inward_return",[("party","String"),("originalDocumentNo","String"),("reasonCode","String"),("inspectionRequired","String")],"inward_return_line",[("returnedQty","double"),("acceptedQty","Double"),("rejectedQty","Double")],"returnedQty",True),
 "dc-return":("dc_return",[("party","String"),("originalDocumentNo","String"),("reasonCode","String"),("inspectionRequired","String")],"dc_return_line",[("returnedQty","double"),("acceptedQty","Double"),("rejectedQty","Double")],"returnedQty",True),
 "invoice-return":("invoice_return",[("party","String"),("originalDocumentNo","String"),("reasonCode","String"),("inspectionRequired","String")],"invoice_return_line",[("returnedQty","double"),("acceptedQty","Double"),("rejectedQty","Double")],"returnedQty",True),
 "internal-return":("internal_return",[("party","String"),("originalDocumentNo","String"),("reasonCode","String"),("inspectionRequired","String")],"internal_return_line",[("returnedQty","double"),("acceptedQty","Double"),("rejectedQty","Double")],"returnedQty",True),
 "received-against-issue":("received_against_issue",[("party","String"),("originalDocumentNo","String"),("reasonCode","String"),("inspectionRequired","String")],"received_against_issue_line",[("returnedQty","double"),("acceptedQty","Double"),("rejectedQty","Double")],"returnedQty",True),
 "receipt-return":("receipt_return",[("party","String"),("originalDocumentNo","String"),("reasonCode","String"),("inspectionRequired","String")],"receipt_return_line",[("returnedQty","double"),("acceptedQty","Double"),("rejectedQty","Double")],"returnedQty",True),
 "stock-allotment":("stock_allotment",[("allotmentType","String"),("referenceNo","String"),("customer","String")],"stock_allotment_line",[("allottedQty","double")],"allottedQty",True),
 "stock-release":("stock_release",[("allotmentNo","String"),("reason","String")],"stock_release_line",[("releasedQty","double")],"releasedQty",True),
 "stock-amendment":("stock_amendment",[("itemCode","String"),("location","String"),("batchNo","String"),("systemQty","Double"),("correctedQty","Double"),("differenceQty","Double"),("reasonCode","String")],None,[],None,False),
 "physical-stock-amendment":("physical_stock_amendment",[("storeLocation","String"),("countTeam","String"),("countType","String")],"physical_stock_amendment_line",[("systemQty","Double"),("physicalQty","double"),("varianceQty","Double"),("varianceValue","Double"),("reasonCode","String")],"physicalQty",True),
}

def pascal(k): return "".join(p.capitalize() for p in k.split("-"))

def sql_type(t):
    if t == "String": return "varchar(255)"
    if t == "java.time.LocalDate": return "date"
    if t == "double": return "double precision"
    if t == "Double": return "double precision"
    return "varchar(255)"

def header_ddl(hdr):
    cols = [f"  {h} {sql_type(t)}" for h, t in hdr]
    return ",\n".join(cols)

def line_ddl(lextra):
    if not lextra: return ""
    cols = [f"  {h} {sql_type(t)}" for h, t in lextra]
    return ",\n" + ",\n".join(cols)

sql_lines = [
    "drop table if exists erp_documents;",
    "drop table if exists erp_document;",
    "drop table if exists erp_document_line;",
    "drop table if exists erp_generic_doc;",
    "drop table if exists inventory_ledger;",
    "drop table if exists app_user;",
    "",
    "-- Document header + line tables: one pair per module so every input is stored in its own table.",
]
for key, (table, hdr, ltab, lextra, qty, has) in T.items():
    P = pascal(key)
    hdr_fields = "\n".join(f"    {t} {n};" for n, t in hdr)
    lines_field = ""
    getlines = ""
    if has:
        lines_field = f"""
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<{P}Line> lines = new java.util.ArrayList<>();"""
    else:
        getlines = """
    public java.util.List<? extends LineEntity> getLines(){ return java.util.List.of(); }"""
    with open(f"{BASE}/{P}.java", "w") as f:
        f.write(f"""package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="{table}") @Getter @Setter @DocKey("{key}")
public class {P} extends BaseDoc implements DocEntity {{
{hdr_fields}{lines_field}{getlines}
}}
""")
    if has:
        extra = "\n".join(f"    {t} {n};" for n, t in lextra)
        with open(f"{BASE}/{P}Line.java", "w") as f:
            f.write(f"""package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*; import com.fasterxml.jackson.annotation.JsonIgnore;
@Entity @Table(name="{ltab}") @Getter @Setter
public class {P}Line extends BaseLine implements LineEntity {{
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_id") @JsonIgnore
    {P} doc;
{extra}
    public double getQty(){{ return {qty}; }}
}}
""")
        sql_lines.append(f"""
drop table if exists {table} cascade;
drop table if exists {ltab} cascade;
create table {table} (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
{header_ddl(hdr)}
);
create table {ltab} (
  id bigserial primary key,
  doc_id bigint not null references {table}(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),{line_ddl(lextra)}
);
create index idx_{table}_status on {table}(status);
create index idx_{ltab}_doc on {ltab}(doc_id);
create index idx_{ltab}_item on {ltab}(item_code, location);
""")
    else:
        sql_lines.append(f"""
drop table if exists {table} cascade;
create table {table} (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
{header_ddl(hdr)}
);
create index idx_{table}_status on {table}(status);
""")

with open(f"{MIG}/V2__individual_doc_tables.sql", "w") as f:
    f.write("\n".join(sql_lines) + "\n")

print("Generated", len(T), "entities and V2__individual_doc_tables.sql")
