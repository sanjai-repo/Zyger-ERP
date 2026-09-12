package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="job_order_item") @Getter @Setter
public class JobOrderItem extends BaseLine implements LineEntity {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    JobOrder doc;
    @Column(name = "item_name", length = 200) String itemName;
    String description;
    @Column(name = "order_qty") BigDecimal orderQty;
    @Column(length = 30) String uom;
    @Column(name = "batch_lot_number", length = 60) String batchLotNumber;
    @Column(name = "heat_number", length = 60) String heatNumber;
    @Column(name = "serial_number", length = 60) String serialNumber;
    @Column(name = "drawing_number", length = 60) String drawingNumber;
    @Column(name = "drawing_revision", length = 30) String drawingRevision;
    @Column(name = "material_issue_reference", length = 60) String materialIssueReference;
    @Column(name = "process_specification", length = 200) String processSpecification;
    @Column(name = "quality_requirement", length = 200) String qualityRequirement;
    @Column(name = "certificate_requirement", length = 200) String certificateRequirement;
    @Override public BigDecimal getQty() { return orderQty == null ? BigDecimal.ZERO : orderQty; }
}
