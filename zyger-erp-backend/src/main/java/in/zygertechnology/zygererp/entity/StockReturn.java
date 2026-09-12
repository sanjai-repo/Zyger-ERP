package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
/*
 * Return Management Module FRS v1.0 §2 — Stock Return.
 *
 * Renamed from Internal Return (FRS: "Internal Return" is now "Stock Return").
 * The physical table keeps its historical name `internal_return` on purpose:
 * the FRS itself only renames the document, not its storage, so existing rows
 * (and their FK constraints) remain valid without a disruptive table rename.
 * Only the @DocKey (drives DocTypes, numbering_config, screen registry and
 * workflow) carries the new canonical key.
 */
@Entity @Table(name="internal_return") @Getter @Setter @DocKey("stock-return")
public class StockReturn extends BaseDoc implements DocEntity {
    String party;
    String condition;
    String originalDocumentNo;
    String originalIssueType;
    String jobOrderNo;
    String reasonCode;
    String inspectionRequired;
    String reduceConsumption;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<StockReturnLine> lines = new java.util.ArrayList<>();
}