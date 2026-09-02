package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity @Table(name="stock_ledger", indexes = {
        @Index(name="idx_ledger_item_loc", columnList="item_code,location"),
        @Index(name="idx_ledger_doc", columnList="doc_no")})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class StockLedger {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    LocalDate txDate;
    @Column(length = 60) String docNo;
    @Column(length = 60) String docType;
    @Column(length = 60) String txType;
    @Column(length = 60) String itemCode;
    @Column(length = 60) String location;
    @Column(length = 60) String batchNo;
    @Column(length = 60) String heatNo;
    @Column(name = "stock_status", length = 30) @Builder.Default String stockStatus = "FREE";
    BigDecimal inQty;
    BigDecimal outQty;
    String createdBy;
    @Builder.Default
    Instant createdAt = Instant.now();
}
