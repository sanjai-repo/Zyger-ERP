drop table if exists erp_documents;
drop table if exists erp_document;
drop table if exists erp_document_line;
drop table if exists erp_generic_doc;
drop table if exists inventory_ledger;
drop table if exists app_user;

-- Document header + line tables: one pair per module so every input is stored in its own table.

drop table if exists po_inward cascade;
drop table if exists po_inward_line cascade;
create table po_inward (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  supplier varchar(255),
  purchaseOrderNo varchar(255),
  supplierChallanNo varchar(255),
  vehicleNo varchar(255),
  receivedBy varchar(255)
);
create table po_inward_line (
  id bigserial primary key,
  doc_id bigint not null references po_inward(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  receivedQty double precision,
  rate double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_po_inward_status on po_inward(status);
create index idx_po_inward_line_doc on po_inward_line(doc_id);
create index idx_po_inward_line_item on po_inward_line(item_code, location);


drop table if exists lo_inward cascade;
drop table if exists lo_inward_line cascade;
create table lo_inward (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  vendor varchar(255),
  labourOrderNo varchar(255),
  jobOrderNo varchar(255),
  process varchar(255)
);
create table lo_inward_line (
  id bigserial primary key,
  doc_id bigint not null references lo_inward(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  receivedQty double precision,
  rate double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_lo_inward_status on lo_inward(status);
create index idx_lo_inward_line_doc on lo_inward_line(doc_id);
create index idx_lo_inward_line_item on lo_inward_line(item_code, location);


drop table if exists jo_inward cascade;
drop table if exists jo_inward_line cascade;
create table jo_inward (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  jobOrderNo varchar(255),
  workCenter varchar(255),
  operationNo varchar(255)
);
create table jo_inward_line (
  id bigserial primary key,
  doc_id bigint not null references jo_inward(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  producedQty double precision,
  rate double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_jo_inward_status on jo_inward(status);
create index idx_jo_inward_line_doc on jo_inward_line(doc_id);
create index idx_jo_inward_line_item on jo_inward_line(item_code, location);


drop table if exists general_inward cascade;
drop table if exists general_inward_line cascade;
create table general_inward (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  sourceType varchar(255),
  party varchar(255),
  reasonCode varchar(255),
  returnable varchar(255)
);
create table general_inward_line (
  id bigserial primary key,
  doc_id bigint not null references general_inward(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  receivedQty double precision,
  rate double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_general_inward_status on general_inward(status);
create index idx_general_inward_line_doc on general_inward_line(doc_id);
create index idx_general_inward_line_item on general_inward_line(item_code, location);


drop table if exists return_inward cascade;
drop table if exists return_inward_line cascade;
create table return_inward (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  originalDocumentNo varchar(255),
  reasonCode varchar(255),
  inspectionRequired varchar(255)
);
create table return_inward_line (
  id bigserial primary key,
  doc_id bigint not null references return_inward(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  returnedQty double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_return_inward_status on return_inward(status);
create index idx_return_inward_line_doc on return_inward_line(doc_id);
create index idx_return_inward_line_item on return_inward_line(item_code, location);


drop table if exists grn cascade;
drop table if exists grn_line cascade;
create table grn (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  sourceType varchar(255),
  sourceDocumentNo varchar(255),
  party varchar(255),
  inspectionRef varchar(255)
);
create table grn_line (
  id bigserial primary key,
  doc_id bigint not null references grn(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  acceptedQty double precision,
  rate double precision,
  rejectedQty double precision
);
create index idx_grn_status on grn(status);
create index idx_grn_line_doc on grn_line(doc_id);
create index idx_grn_line_item on grn_line(item_code, location);


drop table if exists stock_issue_request cascade;
drop table if exists stock_issue_request_line cascade;
create table stock_issue_request (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  department varchar(255),
  requestedBy varchar(255),
  requiredDate date,
  jobOrderNo varchar(255),
  purpose varchar(255)
);
create table stock_issue_request_line (
  id bigserial primary key,
  doc_id bigint not null references stock_issue_request(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  requestedQty double precision,
  approvedQty double precision,
  returnable varchar(255)
);
create index idx_stock_issue_request_status on stock_issue_request(status);
create index idx_stock_issue_request_line_doc on stock_issue_request_line(doc_id);
create index idx_stock_issue_request_line_item on stock_issue_request_line(item_code, location);


drop table if exists rm_issue cascade;
drop table if exists rm_issue_line cascade;
create table rm_issue (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  jobOrderNo varchar(255),
  issueRequestNo varchar(255),
  sourceLocation varchar(255)
);
create table rm_issue_line (
  id bigserial primary key,
  doc_id bigint not null references rm_issue(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  issueQty double precision,
  returnable varchar(255)
);
create index idx_rm_issue_status on rm_issue(status);
create index idx_rm_issue_line_doc on rm_issue_line(doc_id);
create index idx_rm_issue_line_item on rm_issue_line(item_code, location);


drop table if exists general_issue cascade;
drop table if exists general_issue_line cascade;
create table general_issue (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  department varchar(255),
  purpose varchar(255),
  sourceLocation varchar(255)
);
create table general_issue_line (
  id bigserial primary key,
  doc_id bigint not null references general_issue(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  issueQty double precision,
  returnable varchar(255)
);
create index idx_general_issue_status on general_issue(status);
create index idx_general_issue_line_doc on general_issue_line(doc_id);
create index idx_general_issue_line_item on general_issue_line(item_code, location);


drop table if exists jo_dc_issue cascade;
drop table if exists jo_dc_issue_line cascade;
create table jo_dc_issue (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  vendor varchar(255),
  jobOrderNo varchar(255),
  sourceLocation varchar(255)
);
create table jo_dc_issue_line (
  id bigserial primary key,
  doc_id bigint not null references jo_dc_issue(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  issueQty double precision,
  returnable varchar(255)
);
create index idx_jo_dc_issue_status on jo_dc_issue(status);
create index idx_jo_dc_issue_line_doc on jo_dc_issue_line(doc_id);
create index idx_jo_dc_issue_line_item on jo_dc_issue_line(item_code, location);


drop table if exists issue_internal_external cascade;
drop table if exists issue_internal_external_line cascade;
create table issue_internal_external (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  issueType varchar(255),
  toDepartment varchar(255),
  issuedTo varchar(255),
  sourceLocation varchar(255)
);
create table issue_internal_external_line (
  id bigserial primary key,
  doc_id bigint not null references issue_internal_external(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  issueQty double precision,
  returnable varchar(255)
);
create index idx_issue_internal_external_status on issue_internal_external(status);
create index idx_issue_internal_external_line_doc on issue_internal_external_line(doc_id);
create index idx_issue_internal_external_line_item on issue_internal_external_line(item_code, location);


drop table if exists issue_against_receipt cascade;
drop table if exists issue_against_receipt_line cascade;
create table issue_against_receipt (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  originalReceiptNo varchar(255),
  sourceLocation varchar(255)
);
create table issue_against_receipt_line (
  id bigserial primary key,
  doc_id bigint not null references issue_against_receipt(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  issueQty double precision,
  returnable varchar(255)
);
create index idx_issue_against_receipt_status on issue_against_receipt(status);
create index idx_issue_against_receipt_line_doc on issue_against_receipt_line(doc_id);
create index idx_issue_against_receipt_line_item on issue_against_receipt_line(item_code, location);


drop table if exists sales_dc cascade;
drop table if exists sales_dc_line cascade;
create table sales_dc (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  sourceLocation varchar(255),
  vehicleNo varchar(255),
  transporter varchar(255),
  linkedDocumentNo varchar(255)
);
create table sales_dc_line (
  id bigserial primary key,
  doc_id bigint not null references sales_dc(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  qty double precision
);
create index idx_sales_dc_status on sales_dc(status);
create index idx_sales_dc_line_doc on sales_dc_line(doc_id);
create index idx_sales_dc_line_item on sales_dc_line(item_code, location);


drop table if exists jo_dc cascade;
drop table if exists jo_dc_line cascade;
create table jo_dc (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  sourceLocation varchar(255),
  vehicleNo varchar(255),
  transporter varchar(255),
  linkedDocumentNo varchar(255)
);
create table jo_dc_line (
  id bigserial primary key,
  doc_id bigint not null references jo_dc(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  qty double precision
);
create index idx_jo_dc_status on jo_dc(status);
create index idx_jo_dc_line_doc on jo_dc_line(doc_id);
create index idx_jo_dc_line_item on jo_dc_line(item_code, location);


drop table if exists general_dc cascade;
drop table if exists general_dc_line cascade;
create table general_dc (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  sourceLocation varchar(255),
  vehicleNo varchar(255),
  transporter varchar(255),
  linkedDocumentNo varchar(255)
);
create table general_dc_line (
  id bigserial primary key,
  doc_id bigint not null references general_dc(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  qty double precision
);
create index idx_general_dc_status on general_dc(status);
create index idx_general_dc_line_doc on general_dc_line(doc_id);
create index idx_general_dc_line_item on general_dc_line(item_code, location);


drop table if exists return_dc cascade;
drop table if exists return_dc_line cascade;
create table return_dc (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  sourceLocation varchar(255),
  vehicleNo varchar(255),
  transporter varchar(255),
  linkedDocumentNo varchar(255)
);
create table return_dc_line (
  id bigserial primary key,
  doc_id bigint not null references return_dc(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  qty double precision
);
create index idx_return_dc_status on return_dc(status);
create index idx_return_dc_line_doc on return_dc_line(doc_id);
create index idx_return_dc_line_item on return_dc_line(item_code, location);


drop table if exists transfer_dc cascade;
drop table if exists transfer_dc_line cascade;
create table transfer_dc (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  sourceLocation varchar(255),
  vehicleNo varchar(255),
  transporter varchar(255),
  linkedDocumentNo varchar(255)
);
create table transfer_dc_line (
  id bigserial primary key,
  doc_id bigint not null references transfer_dc(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  qty double precision
);
create index idx_transfer_dc_status on transfer_dc(status);
create index idx_transfer_dc_line_doc on transfer_dc_line(doc_id);
create index idx_transfer_dc_line_item on transfer_dc_line(item_code, location);


drop table if exists purchase_invoice cascade;
create table purchase_invoice (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  supplier varchar(255),
  purchaseOrderNo varchar(255),
  grnNo varchar(255),
  supplierInvoiceNo varchar(255),
  taxAmount double precision,
  totalAmount double precision,
  dueDate date
);
create index idx_purchase_invoice_status on purchase_invoice(status);


drop table if exists subcontract_invoice cascade;
drop table if exists subcontract_invoice_line cascade;
create table subcontract_invoice (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  vendor varchar(255),
  labourOrderNo varchar(255),
  process varchar(255),
  totalAmount double precision
);
create table subcontract_invoice_line (
  id bigserial primary key,
  doc_id bigint not null references subcontract_invoice(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  processedQty double precision,
  rate double precision
);
create index idx_subcontract_invoice_status on subcontract_invoice(status);
create index idx_subcontract_invoice_line_doc on subcontract_invoice_line(doc_id);
create index idx_subcontract_invoice_line_item on subcontract_invoice_line(item_code, location);


drop table if exists inward_return cascade;
drop table if exists inward_return_line cascade;
create table inward_return (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  originalDocumentNo varchar(255),
  reasonCode varchar(255),
  inspectionRequired varchar(255)
);
create table inward_return_line (
  id bigserial primary key,
  doc_id bigint not null references inward_return(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  returnedQty double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_inward_return_status on inward_return(status);
create index idx_inward_return_line_doc on inward_return_line(doc_id);
create index idx_inward_return_line_item on inward_return_line(item_code, location);


drop table if exists dc_return cascade;
drop table if exists dc_return_line cascade;
create table dc_return (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  originalDocumentNo varchar(255),
  reasonCode varchar(255),
  inspectionRequired varchar(255)
);
create table dc_return_line (
  id bigserial primary key,
  doc_id bigint not null references dc_return(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  returnedQty double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_dc_return_status on dc_return(status);
create index idx_dc_return_line_doc on dc_return_line(doc_id);
create index idx_dc_return_line_item on dc_return_line(item_code, location);


drop table if exists invoice_return cascade;
drop table if exists invoice_return_line cascade;
create table invoice_return (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  originalDocumentNo varchar(255),
  reasonCode varchar(255),
  inspectionRequired varchar(255)
);
create table invoice_return_line (
  id bigserial primary key,
  doc_id bigint not null references invoice_return(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  returnedQty double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_invoice_return_status on invoice_return(status);
create index idx_invoice_return_line_doc on invoice_return_line(doc_id);
create index idx_invoice_return_line_item on invoice_return_line(item_code, location);


drop table if exists internal_return cascade;
drop table if exists internal_return_line cascade;
create table internal_return (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  originalDocumentNo varchar(255),
  reasonCode varchar(255),
  inspectionRequired varchar(255)
);
create table internal_return_line (
  id bigserial primary key,
  doc_id bigint not null references internal_return(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  returnedQty double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_internal_return_status on internal_return(status);
create index idx_internal_return_line_doc on internal_return_line(doc_id);
create index idx_internal_return_line_item on internal_return_line(item_code, location);


drop table if exists received_against_issue cascade;
drop table if exists received_against_issue_line cascade;
create table received_against_issue (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  originalDocumentNo varchar(255),
  reasonCode varchar(255),
  inspectionRequired varchar(255)
);
create table received_against_issue_line (
  id bigserial primary key,
  doc_id bigint not null references received_against_issue(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  returnedQty double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_received_against_issue_status on received_against_issue(status);
create index idx_received_against_issue_line_doc on received_against_issue_line(doc_id);
create index idx_received_against_issue_line_item on received_against_issue_line(item_code, location);


drop table if exists receipt_return cascade;
drop table if exists receipt_return_line cascade;
create table receipt_return (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  party varchar(255),
  originalDocumentNo varchar(255),
  reasonCode varchar(255),
  inspectionRequired varchar(255)
);
create table receipt_return_line (
  id bigserial primary key,
  doc_id bigint not null references receipt_return(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  returnedQty double precision,
  acceptedQty double precision,
  rejectedQty double precision
);
create index idx_receipt_return_status on receipt_return(status);
create index idx_receipt_return_line_doc on receipt_return_line(doc_id);
create index idx_receipt_return_line_item on receipt_return_line(item_code, location);


drop table if exists stock_allotment cascade;
drop table if exists stock_allotment_line cascade;
create table stock_allotment (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  allotmentType varchar(255),
  referenceNo varchar(255),
  customer varchar(255)
);
create table stock_allotment_line (
  id bigserial primary key,
  doc_id bigint not null references stock_allotment(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  allottedQty double precision
);
create index idx_stock_allotment_status on stock_allotment(status);
create index idx_stock_allotment_line_doc on stock_allotment_line(doc_id);
create index idx_stock_allotment_line_item on stock_allotment_line(item_code, location);


drop table if exists stock_release cascade;
drop table if exists stock_release_line cascade;
create table stock_release (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  allotmentNo varchar(255),
  reason varchar(255)
);
create table stock_release_line (
  id bigserial primary key,
  doc_id bigint not null references stock_release(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  releasedQty double precision
);
create index idx_stock_release_status on stock_release(status);
create index idx_stock_release_line_doc on stock_release_line(doc_id);
create index idx_stock_release_line_item on stock_release_line(item_code, location);


drop table if exists stock_amendment cascade;
create table stock_amendment (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  itemCode varchar(255),
  location varchar(255),
  batchNo varchar(255),
  systemQty double precision,
  correctedQty double precision,
  differenceQty double precision,
  reasonCode varchar(255)
);
create index idx_stock_amendment_status on stock_amendment(status);


drop table if exists physical_stock_amendment cascade;
drop table if exists physical_stock_amendment_line cascade;
create table physical_stock_amendment (
  id bigserial primary key,
  doc_no varchar(60) unique not null,
  status varchar(20) not null,
  doc_date date,
  remarks varchar(500),
  created_by varchar(80),
  created_at timestamp,
  updated_at timestamp,
  storeLocation varchar(255),
  countTeam varchar(255),
  countType varchar(255)
);
create table physical_stock_amendment_line (
  id bigserial primary key,
  doc_id bigint not null references physical_stock_amendment(id) on delete cascade,
  item_code varchar(60) not null,
  batch_no varchar(60),
  heat_no varchar(60),
  location varchar(60),
  remarks varchar(300),,
  systemQty double precision,
  physicalQty double precision,
  varianceQty double precision,
  varianceValue double precision,
  reasonCode varchar(255)
);
create index idx_physical_stock_amendment_status on physical_stock_amendment(status);
create index idx_physical_stock_amendment_line_doc on physical_stock_amendment_line(doc_id);
create index idx_physical_stock_amendment_line_item on physical_stock_amendment_line(item_code, location);

